export type Role = 'Admin' | 'Manager' | 'User';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;

  department?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;

  // TwoFactor (موجود بالباك)
  twoFactorEnabled?: boolean | null;

  // Optional: موجودة بالباك لكن غالباً ما بترجعها بالـ API
  failedLoginAttempts?: number | null;
  lockoutUntil?: string | null;
};


// حالة المصادقة العامة للتطبيق
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}