import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Document } from '@/types/document';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { ArrowRight, Save, Upload, X } from 'lucide-react';

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
  if (typeof err === 'object' && err !== null && 'response' in err) {
    return (err as AxiosLikeError).response?.status;
  }
  return undefined;
}

/* =======================
   Types
======================= */
type MetadataForm = {
  description: string;
  category: string;
  department: string;
  documentType: string;
  expirationDate: string; // yyyy-mm-dd
  tagsCsv: string; // tag1, tag2
};

/* =======================
   Component
======================= */
export const DocumentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { language, t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [docData, setDocData] = useState<Document | null>(null);

  const [title, setTitle] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);

  const [meta, setMeta] = useState<MetadataForm>({
    description: '',
    category: '',
    department: '',
    documentType: '',
    expirationDate: '',
    tagsCsv: '',
  });

  /* =======================
     Permissions
  ======================= */
  const canEdit = useMemo(() => {
    if (!user || !docData) return false;
    if (user.role === 'Admin' || user.role === 'Manager') return true;
    return user.role === 'User' && docData.userId === user.id;
  }, [user, docData]);

  /* =======================
     Fetch document
  ======================= */
  useEffect(() => {
    const fetchDocument = async () => {
      if (!token || !id) return;

      setLoading(true);
      try {
        const res = await api.get(`/documents/${id}/view`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const doc = res.data as Document;
        setDocData(doc);
        setTitle(doc.title ?? '');

        const m = doc.metadata;
        setMeta({
          description: m?.description ?? '',
          category: m?.category ?? '',
          department: m?.department ?? doc.department ?? '',
          documentType: m?.documentType ?? '',
          expirationDate: m?.expirationDate ? toYmd(m.expirationDate) : '',
          tagsCsv: (m?.tags ?? []).join(', '),
        });
      } catch (err: unknown) {
        console.error('❌ فشل جلب بيانات الوثيقة:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, token]);

  /* =======================
     Save changes
  ======================= */
  const handleSave = async () => {
    if (!token || !id || !docData) return;

    if (!canEdit) {
      alert(t('لا تملك صلاحية تعديل هذه الوثيقة.', "You don't have permission to edit this document."));
      return;
    }

    setLoading(true);
    try {
      /* ---- 1) Update document (title / file) ---- */
      const form = new FormData();
      const trimmedTitle = title.trim();

      if (trimmedTitle && trimmedTitle !== docData.title) {
        form.append('Title', trimmedTitle);
      }
      if (newFile) {
        form.append('File', newFile);
      }

      if (form.has('Title') || form.has('File')) {
        await api.put(`/documents/${id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      /* ---- 2) Update metadata ---- */
      const tags = meta.tagsCsv
        .split(',')
        .map((tt) => tt.trim())
        .filter(Boolean);

      const metadataPayload = {
        description: meta.description || null,
        category: meta.category || null,
        tags,
        department: meta.department || null,
        documentType: meta.documentType || null,
        expirationDate: meta.expirationDate ? new Date(meta.expirationDate).toISOString() : null,
      };

      await api.put(`/documents/${id}/metadata`, metadataPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate(`/documents/${id}`);
    } catch (err: unknown) {
      console.error('❌ فشل حفظ التعديلات:', err);
      const status = getHttpStatus(err);

      if (status === 403) alert(t('لا تملك صلاحية تعديل هذه الوثيقة.', "You don't have permission to edit this document."));
      else if (status === 409) alert(t('يوجد تعارض أو وثيقة مكررة.', 'There is a conflict or a duplicate document.'));
      else alert(t('فشل حفظ التعديلات.', 'Failed to save changes.'));
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     Render guards
  ======================= */
  if (!token) return <p className="p-6">{t('يجب تسجيل الدخول.', 'You must be logged in.')}</p>;
  if (loading && !docData) return <p className="p-6">{t('جاري التحميل...', 'Loading...')}</p>;
  if (!docData) return <p className="p-6">{t('لم يتم العثور على الوثيقة', 'Document not found')}</p>;

  const iconGap = language === 'ar' ? 'ml-2' : 'mr-2';

  if (!canEdit) {
    return (
      <div className="p-6" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowRight className={`w-4 h-4 ${iconGap}`} />
          {t('العودة', 'Back')}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{t('غير مصرح', 'Unauthorized')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('لا تملك صلاحية تعديل هذه الوثيقة.', "You don't have permission to edit this document.")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* =======================
     UI
  ======================= */
  return (
    <div className="p-6" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <div className="mb-6 flex justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowRight className={`w-4 h-4 ${iconGap}`} />
          {t('العودة', 'Back')}
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/documents/${id}`)}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className={`w-4 h-4 ${iconGap}`} />
            {loading ? t('جاري الحفظ...', 'Saving...') : t('حفظ التعديلات', 'Save changes')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('تعديل الوثيقة', 'Edit document')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('العنوان', 'Title')}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('عنوان الوثيقة', 'Document title')} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>{t('استبدال الملف (اختياري)', 'Replace file (optional)')}</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.document.getElementById('fileInput')?.click()}
                  >
                    <Upload className={`w-4 h-4 ${iconGap}`} />
                    {t('اختيار ملف', 'Choose file')}
                  </Button>

                  {newFile ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="break-all">{newFile.name}</span>
                      <Button type="button" variant="outline" onClick={() => setNewFile(null)}>
                        <X className={`w-4 h-4 ${iconGap}`} />
                        {t('إزالة', 'Remove')}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground break-all">
                      {t('الملف الحالي:', 'Current file:')} {docData.fileName ?? '—'}
                    </span>
                  )}
                </div>

                <input
                  id="fileInput"
                  type="file"
                  className="hidden"
                  onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('تعديل البيانات الوصفية', 'Edit metadata')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('الوصف', 'Description')}</Label>
                <Textarea
                  value={meta.description}
                  onChange={(e) => setMeta((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('التصنيف', 'Category')}</Label>
                  <Input
                    value={meta.category}
                    onChange={(e) => setMeta((prev) => ({ ...prev, category: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>{t('القسم', 'Department')}</Label>
                  <Input
                    value={meta.department}
                    onChange={(e) => setMeta((prev) => ({ ...prev, department: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>{t('نوع الوثيقة', 'Document type')}</Label>
                  <Input
                    value={meta.documentType}
                    onChange={(e) => setMeta((prev) => ({ ...prev, documentType: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>{t('تاريخ الانتهاء', 'Expiration date')}</Label>
                  <Input
                    type="date"
                    value={meta.expirationDate}
                    onChange={(e) => setMeta((prev) => ({ ...prev, expirationDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>{t('الوسوم (مفصولة بفواصل)', 'Tags (comma-separated)')}</Label>
                <Input
                  value={meta.tagsCsv}
                  onChange={(e) => setMeta((prev) => ({ ...prev, tagsCsv: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('معلومات', 'Info')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-medium break-all">{docData.id}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t('المالك:', 'Owner:')}</span>
                <span className="font-medium break-all">{docData.userId ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t('النوع:', 'Type:')}</span>
                <span className="font-medium break-all">{docData.contentType ?? '—'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* =======================
   Helpers
======================= */
function toYmd(dateLike: string): string {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
