import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, AlertCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'login' | 'verify' | 'forgot' | 'reset'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, verify2fa, forgotPassword, resetPassword, pending2faEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const iconGap = language === 'ar' ? 'ml-2' : 'mr-2';

  // 🔗 تسجيل الدخول
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result === 'ok') {
        toast({
          title: t('تم تسجيل الدخول بنجاح', 'Logged in successfully'),
          description: t('مرحباً بك في نظام وثّق', 'Welcome to Wathiq system'),
        });
        navigate('/dashboard');
      } else if (result === '2fa') {
        toast({
          title: t('مطلوب رمز التحقق', 'Verification code required'),
          description: t(
            'تم إرسال رمز المصادقة الثنائية إلى بريدك الإلكتروني.',
            'A 2FA code has been sent to your email.'
          ),
        });
        setStep('verify');
      } else {
        setError(t('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'Invalid email or password'));
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message;
        setError(msg ?? t('فشل تسجيل الدخول', 'Login failed'));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('حدث خطأ غير معروف أثناء تسجيل الدخول', 'An unknown error occurred during login'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🔐 تأكيد رمز 2FA
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const ok = await verify2fa(pending2faEmail ?? email, code);
      if (ok) {
        toast({ title: t('تم التحقق', 'Verified'), description: t('تم تسجيل الدخول بنجاح', 'Logged in successfully') });
        navigate('/dashboard');
      } else {
        setError(t('رمز التحقق غير صحيح', 'Invalid verification code'));
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message;
        setError(msg ?? t('فشل التحقق', 'Verification failed'));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('حدث خطأ غير معروف أثناء التحقق', 'An unknown error occurred during verification'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🔗 نسيت كلمة المرور
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await forgotPassword(email);
      console.log('Reset code response:', result);
      toast({
        title: t('تم إرسال الكود', 'Code sent'),
        description: t(
          'تحقق من بريدك الإلكتروني وأدخل الكود مع كلمة المرور الجديدة',
          'Check your email and enter the code with the new password'
        ),
      });
      setStep('reset');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message;
        setError(msg ?? t('فشل إرسال الكود', 'Failed to send code'));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('حدث خطأ غير معروف أثناء إرسال الكود', 'An unknown error occurred while sending the code'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🔗 إعادة تعيين كلمة المرور
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('كلمة المرور غير متطابقة', 'Passwords do not match'));
      return;
    }

    setIsLoading(true);

    try {
      console.log('Email:', email);
      console.log('Code:', code);
      console.log('NewPassword:', newPassword);

      await resetPassword(email, code, newPassword);
      toast({
        title: t('تم تغيير كلمة المرور', 'Password changed'),
        description: t('يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة', 'You can now login with the new password'),
      });
      setStep('login');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message;
        setError(msg ?? t('فشل إعادة تعيين كلمة المرور', 'Failed to reset password'));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('حدث خطأ غير معروف أثناء إعادة تعيين كلمة المرور', 'An unknown error occurred while resetting password'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#3B5978] p-4"
      style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
    >
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8 animate-bounce-in">
          <div className="inline-flex items-center justify-center  mb-4 bg-transparent">
            <img src="/logo.png" alt={t('شعار وثّق', 'Wathiq logo')} className="object-contain w-full h-full" />
          </div>
          <h1 className="text-4xl font-cairo font-bold text-[#15253E] mb-5">{t('وثّق', 'Wathiq')}</h1>
          <p className="text-white">{t('نظام إدارة الوثائق الإلكترونية', 'Electronic document management system')}</p>
        </div>

        <Card className="border-border/50 shadow-xl animate-fade-in">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-cairo">
              {step === 'login' && t('تسجيل الدخول', 'Login')}
              {step === 'verify' && t('تأكيد رمز التحقق', 'Verify code')}
              {step === 'forgot' && t('نسيت كلمة المرور', 'Forgot password')}
              {step === 'reset' && t('إعادة تعيين كلمة المرور', 'Reset password')}
            </CardTitle>
            <CardDescription>
              {step === 'login' && t('أدخل بياناتك للوصول إلى حسابك', 'Enter your credentials to access your account')}
              {step === 'verify' && t('أدخل رمز المصادقة الثنائية المرسل إلى بريدك', 'Enter the 2FA code sent to your email')}
              {step === 'forgot' && t('أدخل بريدك الإلكتروني لإرسال الكود', 'Enter your email to receive a code')}
              {step === 'reset' && t('أدخل الكود وكلمة المرور الجديدة', 'Enter the code and your new password')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-slide-up">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            {step === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> {t('البريد الإلكتروني', 'Email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" /> {t('كلمة المرور', 'Password')}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                  {isLoading ? t('جاري التحقق...', 'Verifying...') : t('تسجيل الدخول', 'Login')}
                </Button>

                <div className="text-center mt-4">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setStep('forgot')}
                  >
                    {t('نسيت كلمة المرور؟', 'Forgot password?')}
                  </Button>
                </div>
              </form>
            )}

            {/* 2FA Verify Form */}
            {step === 'verify' && (
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verify-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> {t('البريد الإلكتروني', 'Email')}
                  </Label>
                  <Input id="verify-email" type="email" value={pending2faEmail ?? email} disabled dir="ltr" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verify-code" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" /> {t('رمز التحقق', 'Verification code')}
                  </Label>
                  <Input
                    id="verify-code"
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                  {isLoading ? t('جاري التحقق...', 'Verifying...') : t('تأكيد', 'Confirm')}
                </Button>

                <div className="text-center mt-4">
                  <Button type="button" variant="link" onClick={() => setStep('login')}>
                    {t('رجوع', 'Back')}
                  </Button>
                </div>
              </form>
            )}

            {/* Forgot Password Form */}
            {step === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> {t('البريد الإلكتروني', 'Email')}
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                  {isLoading ? t('جاري الإرسال...', 'Sending...') : t('إرسال الكود', 'Send code')}
                </Button>

                <div className="text-center mt-4">
                  <Button type="button" variant="link" onClick={() => setStep('login')}>
                    {t('رجوع لتسجيل الدخول', 'Back to login')}
                  </Button>
                </div>
              </form>
            )}

            {/* Reset Password Form */}
            {step === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="flex items-center gap-2">
                    {t('الكود', 'Code')}
                  </Label>
                  <Input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)} required dir="ltr" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" /> {t('كلمة المرور الجديدة', 'New password')}
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" /> {t('تأكيد كلمة المرور', 'Confirm password')}
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                  {isLoading ? t('جاري التغيير...', 'Updating...') : t('إعادة تعيين كلمة المرور', 'Reset password')}
                </Button>

                <div className="text-center mt-4">
                  <Button type="button" variant="link" onClick={() => setStep('login')}>
                    {t('رجوع لتسجيل الدخول', 'Back to login')}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-white mt-6">
          © 2025 {t('وثّق - جميع الحقوق محفوظة', 'Wathiq - All rights reserved')}
        </p>
      </div>
    </div>
  );
}
