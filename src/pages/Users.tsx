import { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import api from '@/config/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, Edit, Trash2 } from 'lucide-react';

import type { User, UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

/* =======================
   Helpers
======================= */
function logAxiosError(error: unknown) {
  const err = error as AxiosError<unknown>;
  if (err?.response?.data) console.error(err.response.data);
  else console.error(error);
}

export const Users = () => {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('User');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get<User[]>('/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data || []);
      } catch (error: unknown) {
        console.error('❌ فشل جلب المستخدمين', error);
      }
    };

    if (token) fetchUsers();
  }, [token]);

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      (user.name ?? '').toLowerCase().includes(term) ||
      (user.email ?? '').toLowerCase().includes(term) ||
      (user.department ?? '').toLowerCase().includes(term)
    );
  });

  const getRoleName = (r: string) => {
    switch (r) {
      case 'Admin':
        return t('مدير عام', 'Admin');
      case 'Manager':
        return t('مدير', 'Manager');
      case 'User':
        return t('مستخدم', 'User');
      default:
        return r;
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setName('');
    setEmail('');
    setDepartment('');
    setPassword('');
    setRole('User');
  };

  const openAddForm = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setDepartment('');
    setPassword('');
    setRole('User');
    setShowForm(true);
  };

  const handleAddUser = async () => {
    try {
      const response = await api.post<User>(
        '/users/add',
        { name, email, password, role, department },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers((prev) => [...prev, response.data]);
      resetForm();
      alert(t('✅ تمت إضافة المستخدم بنجاح', '✅ User added successfully'));
    } catch (error: unknown) {
      logAxiosError(error);
      alert(t('❌ فشل إضافة المستخدم', '❌ Failed to add user'));
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const response = await api.put(
        `/users/edit/${editingUser.id}`,
        { name, email, role, department },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...response.data } : u))
      );

      resetForm();
      alert(t('✏️ تم تعديل المستخدم بنجاح', '✏️ User updated successfully'));
    } catch (error: unknown) {
      logAxiosError(error);
      alert(t('❌ فشل تعديل المستخدم', '❌ Failed to update user'));
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.delete(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      alert(t('🗑️ تم حذف المستخدم بنجاح', '🗑️ User deleted successfully'));
    } catch (error: unknown) {
      logAxiosError(error);
      alert(t('❌ فشل حذف المستخدم', '❌ Failed to delete user'));
    }
  };

  const handleAssignRole = async (id: string, newRole: UserRole) => {
    try {
      await api.put(
        `/users/${id}/assign-role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
      );

      alert(
        t(
          `✅ تم تغيير دور المستخدم إلى ${getRoleName(newRole)}`,
          `✅ User role changed to ${getRoleName(newRole)}`
        )
      );
    } catch (error: unknown) {
      logAxiosError(error);
      alert(t('❌ فشل تغيير الدور', '❌ Failed to change role'));
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-cairo font-bold text-foreground mb-2">
            {t('إدارة المستخدمين', 'User Management')}
          </h1>
          <p className="text-muted-foreground">
            {t('إدارة حسابات المستخدمين وصلاحياتهم', 'Manage user accounts and roles')}
          </p>
        </div>

        <Button className="gradient-hero" onClick={openAddForm}>
          <UserPlus className="w-4 h-4 ml-2" />
          {t('إضافة مستخدم جديد', 'Add new user')}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <Card className="w-full max-w-md h-[65vh] overflow-y-auto rounded-lg shadow-2xl animate-fade-in">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">
                {editingUser ? t('تعديل مستخدم', 'Edit user') : t('إضافة مستخدم جديد', 'Add new user')}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <Input
                placeholder={t('الاسم الكامل', 'Full name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />

              <Input
                placeholder={t('البريد الإلكتروني', 'Email')}
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              <Input
                placeholder={t('القسم', 'Department')}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                autoComplete="organization"
              />

              {!editingUser && (
                <Input
                  placeholder={t('كلمة المرور', 'Password')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              )}

              <select
                className="border rounded px-3 py-2 w-full"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="User">{t('مستخدم', 'User')}</option>
                <option value="Manager">{t('مدير', 'Manager')}</option>
                <option value="Admin">{t('مدير عام', 'Admin')}</option>
              </select>

              <div className="flex justify-between gap-4 mt-6">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  {t('إلغاء', 'Cancel')}
                </Button>
                <Button
                  onClick={editingUser ? handleEditUser : handleAddUser}
                  className="flex-1 gradient-hero"
                >
                  {editingUser ? t('تعديل المستخدم', 'Update user') : t('حفظ المستخدم', 'Save user')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card className="mb-6 hover-lift">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('البحث عن مستخدم.', 'Search for a user.')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle>
            {t('قائمة المستخدمين', 'Users list')} ({filteredUsers.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Table className="w-full border rounded-lg shadow-sm overflow-hidden">
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3 text-center font-semibold">
                  {t('المستخدم', 'User')}
                </TableHead>
                <TableHead className="px-4 py-3 text-center font-semibold">
                  {t('البريد الإلكتروني', 'Email')}
                </TableHead>
                <TableHead className="px-4 py-3 text-center font-semibold">
                  {t('الدور', 'Role')}
                </TableHead>
                <TableHead className="px-4 py-3 text-center font-semibold">
                  {t('القسم', 'Department')}
                </TableHead>
                <TableHead className="px-4 py-3 text-center font-semibold">
                  {t('الحالة', 'Status')}
                </TableHead>
                <TableHead className="px-4 py-3 text-center font-semibold">
                  {t('الإجراءات', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="px-4 py-3 text-center">
                    <div className="flex items-center gap-3 justify-center">
                      <Avatar>
                        <AvatarImage src={user.avatar ?? ''} alt={user.name ?? 'user'} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user.name?.charAt(0) ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name ?? '-'}</span>
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-center">{user.email ?? '-'}</TableCell>

                  <TableCell className="px-4 py-3 text-center">
                    <select
                      className="border rounded px-2 py-1 text-black"
                      value={user.role ?? 'User'}
                      onChange={(e) => handleAssignRole(user.id, e.target.value as UserRole)}
                    >
                      <option value="User">{t('مستخدم', 'User')}</option>
                      <option value="Manager">{t('مدير', 'Manager')}</option>
                      <option value="Admin">{t('مدير عام', 'Admin')}</option>
                    </select>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-center">{user.department ?? '-'}</TableCell>

                  <TableCell className="px-4 py-3 text-center">
                    <Badge className={user.isActive ? 'bg-green-500' : 'bg-red-500'}>
                      {user.isActive ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                    </Badge>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingUser(user);
                          setName(user.name ?? '');
                          setEmail(user.email ?? '');
                          setDepartment(user.department ?? '');
                          setRole(user.role ?? 'User');
                          setPassword('');
                          setShowForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
