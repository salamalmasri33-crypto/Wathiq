import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { useToast } from '@/hooks/use-toast';

import {
  Search as SearchIcon,
  FileText,
  Calendar,
  SortDesc,
  SortAsc,
  Download,
  Eye,
  HardDrive,
  User,
  FileType,
} from 'lucide-react';

import type { Document } from '@/types/document';

/* =======================
   Types (no any)
======================= */

type UiLanguage = 'en' | 'ar';

type ReportSortBy = 'CreatedAt' | 'Title' | 'Size';

type SearchDocumentsPayload = {
  query?: string | null;
  category?: string | null;
  sortBy: ReportSortBy;
  desc: boolean;
};

type SearchDocumentsResponse =
  | Document[]
  | {
      items?: Document[];
      documents?: Document[];
      total?: number;
    };

type DocumentExtraFields = {
  fileName?: string | null;
  contentType?: string | null;
  size?: number | null;
  ownerId?: string | null;
  ownerName?: string | null;
  updatedAt?: string | null;
};

type DocumentLike = Document & DocumentExtraFields;

/* =======================
   Helpers
======================= */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function normalizeSearchResponse(data: unknown): { items: DocumentLike[]; total?: number } {
  if (Array.isArray(data)) return { items: data as DocumentLike[] };

  if (isRecord(data)) {
    const items = Array.isArray(data.items)
      ? (data.items as DocumentLike[])
      : Array.isArray(data.documents)
      ? (data.documents as DocumentLike[])
      : [];

    const total = typeof data.total === 'number' ? data.total : undefined;
    return { items, total };
  }

  return { items: [] };
}

function formatDate(d: string | Date | null | undefined, lang: UiLanguage): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US');
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const rounded = i === 0 ? `${Math.round(v)}` : `${Math.round(v * 10) / 10}`;
  return `${rounded} ${units[i]}`;
}

function labelFromContentType(contentType: string | null | undefined, fileName?: string | null): string {
  const ct = (contentType ?? '').trim().toLowerCase();
  const fn = (fileName ?? '').trim().toLowerCase();

  if (ct === 'application/pdf') return 'PDF';
  if (ct.startsWith('image/')) return 'Image';
  if (ct.includes('spreadsheet') || ct.includes('excel')) return 'Excel';
  if (ct.includes('word') || ct.includes('msword')) return 'Word';
  if (ct.includes('powerpoint') || ct.includes('presentation')) return 'PowerPoint';
  if (ct.startsWith('text/')) return 'Text';
  if (ct.includes('zip')) return 'Archive';

  const ext = fn.includes('.') ? fn.split('.').pop() ?? '' : '';
  if (ext === 'pdf') return 'PDF';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'Image';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Excel';
  if (['doc', 'docx'].includes(ext)) return 'Word';
  if (['ppt', 'pptx'].includes(ext)) return 'PowerPoint';
  if (ext) return ext.toUpperCase();

  return 'Unspecified';
}

/* =======================
   Component
======================= */

