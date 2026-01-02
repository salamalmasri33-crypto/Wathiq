import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, FileText, TrendingUp } from 'lucide-react';
import api from '@/config/api';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

/* =======================
   Types (no any)
======================= */
type DashboardTotals = {
  totalDocuments: number;
  totalUsers: number;
  todayUploads: number;
  monthlyUpdates: number;
};

type AuditLog = {
  timestamp: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action?: string | null;
  documentId?: string | null;
  description?: string | null;
};

type DocumentLite = {
  id: string;
  fileName?: string | null;
  contentType?: string | null;
  // ما رح نعتمد على metadata.documentType هون لأنك قلت نعتمد على endpoint يلي فيه contentType
};

type CountItem = { label: string; count: number };

type ReportType = 'activity' | 'documents';
type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';

type ChartDatum = { name: string; value: number };

type UserActivityRow = {
  userId: string;
  uploads: number;
  updates: number;
  deletes: number;
  searches: number;
  downloads: number;
};

/* =======================
   Helpers
======================= */
const enNumber = new Intl.NumberFormat('en-US');

const BAR_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#64748b', // slate
];

function formatNumber(n: number): string {
  return enNumber.format(n);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseTotals(data: unknown): DashboardTotals | null {
  if (!isRecord(data)) return null;

  const td = data.totalDocuments;
  const tu = data.totalUsers;
  const today = data.todayUploads;
  const monthly = data.monthlyUpdates;

  if (
    typeof td !== 'number' ||
    typeof tu !== 'number' ||
    typeof today !== 'number' ||
    typeof monthly !== 'number'
  ) {
    return null;
  }

  return { totalDocuments: td, totalUsers: tu, todayUploads: today, monthlyUpdates: monthly };
}

function parseAuditList(data: unknown): AuditLog[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(isRecord)
    .map((x) => ({
      timestamp: typeof x.timestamp === 'string' ? x.timestamp : new Date().toISOString(),
      userId: typeof x.userId === 'string' ? x.userId : null,
      userName: typeof x.userName === 'string' ? x.userName : null,
      userEmail: typeof x.userEmail === 'string' ? x.userEmail : null,
      userRole: typeof x.userRole === 'string' ? x.userRole : null,
      action: typeof x.action === 'string' ? x.action : null,
      documentId: typeof x.documentId === 'string' ? x.documentId : null,
      description: typeof x.description === 'string' ? x.description : null,
    }))
    .filter((x) => x.timestamp);
}

function parseUserActivityRows(data: unknown): UserActivityRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(isRecord)
    .map((x) => {
      const userId = typeof x.userId === 'string' ? x.userId : '';
      const uploads = typeof x.uploads === 'number' ? x.uploads : 0;
      const updates = typeof x.updates === 'number' ? x.updates : 0;
      const deletes = typeof x.deletes === 'number' ? x.deletes : 0;
      const searches = typeof x.searches === 'number' ? x.searches : 0;
      const downloads = typeof x.downloads === 'number' ? x.downloads : 0;
      return { userId, uploads, updates, deletes, searches, downloads };
    })
    .filter((x) => x.userId);
}

