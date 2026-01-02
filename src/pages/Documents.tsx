import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Search, FileText, Eye, Download, Edit, Trash2 } from 'lucide-react';
import { Document } from '@/types/document';
import api from '@/config/api';

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
   Date helpers
======================= */
function toYmd(dateLike: string): string {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/* =======================
   Download helper (auth)
======================= */
async function downloadDocumentFile(args: {
  token: string;
  documentId: string;
  fileName?: string | null;
}) {
  const { token, documentId, fileName } = args;

  const res = await api.get(`/documents/${documentId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
  });

  const blobUrl = URL.createObjectURL(res.data);
  const a = window.document.createElement('a');
  a.href = blobUrl;
  a.download = fileName || 'document';
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/* =======================
   Response normalization
======================= */
function normalizeDocumentsResponse(data: unknown): Document[] {
  if (Array.isArray(data)) return data as Document[];

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as Document[];
    if (Array.isArray(obj.documents)) return obj.documents as Document[];
  }

  return [];
}

export const Documents = () => {
  const { user, token } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  // فورم التعديل (نفس تصميمك)
  const [showForm, setShowForm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<string>('أخرى');
  const [newTags, setNewTags] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newDocumentType, setNewDocumentType] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState(''); // yyyy-mm-dd

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!token) return;

      setLoading(true);
      try {
        // ✅ مطابق للباك SearchDocumentsDto (lowercase keys)
        const body = {
          query: searchTerm.trim() !== '' ? searchTerm.trim() : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          sortBy: 'CreatedAt',
          desc: false,
        };

        const res = await api.post('/documents/search', body, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setDocuments(normalizeDocumentsResponse(res.data));
      } catch (err: unknown) {
        console.error('❌ فشل جلب الوثائق:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [searchTerm, categoryFilter, token]);

  const iconGap = language === 'ar' ? 'ml-2' : 'mr-2';
  const searchIconPos =
    language === 'ar'
      ? 'absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4'
      : 'absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4';
  const searchPadding = language === 'ar' ? 'pr-10' : 'pl-10';

  // حذف وثيقة
  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm(t('هل أنت متأكد من حذف هذه الوثيقة؟', 'Are you sure you want to delete this document?'))) return;

    try {
      await api.delete(`/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      console.error('❌ فشل حذف الوثيقة:', err);
      const status = getHttpStatus(err);
      if (status === 403) alert(t('لا تملك صلاحية حذف هذه الوثيقة.', "You don't have permission to delete this document."));
      else alert(t('فشل حذف الوثيقة.', 'Failed to delete document.'));
    }
  };

  // تنزيل ✅ (Authorization)
  const handleDownload = async (doc: Document) => {
    if (!token) return;

    try {
      await downloadDocumentFile({
        token,
        documentId: doc.id,
        fileName: doc.fileName ?? doc.title ?? 'document',
      });
    } catch (err: unknown) {
      console.error('❌ فشل تحميل الملف:', err);
      const status = getHttpStatus(err);
      if (status === 403) alert(t('لا تملك صلاحية تحميل هذا الملف.', "You don't have permission to download this file."));
      else if (status === 404) alert(t('الملف غير موجود.', 'File not found.'));
      else alert(t('فشل تحميل الملف.', 'Failed to download file.'));
    }
  };

  // فتح فورم التعديل
  const openEditForm = (doc: Document) => {
    setSelectedDoc(doc);
    setNewDescription(doc.metadata?.description ?? '');
    setNewCategory(doc.metadata?.category ?? 'أخرى');
    setNewTags(doc.metadata?.tags?.join(',') ?? '');
    setNewDepartment(doc.metadata?.department ?? '');
    setNewDocumentType(doc.metadata?.documentType ?? '');
    setNewExpirationDate(doc.metadata?.expirationDate ? toYmd(doc.metadata.expirationDate) : '');
    setShowForm(true);
  };

  // حفظ التعديلات (metadata)
  const handleEditSave = async () => {
    if (!selectedDoc || !token) return;

    const tags = newTags
      .split(',')
      .map((tt) => tt.trim())
      .filter(Boolean);

    try {
      await api.put(
        `/documents/${selectedDoc.id}/metadata`,
        {
          description: newDescription || null,
          category: newCategory || null,
          tags,
          department: newDepartment || null,
          documentType: newDocumentType || null,
          expirationDate: newExpirationDate ? new Date(newExpirationDate).toISOString() : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // تحديث اللست محلياً
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedDoc.id
            ? {
                ...d,
                metadata: {
                  ...(d.metadata ?? {}),
                  description: newDescription,
                  category: newCategory,
                  tags,
                  department: newDepartment,
                  documentType: newDocumentType,
                  expirationDate: newExpirationDate ? new Date(newExpirationDate).toISOString() : null,
                },
              }
            : d
        )
      );

      setShowForm(false);
      setSelectedDoc(null);
    } catch (err: unknown) {
      console.error('❌ فشل تعديل الوثيقة:', err);
      const status = getHttpStatus(err);
      if (status === 403) alert(t('لا تملك صلاحية تعديل هذه الوثيقة.', "You don't have permission to edit this document."));
      else alert(t('فشل تعديل البيانات.', 'Failed to update data.'));
    }
  };

  const getCreatedAt = (doc: Document) =>
    doc.createdAt
      ? new Date(doc.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
      : '—';

  return (
    <div className="p-6 animate-fade-in" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-cairo font-bold text-foreground mb-2">
            {user?.role === 'Admin' ? t('إدارة الوثائق', 'Documents management') : t('الوثائق', 'Documents')}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'Admin' && t('جميع وثائق النظام', 'All system documents')}
            {user?.role === 'Manager' && t('وثائق القسم/النطاق الإداري', 'Department / managed scope documents')}
            {user?.role === 'User' && t('وثائقك الشخصية', 'Your personal documents')}
          </p>
        </div>

        {user?.role === 'Manager' && (
          <Button onClick={() => navigate('/add-document')} className="gradient-hero">
            <Upload className={`w-4 h-4 ${iconGap}`} />
            {t('رفع وثيقة جديدة', 'Upload new document')}
          </Button>
        )}
      </div>

      {/* فلاتر البحث */}
      <Card className="mb-6 hover-lift">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className={searchIconPos} />
              <Input
                placeholder={t('البحث في العنوان، التصنيف أو الكلمات المفتاحية...', 'Search in title, category, or keywords...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={searchPadding}
              />
            </div>

            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as string | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder={t('التصنيف', 'Category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('جميع التصنيفات', 'All categories')}</SelectItem>
                <SelectItem value="عقد">{t('عقد', 'Contract')}</SelectItem>
                <SelectItem value="فاتورة">{t('فاتورة', 'Invoice')}</SelectItem>
                <SelectItem value="تقرير">{t('تقرير', 'Report')}</SelectItem>
                <SelectItem value="شهادة">{t('شهادة', 'Certificate')}</SelectItem>
                <SelectItem value="أخرى">{t('أخرى', 'Other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول الوثائق */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {t('قائمة الوثائق', 'Documents list')} ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">{t('العنوان', 'Title')}</TableHead>
                <TableHead className="text-center">{t('الوصف', 'Description')}</TableHead>
                <TableHead className="text-center">{t('التصنيف', 'Category')}</TableHead>
                <TableHead className="text-center">{t('الكلمات المفتاحية', 'Keywords')}</TableHead>
                <TableHead className="text-center">{t('القسم', 'Department')}</TableHead>
                <TableHead className="text-center">{t('نوع الوثيقة', 'Document type')}</TableHead>
                <TableHead className="text-center">{t('تاريخ الانتهاء', 'Expiration date')}</TableHead>
                <TableHead className="text-center">{t('اسم الملف', 'File name')}</TableHead>
                <TableHead className="text-center">{t('نوع المحتوى', 'Content type')}</TableHead>
                <TableHead className="text-center">{t('الحجم', 'Size')}</TableHead>
                <TableHead className="text-center">{t('تاريخ الرفع', 'Uploaded at')}</TableHead>
                <TableHead className="text-center">{t('الإجراءات', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">
                    {t('جاري تحميل الوثائق...', 'Loading documents...')}
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc, index) => (
                  <TableRow
                    key={doc.id}
                    className="hover:bg-muted animate-stagger"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TableCell className="text-center">{doc.title ?? '—'}</TableCell>
                    <TableCell className="text-center">{doc.metadata?.description ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{doc.metadata?.category ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {doc.metadata?.tags?.length
                        ? (language === 'ar' ? doc.metadata.tags.join('، ') : doc.metadata.tags.join(', '))
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center">{doc.metadata?.department ?? '—'}</TableCell>
                    <TableCell className="text-center">{doc.metadata?.documentType ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      {doc.metadata?.expirationDate ? toYmd(doc.metadata.expirationDate) : '—'}
                    </TableCell>
                    <TableCell className="text-center">{doc.fileName ?? '—'}</TableCell>
                    <TableCell className="text-center">{doc.contentType ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      {doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : '—'}
                    </TableCell>
                    <TableCell className="text-center">{getCreatedAt(doc)}</TableCell>

                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/documents/${doc.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}>
                          <Download className="w-4 h-4" />
                        </Button>

                        {user?.role === 'Manager' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openEditForm(doc)}>
                              <Edit className="w-4 h-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDelete(doc.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* فورم التعديل */}
      {showForm && user?.role === 'Manager' && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50"
          style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
        >
          <Card className="w-full max-w-md h-[75vh] overflow-y-auto rounded-lg shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">
                {t('تعديل بيانات الوثيقة', 'Edit document data')}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <Input
                placeholder={t('الوصف', 'Description')}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />

              <select
                className="border rounded px-3 py-2 w-full"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="عقد">{t('عقد', 'Contract')}</option>
                <option value="فاتورة">{t('فاتورة', 'Invoice')}</option>
                <option value="تقرير">{t('تقرير', 'Report')}</option>
                <option value="شهادة">{t('شهادة', 'Certificate')}</option>
                <option value="أخرى">{t('أخرى', 'Other')}</option>
              </select>

              <Input
                placeholder={t('الكلمات المفتاحية', 'Keywords')}
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
              />

              <Input
                placeholder={t('القسم', 'Department')}
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
              />

              <select
                className="border rounded px-3 py-2 w-full"
                value={newDocumentType}
                onChange={(e) => setNewDocumentType(e.target.value)}
              >
                <option value="PDF">PDF</option>
                <option value="Word">Word</option>
                <option value="Excel">Excel</option>
                <option value="صورة">{t('صورة', 'Image')}</option>
                <option value="أخرى">{t('أخرى', 'Other')}</option>
              </select>

              <Input type="date" value={newExpirationDate} onChange={(e) => setNewExpirationDate(e.target.value)} />

              <div className="flex justify-between gap-4 mt-6">
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                  {t('إلغاء', 'Cancel')}
                </Button>
                <Button onClick={handleEditSave} className="flex-1 gradient-hero">
                  {t('حفظ التعديلات', 'Save changes')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
