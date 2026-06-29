'use client';

import { useMemo, useState } from 'react';
import { UserCog, Plus, Search, ShieldCheck, Ban, Trash2, Pencil } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { AdminUser, Role } from '@/lib/types';

const PAGE_SIZE = 20;

const ROLES: (Role | 'ALL')[] = ['ALL', 'STUDENT', 'TEACHER', 'MODERATOR', 'ADMIN'];
const roleVariant: Record<string, 'default' | 'accent' | 'success' | 'muted'> = {
  ADMIN: 'accent', MODERATOR: 'default', TEACHER: 'success', STUDENT: 'muted',
};

export default function AdminUsersPage() {
  const [role, setRole] = useState<Role | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const path = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (role !== 'ALL') p.set('role', role);
    if (q) p.set('q', q);
    return `/users?${p.toString()}`;
  }, [role, q, page]);
  const { data, loading, refetch } = useApi<AdminUser[]>(path);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Students, teachers, moderators, and admins."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add user</Button>}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name or email…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button key={r} onClick={() => { setRole(r); setPage(1); }}
              className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors', role === r ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-secondary')}>
              {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-72" />
      ) : data && data.length > 0 ? (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="hidden grid-cols-[1fr_120px_110px_90px] gap-4 border-b px-5 py-3 text-xs font-medium text-muted-foreground sm:grid">
                <span>User</span><span>Role</span><span>Status</span><span className="text-right">Actions</span>
              </div>
              {data.map((u) => (
                <div key={u.id} className="grid grid-cols-1 gap-3 border-b px-5 py-3 text-sm last:border-0 sm:grid-cols-[1fr_120px_110px_90px] sm:items-center">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email || u.phone || '—'}</p>
                    </div>
                  </div>
                  <div><Badge variant={roleVariant[u.role] ?? 'muted'}>{u.role}</Badge></div>
                  <div className="flex gap-1.5">
                    {u.isBanned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="success">Active</Badge>}
                    {u.isVerified && <ShieldCheck className="h-4 w-4 text-success" aria-label="Verified" />}
                  </div>
                  <div className="flex justify-start gap-1 sm:justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(u)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {data.length} on this page</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span>Page {page}</span>
              <Button variant="outline" size="sm" disabled={data.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={UserCog} title="No users found" desc="Try a different role or search term." />
      )}

      {creating && <CreateUserDialog onClose={() => setCreating(false)} onDone={() => { setCreating(false); refetch(); }} />}
      {editing && <EditUserDialog user={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); refetch(); }} />}
    </div>
  );
}

function CreateUserDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'STUDENT' as Role });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (form.name.trim().length < 2 || form.password.length < 8) return toast('Name and an 8+ char password are required', 'error');
    setSaving(true);
    try {
      await apiPost('/users', {
        name: form.name, role: form.role, password: form.password,
        email: form.email || undefined, phone: form.phone || undefined,
      });
      toast('User created', 'success');
      onDone();
    } catch (e: any) {
      toast(e?.message || 'Could not create user', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">Add user</h2>
      <div className="mt-5 space-y-4">
        <div><Label>Name</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Email</Label><Input type="email" className="mt-1.5" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Role</Label>
            <Select className="mt-1.5" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {(['STUDENT', 'TEACHER', 'MODERATOR', 'ADMIN'] as Role[]).map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div><Label>Password</Label><Input type="password" className="mt-1.5" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        </div>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create user'}</Button>
    </Dialog>
  );
}

function EditUserDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [role, setRole] = useState<Role>(user.role);
  const [isBanned, setIsBanned] = useState(!!user.isBanned);
  const [isVerified, setIsVerified] = useState(!!user.isVerified);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiPatch(`/users/${user.id}`, { role, isBanned, isVerified });
      toast('User updated', 'success');
      onDone();
    } catch (e: any) {
      toast(e?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await apiDelete(`/users/${user.id}`);
      toast('User removed', 'success');
      onDone();
    } catch (e: any) {
      toast(e?.message || 'Delete failed', 'error');
      setDeleting(false);
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-md">
      <div className="flex items-center gap-3 pr-6">
        <Avatar name={user.name} />
        <div><h2 className="font-semibold">{user.name}</h2><p className="text-xs text-muted-foreground">{user.email || user.phone}</p></div>
      </div>
      <div className="mt-5 space-y-4">
        <div><Label>Role</Label>
          <Select className="mt-1.5" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(['STUDENT', 'TEACHER', 'MODERATOR', 'ADMIN'] as Role[]).map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
          <span className="flex items-center gap-2"><Ban className="h-4 w-4 text-destructive" /> Banned</span>
          <input type="checkbox" checked={isBanned} onChange={(e) => setIsBanned(e.target.checked)} className="h-4 w-4" />
        </label>
        <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Verified</span>
          <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="h-4 w-4" />
        </label>
      </div>
      <div className="mt-6 flex gap-2">
        <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save changes'}</Button>
        <Button variant="destructive" onClick={remove} disabled={deleting} aria-label="Delete user">{deleting ? <Spinner /> : <Trash2 className="h-4 w-4" />}</Button>
      </div>
    </Dialog>
  );
}
