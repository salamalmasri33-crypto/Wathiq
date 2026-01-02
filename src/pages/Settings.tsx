import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import api from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useToast } from '@/hooks/use-toast';
import { User as UserIcon, Lock, Shield, Languages, Moon, Sun } from 'lucide-react';

/* =======================
   Types
======================= */
type UiLanguage = 'en' | 'ar';
type UiTheme = 'light' | 'dark';

type TwoFactorStatusResponse = { enabled: boolean };

type UpdateProfilePayload = { name: string; email: string };
type ChangePasswordPayload = { currentPassword: string; newPassword: string };

type AuthUserShape = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string | null;
  avatar?: string | null;
  twoFactorEnabled?: boolean;
};

/* =======================
   Helpers
======================= */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function normalize2FA(data: unknown): TwoFactorStatusResponse | null {
  if (!isRecord(data)) return null;
  const enabled = data.enabled;
  if (typeof enabled !== 'boolean') return null;
  return { enabled };
}
function applyTheme(theme: UiTheme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}
function applyLanguage(lang: UiLanguage) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.body.dir = dir;
}

/* =======================
   Component
======================= */
export default function Settings() {
  const { toast } = useToast();
  const { user, token, updateLocalUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const typedUser: AuthUserShape | null = (user as unknown as AuthUserShape) ?? null;

  const [fullName, setFullName] = useState<string>(typedUser?.name ?? '');
  const [email, setEmail] = useState<string>(typedUser?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [theme, setTheme] = useState<UiTheme>('light');
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const display = useMemo(() => {
    return {
      name: typedUser?.name ?? '',
      email: typedUser?.email ?? '',
      role: typedUser?.role ?? '',
      department: typedUser?.department ?? null,
      avatar: typedUser?.avatar ?? null,
      twoFactorEnabledLocal: typedUser?.twoFactorEnabled ?? null,
    };
  }, [typedUser?.name, typedUser?.email, typedUser?.role, typedUser?.department, typedUser?.avatar, typedUser?.twoFactorEnabled]);

  useEffect(() => {
    setFullName(typedUser?.name ?? '');
    setEmail(typedUser?.email ?? '');
  }, [typedUser?.name, typedUser?.email]);

  useEffect(() => {
    const savedLang = localStorage.getItem('ui_language');
    const savedTheme = localStorage.getItem('ui_theme');

    if (savedLang === 'ar' || savedLang === 'en') {
      setLanguage(savedLang as UiLanguage);
      applyLanguage(savedLang as UiLanguage);
    } else {
      applyLanguage('en');
    }

    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme as UiTheme);
      applyTheme(savedTheme as UiTheme);
    } else {
      applyTheme('light');
    }
  }, []);

  useEffect(() => {
    const load2FA = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.get('/users/2fa', { headers: { Authorization: `Bearer ${token}` } });
        const parsed = normalize2FA(res.data);
        if (parsed) setTwoFactorEnabled(parsed.enabled);
      } catch (e) {
        console.error('Load 2FA failed', e);
      } finally {
        setLoading(false);
      }
    };
    load2FA();
  }, [token]);

  const handleSaveProfile = async () => {
    if (!token) {
      toast({ title: t("خطأ","Error"), description: t("يرجى تسجيل الدخول مجدداً.","Please login again.") });
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      toast({ title: t("تنبيه","Warning"), description: t("الاسم والبريد مطلوبين.","Name and email are required.") });
      return;
    }
    setSavingProfile(true);
    try {
      const payload: UpdateProfilePayload = { name: fullName.trim(), email: email.trim() };
      await api.put('/users/profile', payload, { headers: { Authorization: `Bearer ${token}` } });
      updateLocalUser({ name: payload.name, email: payload.email });
      toast({ title: t("تم الحفظ","Saved"), description: t("تم تحديث معلومات الملف الشخصي بنجاح.","Profile updated successfully.") });
    } catch (e) {
      console.error('Profile update failed', e);
      toast({ title: t("فشل الحفظ","Failed"), description: t("تعذر تحديث الملف الشخصي.","Could not update profile.") });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) {
      toast({ title: t("خطأ","Error"), description: t("يرجى تسجيل الدخول مجدداً.","Please login again.") });
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: t("تنبيه","Warning"), description: t("املأ جميع حقول كلمة المرور.","Fill all password fields.") });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("تنبيه","Warning"), description: t("كلمة المرور الجديدة وتأكيدها غير متطابقين.","Passwords do not match.") });
      return;
    }
    setChangingPassword(true);
    try {
      const payload: ChangePasswordPayload = { currentPassword, newPassword };
      await api.put('/users/change-password', payload, { headers: { Authorization: `Bearer ${token}` } });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast({ title: t("تم التحديث","Updated"), description: t("تم تغيير كلمة المرور بنجاح.","Password changed successfully.") });
    } catch (e) {
      console.error('Change password failed', e);
      toast({ title: t("فشل التحديث","Failed"), description: t("تعذر تغيير كلمة المرور.","Could not change password.") });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggleTwoFactor = async (next: boolean) => {
    if (!token) {
      toast({ title: t("خطأ","Error"), description: t("يرجى تسجيل الدخول مجدداً.","Please login again.") });
      return;
    }
    setTwoFactorLoading(true);
    try {
      await api.put('/users/2fa', { enabled: next }, { headers: { Authorization: `Bearer ${token}` } });
      setTwoFactorEnabled(next);
      updateLocalUser({ twoFactorEnabled: next });
      toast({ title: t("تم التحديث","Updated"), description: next ? t("تم تفعيل المصادقة الثنائية.","2FA enabled.") : t("تم إيقاف المصادقة الثنائية.","2FA disabled.") });
    } catch (e) {
      console.error('2FA toggle failed', e);
      toast({ title: t("فشل التحديث","Failed"), description: t("تعذر تحديث المصادقة الثنائية.","Could not update 2FA.") });
    } finally {
      setTwoFactorLoading(false);
    }
  };

    const handleChangeLanguage = (next: UiLanguage) => {
    setLanguage(next);
    localStorage.setItem('ui_language', next);
    applyLanguage(next);
    toast({
      title: t("تم التحديث","Updated"),
      description: next === 'ar' ? t("تم اختيار العربية.","Arabic selected.") : t("تم اختيار الإنجليزية.","English selected."),
    });
  };

  const handleToggleTheme = (nextDark: boolean) => {
    const nextTheme: UiTheme = nextDark ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('ui_theme', nextTheme);
    applyTheme(nextTheme);
    toast({
      title: t("تم التحديث","Updated"),
      description: nextTheme === 'dark' ? t("تم تفعيل الوضع الليلي.","Dark mode enabled.") : t("تم تفعيل الوضع النهاري.","Light mode enabled."),
    });
  };

  return (
    <div className="p-6 animate-fade-in" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <div className="mb-6">
        <h1 className="text-3xl font-cairo font-bold text-foreground mb-2">
          {t("الإعدادات","Settings")}
        </h1>
        <p className="text-muted-foreground">
          {t("إدارة إعدادات الحساب","Manage account settings")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" />
                {t("الملف الشخصي","Profile")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={display.avatar ?? undefined} alt={display.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {(display.name || '?').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" disabled>
                  {t("تغيير الصورة","Change photo")}
                </Button>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">{t("الاسم الكامل","Full name")}</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!token} />
                </div>
                <div>
                  <Label htmlFor="email">{t("البريد الإلكتروني","Email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!token} dir="ltr" />
                </div>
              </div>
              {display.department && (
                <div>
                  <Label htmlFor="department">{t("القسم","Department")}</Label>
                  <Input id="department" value={display.department} disabled />
                </div>
              )}
              <Button onClick={handleSaveProfile} className="gradient-hero" disabled={savingProfile || !token}>
                {savingProfile ? t("جاري الحفظ...","Saving...") : t("حفظ التغييرات","Save changes")}
              </Button>
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                {t("تغيير كلمة المرور","Change password")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">{t("كلمة المرور الحالية","Current password")}</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={!token} />
              </div>
              <div>
                <Label htmlFor="new-password">{t("كلمة المرور الجديدة","New password")}</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={!token} />
              </div>
              <div>
                <Label htmlFor="confirm-password">{t("تأكيد كلمة المرور","Confirm new password")}</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={!token} />
              </div>
              <Button onClick={handleChangePassword} className="gradient-hero" disabled={changingPassword || !token}>
                {changingPassword ? t("جاري التحديث...","Updating...") : t("تحديث كلمة المرور","Update password")}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* 2FA */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {t("الأمان","Security")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="two-factor">{t("المصادقة الثنائية","Two-factor authentication")}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("تفعيل/تعطيل المصادقة الثنائية لحسابك","Enable/disable 2FA for your account")}
                  </p>
                </div>
                <div dir="ltr" className="flex items-center">
                  <Switch id="two-factor" checked={twoFactorEnabled} onCheckedChange={(v) => void handleToggleTwoFactor(v)} disabled={twoFactorLoading || !token || loading} />
                </div>
              </div>
              {twoFactorLoading && (
                <p className="text-xs text-muted-foreground">{t("جاري تحديث المصادقة الثنائية...","Updating 2FA...")}</p>
              )}
            </CardContent>
          </Card>

          {/* Language */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-primary" />
                {t("اللغة","Language")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label>{t("لغة الواجهة","UI language")}</Label>
              <Select value={language} onValueChange={(v) => handleChangeLanguage(v as UiLanguage)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر اللغة","Select language")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Theme */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                {t("المظهر","Theme")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="theme-toggle">{t("الوضع الليلي","Dark mode")}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("بدّل بين الوضع النهاري والليلي","Toggle dark/light mode")}
                  </p>
                </div>
                <div dir="ltr" className="flex items-center">
                  <Switch id="theme-toggle" checked={theme === 'dark'} onCheckedChange={(v) => handleToggleTheme(v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}