function normalizeDocumentsResponse(data: unknown): DocumentLite[] {
  if (Array.isArray(data)) return data as DocumentLite[];

  if (isRecord(data)) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as DocumentLite[];
    if (Array.isArray(obj.documents)) return obj.documents as DocumentLite[];
  }

  return [];
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfToday();
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday=0
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(): Date {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

function startOfYear(): Date {
  const d = startOfToday();
  d.setMonth(0, 1);
  return d;
}

function filterByDateRange(logs: AuditLog[], range: DateRange): AuditLog[] {
  const now = new Date();
  let from: Date | null = null;

  if (range === 'today') from = startOfToday();
  else if (range === 'week') from = startOfWeek();
  else if (range === 'month') from = startOfMonth();
  else if (range === 'year') from = startOfYear();
  else from = null; // custom بدون from/to حالياً

  if (!from) return logs;

  const fromTime = from.getTime();
  const toTime = now.getTime();

  return logs.filter((l) => {
    const t = new Date(l.timestamp).getTime();
    return !Number.isNaN(t) && t >= fromTime && t <= toTime;
  });
}

function getTopActions(logs: AuditLog[]): CountItem[] {
  const m = new Map<string, number>();

  for (const l of logs) {
    const key = (l.action || l.description || 'Unknown').toString().trim() || 'Unknown';
    m.set(key, (m.get(key) ?? 0) + 1);
  }

  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function labelFromContentType(contentType: string | null | undefined, fileName?: string | null): string {
  const ct = (contentType ?? '').trim().toLowerCase();
  const fn = (fileName ?? '').trim().toLowerCase();

  // contentType أولاً
  if (ct === 'application/pdf') return 'PDF';
  if (ct.startsWith('image/')) return 'Image';
  if (ct.includes('spreadsheet') || ct.includes('excel')) return 'Excel';
  if (ct.includes('word') || ct.includes('msword')) return 'Word';
  if (ct.includes('powerpoint') || ct.includes('presentation')) return 'PowerPoint';
  if (ct.startsWith('text/')) return 'Text';
  if (ct.includes('zip')) return 'Archive';

  // fallback على الامتداد إذا contentType مش واضح
  const ext = fn.includes('.') ? fn.split('.').pop() ?? '' : '';
  if (ext === 'pdf') return 'PDF';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'Image';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Excel';
  if (['doc', 'docx'].includes(ext)) return 'Word';
  if (['ppt', 'pptx'].includes(ext)) return 'PowerPoint';
  if (ext) return ext.toUpperCase();

  return 'Unspecified';
}

function groupDocumentsByContentType(docs: DocumentLite[]): CountItem[] {
  const m = new Map<string, number>();

  for (const d of docs) {
    const key = labelFromContentType(d.contentType, d.fileName);
    m.set(key, (m.get(key) ?? 0) + 1);
  }

  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (a.label === 'Unspecified') return 1;
      if (b.label === 'Unspecified') return -1;
      return b.count - a.count;
    });
}

function toChartData(items: CountItem[], limit = 8): ChartDatum[] {
  const top = items.slice(0, limit);
  const rest = items.slice(limit);
  const others = rest.reduce((sum, x) => sum + x.count, 0);

  const data: ChartDatum[] = top.map((x) => ({
    name: x.label.length > 18 ? x.label.slice(0, 18) + '…' : x.label,
    value: x.count,
  }));

  if (others > 0) data.push({ name: 'Others', value: others });

  return data;
}

