import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import api from "@/config/api";

/* =======================
   Types
======================= */

type MetadataApiResponse = {
  description?: string;
  category?: string;
  tags?: string[];
  department?: string;
  documentType?: string;
  expirationDate?: string; // ISO
};

type MetadataProcessingResponse = {
  status?: "processing";
  message?: string;
};

function isMetadataProcessingResponse(data: unknown): data is MetadataProcessingResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.status === "processing";
}

function coerceMetadataApiResponse(data: unknown): MetadataApiResponse | null {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;

  const out: MetadataApiResponse = {};
  if (typeof obj.description === "string") out.description = obj.description;
  if (typeof obj.category === "string") out.category = obj.category;
  if (Array.isArray(obj.tags)) {
    const tags = obj.tags.filter((t) => typeof t === "string") as string[];
    out.tags = tags;
  }
  if (typeof obj.department === "string") out.department = obj.department;
  if (typeof obj.documentType === "string") out.documentType = obj.documentType;
  if (typeof obj.expirationDate === "string") out.expirationDate = obj.expirationDate;

  return out;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

/* =======================
   Error helpers (no any)
======================= */
type AxiosLikeError = {
  response?: {
    status?: number;
    data?: unknown;
  };
};

function getHttpStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "response" in err) {
    return (err as AxiosLikeError).response?.status;
  }
  return undefined;
}

type DuplicateResponse = {
  message?: string;
  existingDocumentId?: string;
  existingTitle?: string;
};

function extractUploadedDocumentId(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;
  const doc = obj.document;

  if (typeof doc === "object" && doc !== null) {
    const d = doc as Record<string, unknown>;
    if (typeof d.id === "string") return d.id;
  }
  if (typeof obj.id === "string") return obj.id;
  return null;
}

function extractDuplicateInfo(data: unknown): DuplicateResponse | null {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;

  const message = typeof obj.message === "string" ? obj.message : undefined;
  const existingDocumentId =
    typeof obj.existingDocumentId === "string" ? obj.existingDocumentId : undefined;
  const existingTitle =
    typeof obj.existingTitle === "string" ? obj.existingTitle : undefined;

  if (!message && !existingDocumentId && !existingTitle) return null;
  return { message, existingDocumentId, existingTitle };
}

/* =======================
   Auth role helper (no any)
======================= */
function getUserRoleLower(user: unknown): string {
  if (typeof user !== "object" || user === null) return "";
  const u = user as Record<string, unknown>;
  const role = u.role;
  return typeof role === "string" ? role.toLowerCase() : "";
}

