import {
  Home,
  FileText,
  Users,
  Search,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  FolderOpen,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();

  const isRTL = language === 'ar';

  const adminLinks = [
    { title: t('لوحة التحكم', 'Dashboard'), icon: Home, path: '/dashboard' },
    { title: t('إدارة المستخدمين', 'User management'), icon: Users, path: '/users' },
    { title: t('إدارة الوثائق', 'Documents management'), icon: FileText, path: '/documents' },
    { title: t('البحث', 'Search'), icon: Search, path: '/search' },
    { title: t('التقارير', 'Reports'), icon: BarChart3, path: '/reports' },
    { title: t('الإعدادات', 'Settings'), icon: Settings, path: '/settings' },
  ];

  const managerLinks = [
    { title: t('لوحة التحكم', 'Dashboard'), icon: Home, path: '/dashboard' },
    { title: t('الوثائق', 'Documents'), icon: FolderOpen, path: '/documents' },
    { title: t('البحث', 'Search'), icon: Search, path: '/search' },
    { title: t('التقارير', 'Reports'), icon: BarChart3, path: '/reports' },
    { title: t('الإعدادات', 'Settings'), icon: Settings, path: '/settings' },
  ];

  const userLinks = [
    { title: t('لوحة التحكم', 'Dashboard'), icon: Home, path: '/dashboard' },
    { title: t('وثائقي', 'My documents'), icon: FileText, path: '/my-documents' },
    { title: t('البحث', 'Search'), icon: Search, path: '/search' },
    { title: t('الإعدادات', 'Settings'), icon: Settings, path: '/settings' },
  ];

  // نفس منطقك تماماً
  const role = user?.role?.toLowerCase();
  const links = role === 'admin' ? adminLinks : role === 'manager' ? managerLinks : userLinks;

  const roleLabel =
    role === 'admin'
      ? t('مدير عام', 'Admin')
      : role === 'manager'
      ? t('مدير', 'Manager')
      : t('مستخدم', 'User');

  return (
    <aside
      className={`w-64 bg-card h-screen flex flex-col animate-fade-in ${
        isRTL ? 'border-r border-border' : 'border-l border-border'
      }`}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Logo Section */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className="text-xl font-cairo font-bold text-primary">
              {t('وثّق', 'Wathiq')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('نظام إدارة الوثائق', 'Document management system')}
            </p>
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-muted/50 rounded-lg p-3 hover-lift">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.name?.charAt(0) ?? '?'}
              </AvatarFallback>
            </Avatar>

            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-semibold text-sm truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link, index) => (
          <NavLink
            key={link.path}
            to={link.path}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all animate-stagger"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary/90"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <link.icon className="w-5 h-5" />
            <span className="font-medium">{link.title}</span>
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* Logout Button */}
      <div className="p-4">
        <Button
          variant="outline"
          className={`w-full gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive ${
            isRTL ? 'justify-end' : 'justify-start'
          }`}
          onClick={logout}
        >
          <LogOut className="w-5 h-5" />
          <span>{t('تسجيل الخروج', 'Logout')}</span>
        </Button>
      </div>
    </aside>
  );
};