export const Search = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = useAuth();
  const { language, t } = useLanguage();

  // مطابق لـ SearchDocumentsDto
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<ReportSortBy>('CreatedAt');
  const [sortDesc, setSortDesc] = useState<boolean>(true);

  // UI
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DocumentLike[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);

  const hasFilters = useMemo(() => {
    return (
      searchTerm.trim().length > 0 ||
      categoryFilter !== 'all' ||
      sortBy !== 'CreatedAt' ||
      sortDesc !== true
    );
  }, [searchTerm, categoryFilter, sortBy, sortDesc]);

  const didMountRef = useRef(false);

  const handleSearch = useCallback(async () => {
    if (!token) {
      toast({
        title: t('خطأ', 'Error'),
        description: t('يرجى تسجيل الدخول مجدداً.', 'Please login again.'),
      });
      navigate('/login');
      return;
    }

    setIsSearching(true);
    setResults([]);
    setTotal(undefined);

    const payload: SearchDocumentsPayload = {
      query: searchTerm.trim() ? searchTerm.trim() : null,
      category: categoryFilter === 'all' ? null : categoryFilter,
      sortBy,
      desc: sortDesc,
    };

    try {
      const response = await api.post<SearchDocumentsResponse>('/documents/search', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const normalized = normalizeSearchResponse(response.data);
      setResults(normalized.items);
      setTotal(normalized.total);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Search failed:', error.response?.data || error.message);

        if (error.response?.status === 401) {
          toast({
            title: t('غير مصرح', 'Unauthorized'),
            description: t('قد تكون الجلسة انتهت أو التوكن غير صالح.', 'Your session may have expired or the token is invalid.'),
          });
          navigate('/login');
          return;
        }

        toast({
          title: t('فشل البحث', 'Search failed'),
          description: t('تأكد من الاتصال أو الصلاحيات.', 'Check your connection or permissions.'),
        });
      } else {
        console.error('Unexpected error:', error);
        toast({
          title: t('خطأ غير متوقع', 'Unexpected error'),
          description: t('حدث خطأ غير متوقع.', 'An unexpected error occurred.'),
        });
      }
    } finally {
      setIsSearching(false);
    }
  }, [token, toast, t, navigate, searchTerm, categoryFilter, sortBy, sortDesc]);

  // Auto-search when filters change (without needing to press the Search button)
  useEffect(() => {
    // Don't auto-search before first render, and don't do it if user isn't authenticated
    if (!token) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      void handleSearch();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [categoryFilter, sortBy, sortDesc, token, handleSearch]);

  const handleDownload = async (docId: string, suggestedName?: string | null) => {
    if (!token) {
      toast({
        title: t('خطأ', 'Error'),
        description: t('يرجى تسجيل الدخول مجدداً.', 'Please login again.'),
      });
      navigate('/login');
      return;
    }

    try {
      const res = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });

      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = suggestedName?.trim() ? suggestedName.trim() : `document_${docId}`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
      toast({
        title: t('فشل التنزيل', 'Download failed'),
        description: t('تعذر تنزيل الملف.', 'Could not download the file.'),
      });
    }
  };

  const searchIconClass =
    language === 'ar'
      ? 'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4'
      : 'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4';

  const searchInputPadding = language === 'ar' ? 'pr-10' : 'pl-10';

  return (
    <div className="p-6 animate-fade-in" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <div className="mb-6">
        <h1 className="text-3xl font-cairo font-bold text-foreground mb-2">
          {t('البحث في الوثائق', 'Search documents')}
        </h1>
        <p className="text-muted-foreground">
          {t('ابحث عن الوثائق باستخدام الكلمات المفتاحية أو خيارات الفرز', 'Search documents using keywords and sorting options')}
        </p>
      </div>

      <Card className="mb-6 hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="w-5 h-5 text-primary" />
            {t('خيارات البحث', 'Search options')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className={searchIconClass} />
              <Input
                placeholder={t('ابحث عن وثيقة... (يمكن تركه فارغاً)', 'Search for a document... (can be empty)')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={searchInputPadding}
              />
            </div>

            <Button onClick={handleSearch} disabled={isSearching} className="gradient-hero px-8">
              {isSearching ? t('جاري البحث...', 'Searching...') : t('بحث', 'Search')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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

            {/* Sort by */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as ReportSortBy)}>
              <SelectTrigger>
                <SelectValue placeholder={t('الترتيب حسب', 'Sort by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CreatedAt">{t('تاريخ الإضافة', 'Date added')}</SelectItem>
                <SelectItem value="Title">{t('عنوان الوثيقة', 'Document title')}</SelectItem>
                <SelectItem value="Size">{t('حجم الملف', 'File size')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort desc */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {sortDesc ? <SortDesc className="w-5 h-5 text-secondary" /> : <SortAsc className="w-5 h-5 text-secondary" />}
                <Label htmlFor="sortDesc">{t('ترتيب تنازلي', 'Descending')}</Label>
              </div>
              <div dir="ltr" className="flex items-center">
                <Switch id="sortDesc" checked={sortDesc} onCheckedChange={setSortDesc} />
              </div>
            </div>
          </div>

          {!hasFilters && (
            <p className="text-xs text-muted-foreground">
              {t(
                'ملاحظة: يمكنك الضغط على “بحث” بدون كتابة كلمة، وسيتم جلب النتائج حسب الفلاتر/الفرز فقط.',
                'Note: You can click “Search” without typing anything; results will be fetched using filters/sorting only.'
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {isSearching ? (
        <div className="text-center p-10 text-lg text-muted-foreground">{t('جاري جلب النتائج...', 'Loading results...')}</div>
      ) : results.length > 0 ? (
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {t('نتائج البحث', 'Search results')} ({typeof total === 'number' ? total : results.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {results.map((doc, index) => {
                const docLike = doc as DocumentLike;

                const contentLabel = labelFromContentType(docLike.contentType ?? null, docLike.fileName ?? null);
                const created = formatDate(doc.createdAt, language as UiLanguage);
                const updated = formatDate(docLike.updatedAt ?? null, language as UiLanguage);

                return (
                  <Card
                    key={doc.id}
                    className="hover-lift cursor-pointer animate-stagger"
                    style={{ animationDelay: `${index * 0.06}s` }}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg gradient-hero flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-bold text-lg mb-1 truncate">{doc.title}</h3>
                              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                                {doc.metadata?.description || '—'}
                              </p>
                            </div>

                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/documents/${doc.id}`);
                                }}
                              >
                                <Eye className={language === 'ar' ? 'w-4 h-4 ml-2' : 'w-4 h-4 mr-2'} />
                                {t('عرض', 'View')}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDownload(doc.id, docLike.fileName ?? null);
                                }}
                              >
                                <Download className={language === 'ar' ? 'w-4 h-4 ml-2' : 'w-4 h-4 mr-2'} />
                                {t('تنزيل', 'Download')}
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="secondary">{doc.metadata?.category || t('غير مصنف', 'Uncategorized')}</Badge>
                            <Badge variant="outline">{doc.department || t('عام', 'General')}</Badge>

                            <Badge variant="outline" className="flex items-center gap-1">
                              <FileType className="w-3 h-3" />
                              {contentLabel}
                            </Badge>

                            <Badge variant="outline" className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {formatBytes(docLike.size ?? null)}
                            </Badge>

                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {created}
                            </div>

                            {updated !== '—' && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {t('تحديث:', 'Updated:')} {updated}
                              </div>
                            )}

                            {(docLike.ownerName || docLike.ownerId) && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="w-3 h-3" />
                                {docLike.ownerName || docLike.ownerId}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 text-xs text-muted-foreground space-y-1">
                            {docLike.fileName && (
                              <div className="truncate">
                                <span className="font-medium">{t('الملف:', 'File:')}</span> {docLike.fileName}
                              </div>
                            )}
                            {docLike.contentType && (
                              <div className="truncate">
                                <span className="font-medium">{t('النوع:', 'Content-Type:')}</span> {docLike.contentType}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (searchTerm.trim() || categoryFilter !== 'all') && !isSearching ? (
        <div className="text-center p-10 text-lg text-muted-foreground">
          {t('لم يتم العثور على نتائج', 'No results found')}
          {searchTerm.trim() ? (
            <>
              {' '}
              {t('للبحث', 'for')} <span className="font-bold text-primary">"{searchTerm}"</span>
            </>
          ) : null}
          .
        </div>
      ) : null}
    </div>
  );
};