export const AddDocument = () => {
  // ✅ أخذنا user حتى نقرر وين نعمل redirect بعد الحفظ
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const [isUploadingAndProcessing, setIsUploadingAndProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [documentId, setDocumentId] = useState<string | null>(null);

  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isOcrReady, setIsOcrReady] = useState(false);

  const pollIntervalRef = useRef<number | null>(null);
  const pollStartedAtRef = useRef<number | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    creationDate: "",
    keywords: "",
    category: "",
    description: "",
    department: "",
    documentType: "",
    expirationDate: "",
  });

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollStartedAtRef.current = null;
  };

  const pollForOcrMetadata = async (docId: string) => {
    if (!token) return;

    try {
      const res = await api.get(`/documents/${docId}/metadata`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status >= 200 && status < 500,
      });

      const startedAt = pollStartedAtRef.current ?? Date.now();
      pollStartedAtRef.current = startedAt;

      if (res.status === 202 || isMetadataProcessingResponse(res.data)) {
        setIsOcrProcessing(true);
        return;
      }

      if (res.status === 404) {
        setIsOcrProcessing(true);
        return;
      }

      if (res.status === 403) {
        stopPolling();
        setIsOcrProcessing(false);
        toast({
          title: t("خطأ", "Error"),
          description: t(
            "ليس لديك صلاحية لعرض بيانات هذه الوثيقة",
            "You don't have permission to view this document's metadata"
          ),
          variant: "destructive",
        });
        return;
      }

      if (res.status !== 200) {
        setIsOcrProcessing(true);
        return;
      }

      const meta = coerceMetadataApiResponse(res.data);
      if (!meta) {
        setIsOcrProcessing(true);
        return;
      }

      setIsOcrProcessing(false);
      setIsOcrReady(true);
      stopPolling();

      setFormData((prev) => ({
        ...prev,
        category: meta.category?.trim() ?? prev.category,
        keywords: meta.tags?.length ? meta.tags.join(", ") : prev.keywords,
        description: meta.description?.trim() ?? prev.description,
        department: meta.department?.trim() ?? prev.department,
        documentType: meta.documentType?.trim() ?? prev.documentType,
        expirationDate: meta.expirationDate ? toDateInputValue(meta.expirationDate) : prev.expirationDate,
      }));

      toast({
        title: t("اكتملت المعالجة ✅", "Processing completed ✅"),
        description: t(
          "تم استخراج نتائج OCR وتعبئة الفورم تلقائياً. يمكنك الآن التعديل ثم الحفظ.",
          "OCR results were extracted and the form was filled automatically. You can now edit and save."
        ),
      });
    } catch {
      setIsOcrProcessing(true);
    }
  };

  useEffect(() => {
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!documentId || !token) return;

    setIsOcrProcessing(true);
    setIsOcrReady(false);

    pollStartedAtRef.current = Date.now();

    pollForOcrMetadata(documentId);

    stopPolling();
    pollIntervalRef.current = window.setInterval(() => {
      pollForOcrMetadata(documentId);
    }, 2000);

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: t("خطأ", "Error"),
        description: t("حجم الملف يجب أن يكون أقل من 10 ميجابايت", "File size must be less than 10MB"),
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setDocumentId(null);
    setIsOcrProcessing(false);
    setIsOcrReady(false);
    stopPolling();

    setIsExtracting(true);
    setTimeout(() => {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setFormData((prev) => ({
        ...prev,
        title: prev.title?.trim() ? prev.title : fileName,
        creationDate: new Date().toISOString().split("T")[0],
      }));
      setIsExtracting(false);
    }, 500);
  };

  const handleUploadAndProcess = async () => {
    if (!token) {
      toast({
        title: t("غير مسجّل", "Not logged in"),
        description: t("يجب تسجيل الدخول أولاً", "You must login first"),
        variant: "destructive",
      });
      return;
    }

    if (!file) {
      toast({
        title: t("ملف غير موجود", "Missing file"),
        description: t("الرجاء رفع ملف", "Please upload a file"),
        variant: "destructive",
      });
      return;
    }

    if (documentId) {
      toast({
        title: t("بدء معالجة OCR...", "Starting OCR..."),
        description: t(
          "جاري التحقق من نتائج OCR وسيتم تعبئة الفورم عند جاهزيتها.",
          "Checking OCR results. The form will be filled once ready."
        ),
      });

      setIsOcrProcessing(true);
      setIsOcrReady(false);

      pollStartedAtRef.current = Date.now();
      pollForOcrMetadata(documentId);

      stopPolling();
      pollIntervalRef.current = window.setInterval(() => {
        pollForOcrMetadata(documentId);
      }, 2000);

      return;
    }

    setIsUploadingAndProcessing(true);

    toast({
      title: t("رفع الوثيقة ومعالجتها...", "Uploading & processing..."),
      description: t(
        "يتم الآن رفع الوثيقة وبدء OCR. الرجاء الانتظار...",
        "Uploading document and starting OCR. Please wait..."
      ),
    });

    try {
      const data = new FormData();
      data.append("File", file);
      data.append("Title", formData.title.trim());

      const uploadResponse = await api.post("/documents/Add", data, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status >= 200 && status < 500,
      });

      if (uploadResponse.status === 409) {
        const dup = extractDuplicateInfo(uploadResponse.data);
        toast({
          title: t("ملف مكرر", "Duplicate file"),
          description: dup?.message || t("هذا الملف موجود مسبقاً", "This file already exists"),
          variant: "destructive",
        });
        return;
      }

      if (uploadResponse.status !== 200) {
        const status = uploadResponse.status;
        const msg =
          status === 403
            ? t("ليس لديك صلاحية لرفع وثائق", "You don't have permission to upload documents")
            : t("فشل رفع الوثيقة", "Document upload failed");
        throw new Error(msg);
      }

      const newDocumentId = extractUploadedDocumentId(uploadResponse.data);
      if (!newDocumentId) {
        throw new Error(
          t("تم رفع الملف لكن لم يتم العثور على documentId في الرد", "File uploaded but documentId was not found in the response")
        );
      }

      toast({
        title: t("تم رفع الوثيقة ✅", "Uploaded ✅"),
        description: t(
          "بدأت الآن معالجة OCR... سيتم تعبئة الفورم تلقائياً عند انتهاء المعالجة.",
          "OCR processing started... the form will be filled automatically once it finishes."
        ),
      });

      setDocumentId(newDocumentId);
      setIsOcrProcessing(true);
      setIsOcrReady(false);
      pollStartedAtRef.current = Date.now();
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      const message =
        err instanceof Error
          ? err.message
          : status === 403
            ? t("ليس لديك صلاحية لتنفيذ العملية", "You don't have permission to perform this action")
            : t("فشل العملية، حاول مرة أخرى", "Operation failed, please try again");

      toast({
        title: t("خطأ", "Error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAndProcessing(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!token) {
      toast({
        title: t("غير مسجّل", "Not logged in"),
        description: t("يجب تسجيل الدخول أولاً", "You must login first"),
        variant: "destructive",
      });
      return;
    }

    if (!documentId) {
      toast({
        title: t("لا يوجد وثيقة", "No document"),
        description: t(
          "ارفع الوثيقة ومعالجتها أولاً ليتم تعبئة الفورم تلقائياً.",
          "Upload & process the document first so the form fills automatically."
        ),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const tags = formData.keywords
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const metadataPayload: Record<string, unknown> = {};
      if (formData.description.trim()) metadataPayload.description = formData.description.trim();
      if (formData.category.trim()) metadataPayload.category = formData.category.trim();
      if (tags.length) metadataPayload.tags = tags;
      if (formData.department.trim()) metadataPayload.department = formData.department.trim();
      if (formData.documentType.trim()) metadataPayload.documentType = formData.documentType.trim();

      if (formData.expirationDate) {
        metadataPayload.expirationDate = new Date(formData.expirationDate).toISOString();
      }

      await api.put(`/documents/${documentId}/metadata`, metadataPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        title: t("تم الحفظ ✅", "Saved ✅"),
        description: t("تم حفظ البيانات الوصفية بنجاح", "Metadata saved successfully"),
      });

      // ✅ redirect حسب الدور بدون any
      const role = getUserRoleLower(user);
      navigate(role === "manager" ? "/documents" : "/my-documents");
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      const message =
        err instanceof Error
          ? err.message
          : status === 403
            ? t("ليس لديك صلاحية لتنفيذ العملية", "You don't have permission to perform this action")
            : t("فشل العملية، حاول مرة أخرى", "Operation failed, please try again");

      toast({
        title: t("خطأ", "Error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const iconGapClass = language === "ar" ? "ml-2" : "mr-2";

  return (
    <div className="p-6 animate-fade-in" style={{ direction: language === "ar" ? "rtl" : "ltr" }}>
      <div className="mb-6">
        <Button variant="ghost" className="mb-3" onClick={() => navigate(-1)}>
          <ArrowRight className={`w-4 h-4 ${iconGapClass}`} />
          {t("عودة", "Back")}
        </Button>

        <h1 className="text-3xl font-cairo font-bold text-foreground mb-2">
          {t("رفع وثيقة جديدة", "Upload a new document")}
        </h1>
        <p className="text-muted-foreground">{t("أضف وثيقة جديدة إلى النظام", "Add a new document to the system")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              {t("رفع الملف", "Upload file")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("اسحب الملف هنا أو انقر للتحميل", "Drag file here or click to upload")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("PDF, DOC, DOCX, JPG, PNG (حتى 10MB)", "PDF, DOC, DOCX, JPG, PNG (up to 10MB)")}
                  </p>
                </label>
              </div>

              {file && (
                <div className="bg-muted/50 rounded-lg p-4 animate-scale-in">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="button"
                className="w-full gradient-hero"
                onClick={handleUploadAndProcess}
                disabled={!file || isUploadingAndProcessing || isSaving}
              >
                {isUploadingAndProcessing || isOcrProcessing ? (
                  <Loader2 className={`w-4 h-4 animate-spin ${iconGapClass}`} />
                ) : (
                  <Upload className={`w-4 h-4 ${iconGapClass}`} />
                )}
                {documentId
                  ? isOcrProcessing
                    ? t("OCR قيد المعالجة...", "OCR processing...")
                    : t("إعادة جلب نتائج OCR", "Re-fetch OCR results")
                  : t("رفع الوثيقة ومعالجتها", "Upload & Process")}
              </Button>

              {documentId && (
                <div className="text-sm text-muted-foreground">
                  {isOcrReady
                    ? t("✅ تم استخراج OCR وتعبئة الفورم.", "✅ OCR extracted and form filled.")
                    : t("⏳ جاري معالجة OCR... سيتم تعبئة الفورم تلقائياً.", "⏳ OCR processing... the form will be filled automatically.")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              {t("البيانات الوصفية", "Metadata")}
              {(isExtracting || isOcrProcessing) && (
                <span className="text-sm text-muted-foreground">
                  ({isOcrProcessing ? t("OCR...", "OCR...") : t("...", "...")})
                </span>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{t("عنوان الوثيقة *", "Document title *")}</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="author">{t("اسم الكاتب", "Author name")}</Label>
                <Input id="author" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="creationDate">{t("تاريخ الإنشاء", "Creation date")}</Label>
                <Input
                  id="creationDate"
                  type="date"
                  value={formData.creationDate}
                  onChange={(e) => setFormData({ ...formData, creationDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="category">{t("التصنيف *", "Category *")}</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t("مثال: Auto أو Invoice أو عقد", "Example: Auto / Invoice / Contract")}
                />
              </div>

              <div>
                <Label htmlFor="keywords">{t("الكلمات المفتاحية", "Keywords")}</Label>
                <Input id="keywords" value={formData.keywords} onChange={(e) => setFormData({ ...formData, keywords: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="description">{t("وصف الوثيقة", "Document description")}</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>

              <div>
                <Label htmlFor="department">{t("القسم", "Department")}</Label>
                <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="documentType">{t("نوع الوثيقة", "Document type")}</Label>
                <Input
                  id="documentType"
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                  placeholder={t("مثال: PDF أو Invoice أو Contract", "Example: PDF / Invoice / Contract")}
                />
              </div>

              <div>
                <Label htmlFor="expirationDate">{t("تاريخ الانتهاء", "Expiration date")}</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  className="flex-1 gradient-hero"
                  onClick={handleSaveMetadata}
                  disabled={!documentId || isSaving || isUploadingAndProcessing}
                >
                  {isSaving ? (
                    <Loader2 className={`w-4 h-4 animate-spin ${iconGapClass}`} />
                  ) : (
                    <Upload className={`w-4 h-4 ${iconGapClass}`} />
                  )}
                  {isSaving ? t("جاري الحفظ...", "Saving...") : t("حفظ البيانات", "Save metadata")}
                </Button>

                <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSaving || isUploadingAndProcessing}>
                  {t("إلغاء", "Cancel")}
                </Button>
              </div>

              {!documentId && (
                <div className="text-sm text-muted-foreground pt-2">
                  {t(
                    "ارفع الملف ثم اضغط (رفع الوثيقة ومعالجتها) ليتم استخراج OCR وتعبئة الفورم تلقائياً.",
                    "Upload the file then click (Upload & Process) to extract OCR and fill the form automatically."
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
