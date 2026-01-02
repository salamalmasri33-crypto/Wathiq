import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/config/api';
import { Document } from '@/types/document';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  ArrowRight,
  Download,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Tag,
  Building,
  Shield,
} from 'lucide-react';

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
   Component
======================= */
export const DocumentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // لا نسميها document لتجنب التعارض مع window.document
  const [docData, setDocData] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* =======================
     Permissions (UI-level)
  ======================= */
  const canUpdateOrDelete = useMemo(() => {
    if (!user || !docData) return false;
    if (user.role === 'Admin' || user.role === 'Manager') return true;
    return user.role === 'User';
  }, [user, docData]);

  const canDownload = useMemo(() => {
    return Boolean(user && token);
  }, [user, token]);

  /* =======================
     Fetch document + preview
  ======================= */
  useEffect(() => {
    let localPreviewUrl: string | null = null;

    const fetchDocument = async () => {
      if (!token || !id) return;

      setLoading(true);
      try {
        // بيانات الوثيقة
        const res = await api.get(`/documents/${id}/view`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const doc = res.data as Document;
        setDocData(doc);

        // الملف (للمعاينة)
        const fileRes = await api.get(`/documents/${id}/download`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        });

        localPreviewUrl = URL.createObjectURL(fileRes.data);
        setPreviewUrl(localPreviewUrl);
      } catch (err: unknown) {
        console.error('❌ فشل جلب الوثيقة:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();

    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [id, token]);

  /* =======================
     Actions
  ======================= */
  const handleDelete = async () => {
    if (!token || !id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه الوثيقة؟')) return;

    try {
      await api.delete(`/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate(-1);
    } catch (err: unknown) {
      console.error('❌ فشل حذف الوثيقة:', err);
      const status = getHttpStatus(err);
      if (status === 403) alert('لا تملك صلاحية حذف هذه الوثيقة.');
      else alert('فشل حذف الوثيقة. حاول مرة أخرى.');
    }
  };

  const handleDownload = async () => {
    if (!token || !id || !docData) return;

    try {
      const fileRes = await api.get(`/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const blobUrl = URL.createObjectURL(fileRes.data);

      // مهم: window.document
      const a = window.document.createElement('a');
      a.href = blobUrl;
      a.download = docData.fileName || 'document';
      window.document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      console.error('❌ فشل تحميل الملف:', err);
      const status = getHttpStatus(err);
      if (status === 403) alert('لا تملك صلاحية تحميل هذا الملف.');
      else if (status === 404) alert('الملف غير موجود.');
      else alert('فشل تحميل الملف.');
    }
  };

  /* =======================
     Render states
  ======================= */
  if (loading) return <p className="p-6">جاري تحميل الوثيقة...</p>;
  if (!docData) return <p className="p-6">لم يتم العثور على الوثيقة</p>;

  const meta = docData.metadata;

  /* =======================
     UI
  ======================= */
  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة
        </Button>

        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold mb-2 break-words">
              {docData.title ?? '—'}
            </h1>
            <p className="text-muted-foreground break-words">
              {meta?.description ?? '—'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            {canDownload && (
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 ml-2" />
                تحميل
              </Button>
            )}

            {canUpdateOrDelete && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/documents/${docData.id}/edit`)}
                >
                  <Edit className="w-4 h-4 ml-2" />
                  تعديل
                </Button>

                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>معاينة المستند</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  docData.contentType?.includes('pdf') ? (
                    <iframe src={previewUrl} className="w-full h-full" />
                  ) : docData.contentType?.startsWith('image/') ? (
                    <img
                      src={previewUrl}
                      alt={docData.fileName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <FileText className="w-20 h-20 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">لا توجد معاينة</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {docData.fileName}
                      </p>
                    </div>
                  )
                ) : (
                  <p className="text-muted-foreground">جاري التحميل...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>البيانات الوصفية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetaItem icon={<Tag className="w-4 h-4" />} label="التصنيف">
                <Badge variant="secondary">{meta?.category ?? '—'}</Badge>
              </MetaItem>

              <Separator />

              <MetaItem icon={<Building className="w-4 h-4" />} label="القسم">
                {meta?.department ?? docData.department ?? '—'}
              </MetaItem>

              <Separator />

              <MetaItem icon={<Shield className="w-4 h-4" />} label="نوع الوثيقة">
                {meta?.documentType ?? '—'}
              </MetaItem>

              <Separator />

              <MetaItem icon={<Calendar className="w-4 h-4" />} label="تاريخ الانتهاء">
                {meta?.expirationDate
                  ? new Date(meta.expirationDate).toLocaleDateString('ar-SA')
                  : '—'}
              </MetaItem>

              <Separator />

              <MetaItem icon={<FileText className="w-4 h-4" />} label="الوسوم">
                <div className="flex flex-wrap gap-2">
                  {meta?.tags?.length
                    ? meta.tags.map((t, i) => (
                        <Badge key={`${t}-${i}`} variant="outline">
                          {t}
                        </Badge>
                      ))
                    : '—'}
                </div>
              </MetaItem>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* =======================
   Small helper component
======================= */
const MetaItem = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <div className="font-medium">{children}</div>
  </div>
);