function downloadCsvFile(filename: string, rows: string[][]) {
  const escapeCell = (s: string) => `"${s.split('"').join('""')}"`;
  const csv = rows.map((r) => r.map((c) => escapeCell(c)).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =======================
   Component
======================= */
export const Reports = () => {
  const { user, token } = useAuth();
  const { language, t } = useLanguage();

  const isRTL = language === 'ar';
  const iconGap = isRTL ? 'ml-2' : 'mr-2';

  // ✅ default: activity
  const [reportType, setReportType] = useState<ReportType>('activity');
  const [dateRange, setDateRange] = useState<DateRange>('month');

  const [loading, setLoading] = useState(false);

  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [userActivityRows, setUserActivityRows] = useState<UserActivityRow[]>([]);
  const [documentsForChart, setDocumentsForChart] = useState<DocumentLite[]>([]);

  const canUseReportsApis = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    const loadAll = async () => {
      if (!token || !canUseReportsApis) return;

      setLoading(true);
      try {
        // totals دائماً
        const totalsRes = await api.get('/dashboard/totals', { headers: { Authorization: `Bearer ${token}` } });
        setTotals(parseTotals(totalsRes.data));

        // ✅ النشاط: جرّب /audit (فيه أسماء) — إذا 500 بسبب userId غير صالح، استخدم /reports/user-activity
        try {
          const auditRes = await api.get('/audit', { headers: { Authorization: `Bearer ${token}` } });
          setAuditLogs(parseAuditList(auditRes.data));
          setUserActivityRows([]);
        } catch (e) {
          console.error('⚠️ /audit failed, falling back to /reports/user-activity', e);
          setAuditLogs([]);
          try {
            const uaRes = await api.get('/reports/user-activity', { headers: { Authorization: `Bearer ${token}` } });
            setUserActivityRows(parseUserActivityRows(uaRes.data));
          } catch (e2) {
            console.error('❌ /reports/user-activity fallback failed', e2);
            setUserActivityRows([]);
          }
        }

        // ✅ للوثائق: نعتمد على نفس endpoint تبع pages اللي فيها contentType
        const docsRes = await api.post(
          '/documents/search',
          {
            query: undefined,
            category: undefined,
            sortBy: 'CreatedAt',
            desc: true,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setDocumentsForChart(normalizeDocumentsResponse(docsRes.data));
      } catch (e) {
        console.error('❌ Reports load failed', e);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [token, canUseReportsApis]);

  const filteredAudit = useMemo(() => filterByDateRange(auditLogs, dateRange), [auditLogs, dateRange]);

  const stats = useMemo(() => {
    const totalDocs = totals?.totalDocuments ?? 0;
    const todayUploads = totals?.todayUploads ?? 0;

    const activeUsers = filteredAudit.length
      ? new Set(filteredAudit.map((x) => x.userId).filter((x): x is string => typeof x === 'string' && x.length > 0)).size
      : userActivityRows.length;

    return [
      {
        title: t('إجمالي الوثائق', 'Total documents'),
        value: loading ? '...' : formatNumber(totalDocs),
        icon: FileText,
        color: 'text-primary',
      },
      {
        title: t('رفع اليوم', "Today's uploads"),
        value: loading ? '...' : formatNumber(todayUploads),
        icon: TrendingUp,
        color: 'text-green-500',
      },
      {
        title: t('نشاط المستخدمين', 'Active users'),
        value: loading ? '...' : formatNumber(activeUsers),
        icon: TrendingUp,
        color: 'text-secondary',
      },
    ];
  }, [totals, filteredAudit, userActivityRows.length, loading, t]);

  const chartTitle = useMemo(() => {
    return reportType === 'activity'
      ? t('تقرير النشاط (Top Actions)', 'Activity report (Top actions)')
      : t('تقرير الوثائق حسب نوع المحتوى (Content-Type)', 'Documents by content type (Content-Type)');
  }, [reportType, t]);

  const sourceHint = useMemo(() => {
    if (reportType === 'activity') {
      return auditLogs.length
        ? t('المصدر: /audit (مع فلترة زمنية بالفرونت)', 'Source: /audit (date filtered on frontend)')
        : t(
            'المصدر: /reports/user-activity (fallback لأن /audit قد يعيد 500)',
            'Source: /reports/user-activity (fallback because /audit may return 500)'
          );
    }
    return t('المصدر: /documents/search (تجميع حسب contentType)', 'Source: /documents/search (grouped by contentType)');
  }, [reportType, auditLogs.length, t]);

  const chartItems = useMemo<CountItem[]>(() => {
    if (reportType === 'activity') {
      if (filteredAudit.length) return getTopActions(filteredAudit);

      // fallback: /reports/user-activity يعطي مجموعات لكل يوزر، نحولها لمجاميع أكشنز
      if (userActivityRows.length) {
        const totals = userActivityRows.reduce(
          (acc, r) => {
            acc.uploads += r.uploads;
            acc.updates += r.updates;
            acc.deletes += r.deletes;
            acc.searches += r.searches;
            acc.downloads += r.downloads;
            return acc;
          },
          { uploads: 0, updates: 0, deletes: 0, searches: 0, downloads: 0 }
        );

        const items: CountItem[] = [
          { label: 'AddDocument', count: totals.uploads },
          { label: 'UpdateDocument', count: totals.updates },
          { label: 'DeleteDocument', count: totals.deletes },
          { label: 'SearchDocuments', count: totals.searches },
          { label: 'DownloadDocument', count: totals.downloads },
        ];

        return items.filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
      }

      return [];
    }
    return groupDocumentsByContentType(documentsForChart);
  }, [reportType, filteredAudit, userActivityRows, documentsForChart]);

  const chartData = useMemo(() => toChartData(chartItems, 8), [chartItems]);

  const handleExport = () => {
    const rows: string[][] = [];

    rows.push(['ReportType', reportType]);
    rows.push(['DateRange', dateRange]);
    rows.push([]);

    rows.push(['Totals']);
    rows.push(['totalDocuments', String(totals?.totalDocuments ?? 0)]);
    rows.push(['totalUsers', String(totals?.totalUsers ?? 0)]);
    rows.push(['todayUploads', String(totals?.todayUploads ?? 0)]);
    rows.push(['monthlyUpdates', String(totals?.monthlyUpdates ?? 0)]);
    rows.push([]);

    rows.push(['Chart']);
    rows.push(['Label', 'Count']);
    for (const it of chartItems) rows.push([it.label, String(it.count)]);
    rows.push([]);

    if (reportType === 'activity') {
      if (filteredAudit.length) {
        rows.push(['Audit (filtered)']);
        rows.push(['timestamp', 'userId', 'action', 'documentId', 'role']);
        for (const l of filteredAudit.slice(0, 200)) {
          rows.push([
            l.timestamp,
            (l.userId || '').toString(),
            (l.description || l.action || 'Event').toString(),
            (l.documentId || '').toString(),
            (l.userRole || '').toString(),
          ]);
        }
      } else if (userActivityRows.length) {
        rows.push(['UserActivity (fallback)']);
        rows.push(['userId', 'uploads', 'updates', 'deletes', 'searches', 'downloads']);
        for (const r of userActivityRows.slice(0, 500)) {
          rows.push([
            r.userId,
            String(r.uploads),
            String(r.updates),
            String(r.deletes),
            String(r.searches),
            String(r.downloads),
          ]);
        }
      }
    }

    downloadCsvFile(`report_${reportType}_${dateRange}.csv`, rows);
  };

  if (!canUseReportsApis) {
    return (
      <div className="p-6" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>{t('التقارير والإحصائيات', 'Reports & analytics')}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            {t('هذه الصفحة متاحة للأدوار Admin و Manager فقط.', 'This page is available for Admin and Manager roles only.')}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-cairo font-bold text-foreground mb-2">
            {t('التقارير والإحصائيات', 'Reports & analytics')}
          </h1>
          <p className="text-muted-foreground">{t('عرض وتحليل بيانات النظام', 'View and analyze system data')}</p>
        </div>
        <Button className="gradient-hero" onClick={handleExport} disabled={loading}>
          <Download className={`w-4 h-4 ${iconGap}`} />
          {t('تصدير التقرير', 'Export report')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="hover-lift animate-bounce-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{loading ? '...' : t('بيانات مباشرة', 'Live data')}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg gradient-hero flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settings */}
      <Card className="mb-6 hover-lift">
        <CardHeader>
          <CardTitle>{t('إعدادات التقرير', 'Report settings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue placeholder={t('نوع التقرير', 'Report type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activity">{t('تقرير النشاط', 'Activity report')}</SelectItem>
                <SelectItem value="documents">{t('تقرير الوثائق', 'Documents report')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger>
                <SelectValue placeholder={t('الفترة الزمنية', 'Date range')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('اليوم', 'Today')}</SelectItem>
                <SelectItem value="week">{t('هذا الأسبوع', 'This week')}</SelectItem>
                <SelectItem value="month">{t('هذا الشهر', 'This month')}</SelectItem>
                <SelectItem value="year">{t('هذا العام', 'This year')}</SelectItem>
                <SelectItem value="custom">{t('فترة مخصصة', 'Custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === 'custom' && (
            <p className="text-xs text-muted-foreground mt-3">
              {t(
                'الفترة المخصصة تحتاج حقول تاريخ (From/To). حالياً يتم عرض كامل البيانات لأن الباك لا يوفّر فلترة زمنية جاهزة.',
                'Custom range needs From/To fields. Currently showing all data because backend does not provide ready date filtering.'
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {chartTitle}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="bg-muted rounded-lg p-4 h-[360px]">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="w-14 h-14 mb-3" />
                {t('جاري تحميل بيانات التقرير...', 'Loading report data...')}
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="w-14 h-14 mb-3" />
                {t('لا توجد بيانات كافية', 'Not enough data')}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} height={55} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: unknown) => {
                        const n = typeof value === 'number' ? value : 0;
                        return [formatNumber(n), t('العدد', 'Count')];
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {chartData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <p className="text-xs text-muted-foreground mt-2">{sourceHint}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
