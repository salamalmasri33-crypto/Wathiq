export type Role = 'Admin' | 'Manager' | 'User';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type LoginResponse =
  | { requires2FA: true; message?: string }
  | { requires2FA: false; token: string; user: AuthUser; message?: string };

export type Verify2FAResponse = {
  requires2FA: false;
  token: string;
  user: AuthUser;
  message?: string;
};
