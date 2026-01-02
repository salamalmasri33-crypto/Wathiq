import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import api from '@/config/api';
import { User, AuthState } from '@/types/user';

type LoginResult = 'ok' | '2fa' | 'fail';

type LoginResponse = {
  requires2FA?: boolean;
  token?: string;
  user?: User;
  message?: string;
};

type Verify2FAResponse = {
  token?: string;
  user?: User;
  message?: string;
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2fa: (email: string, code: string) => Promise<boolean>;

  // ✅ needed by Settings.tsx
  updateLocalUser: (patch: Partial<User>) => void;

  requires2fa: boolean;
  pending2faEmail?: string;

  logout: () => Promise<void>;
  checkPermission: (allowedRoles: string[]) => boolean;

  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function safeParseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    // we accept it as User shape; your app owns this data in localStorage
    return parsed as User;
  } catch {
    return null;
  }
}

function ensureString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function ensureRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function extractMessage(data: unknown): string | null {
  // This handles:
  // - { message: "..." }
  // - "..."
  // - anything else -> null
  if (typeof data === 'string') return data;
  if (ensureRecord(data) && typeof data.message === 'string') return data.message;
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: undefined,
    isAuthenticated: false,
    isLoading: true,
  });

  const [requires2fa, setRequires2fa] = useState(false);
  const [pending2faEmail, setPending2faEmail] = useState<string | undefined>(undefined);

  // ✅ Load session on first mount
  useEffect(() => {
    const storedUser = safeParseUser(localStorage.getItem('user'));
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setAuthState({
        user: storedUser,
        token: storedToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // ✅ Keep localStorage in sync for user updates (Settings uses this)
  const updateLocalUser = (patch: Partial<User>) => {
    setAuthState(prev => {
      if (!prev.user) return prev;

      const updatedUser: User = {
        ...prev.user,
        ...patch,
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
  };

  // 🔗 Login
  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });

      // Step 1: requires 2FA
      if (response.data?.requires2FA === true) {
        setRequires2fa(true);
        setPending2faEmail(email);
        return '2fa';
      }

      // Step 2: normal login
      const token = response.data?.token;
      const user = response.data?.user;

      if (token && user) {
        const userWithLastLogin: User = {
          ...user,
          // keep same behaviour you had; if lastLogin is in your User type it's fine
          // if it's not, TS will complain — remove next line in that case
          
        };

        localStorage.setItem('user', JSON.stringify(userWithLastLogin));
        localStorage.setItem('token', token);

        setAuthState({
          user: userWithLastLogin,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        setRequires2fa(false);
        setPending2faEmail(undefined);

        return 'ok';
      }

      return 'fail';
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessage(err.response?.data) ?? err.message;
        console.error('Login failed:', msg);
      } else {
        console.error('Login failed:', String(err));
      }
      return 'fail';
    }
  };

  // 🔗 Verify 2FA
  const verify2fa = async (email: string, code: string): Promise<boolean> => {
    try {
      // Your backend DTO likely expects Email/Code with PascalCase (كما كان عندك)
      const response = await api.post<Verify2FAResponse>('/auth/verify-2fa', {
        Email: email,
        Code: code,
      });

      const token = response.data?.token;
      const user = response.data?.user;

      if (token && user) {
        const userWithLastLogin: User = {
          ...user,
          
        };

        localStorage.setItem('user', JSON.stringify(userWithLastLogin));
        localStorage.setItem('token', token);

        setAuthState({
          user: userWithLastLogin,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        setRequires2fa(false);
        setPending2faEmail(undefined);

        return true;
      }

      return false;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessage(err.response?.data) ?? err.message;
        console.error('Verify 2FA failed:', msg);
      } else {
        console.error('Verify 2FA failed:', String(err));
      }
      return false;
    }
  };

  // 🔗 Logout (clean all)
  const logout = async (): Promise<void> => {
    try {
      const token = authState.token;
      if (token) {
        await api.post(
          '/auth/logout',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessage(err.response?.data) ?? err.message;
        console.error('Logout failed:', msg);
      } else {
        console.error('Logout failed:', String(err));
      }
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      setAuthState({
        user: null,
        token: undefined,
        isAuthenticated: false,
        isLoading: false,
      });

      setRequires2fa(false);
      setPending2faEmail(undefined);
    }
  };

  // 🔗 Check permission
  const checkPermission = (allowedRoles: string[]): boolean => {
    const currentUser = authState.user;
    if (!currentUser) return false;

    const role = (currentUser.role ?? '').toLowerCase();
    return allowedRoles.map(r => r.toLowerCase()).includes(role);
  };

  // 🔗 Forgot password
  const forgotPassword = async (email: string): Promise<string> => {
    const response = await api.post('/auth/password/forgot', { email });
    // backend might return string or {message}
    return extractMessage(response.data) ?? 'Request sent';
  };

  // 🔗 Reset password
  const resetPassword = async (email: string, code: string, newPassword: string): Promise<string> => {
    const response = await api.post('/auth/password/reset', {
      Email: email,
      Code: code,
      NewPassword: newPassword,
    });
    return extractMessage(response.data) ?? 'Password reset';
  };

  // Memoize context value (optional but nice)
  const value = useMemo<AuthContextType>(
    () => ({
      ...authState,
      login,
      verify2fa,
      updateLocalUser,
      requires2fa,
      pending2faEmail,
      logout,
      checkPermission,
      forgotPassword,
      resetPassword,
    }),
    [authState, requires2fa, pending2faEmail]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ✅ hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
