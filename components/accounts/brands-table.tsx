'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createAccount, resetUserPassword } from '@/lib/actions/accounts';
import { date } from '@/lib/format';
import { Badge, Button, Empty, Field, Input, Notice, Panel, PanelTitle, Textarea } from '../ui/primitives';
import { ActionButton, CopyButton, useRpc } from '../ui/client';
import { Dialog } from '../ui/dialog';
import { Building2, KeyRound, Pencil, UserPlus } from '../ui/icons';

export function BrandsTable({ brands, counts, admins }: { brands: any[]; counts: Record<string, { total: number; active: number }>; admins: any[] }) {
  const [create, setCreate] = useState<'' | 'BRAND' | 'ADMIN'>('');
  const [edit, setEdit] = useState<any>(null);
  const [cred, setCred] = useState<{ email: string; password: string } | null>(null);
  const [isPending, start] = useTransition();
  const router = useRouter();

  const reset = (userId: string, email: string) =>
    start(async () => {
      const r = await resetUserPassword(userId);
      if (!r.ok) return void toast.error(r.message);
      setCred({ email, password: r.tempPassword! });
    });

  return (
    <div className="space-y-8">
      <Panel padded={false}>
        <div className="flex items-center justify-between px-5 pt-5">
          <PanelTitle title="Brand" className="mb-0" />
          <Button size="sm" onClick={() => setCreate('BRAND')}><UserPlus className="size-4" />Tambah brand</Button>
        </div>
        {brands.length === 0 ? (
          <Empty icon={<Building2 className="size-5" />} title="Belum ada brand" description="Tambahkan brand sebelum membuat campaign untuk brand tersebut." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-y border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-semibold">Perusahaan</th><th className="px-3 py-3 font-semibold">PIC</th><th className="px-3 py-3 font-semibold">Login</th>
                <th className="px-3 py-3 text-right font-semibold">Campaign</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3" />
              </tr></thead>
              <tbody className="divide-y divide-line-2">
                {brands.map((b) => (
                  <tr key={b.user_id}>
                    <td className="px-5 py-3.5"><p className="font-semibold">{b.company_name}</p><p className="text-xs text-muted">{b.industry || '—'}</p></td>
                    <td className="px-3 py-3.5"><p>{b.pic_name}</p><p className="text-xs text-muted">{b.profile.email}{b.pic_phone ? ` — +${b.pic_phone}` : ''}</p></td>
                    <td className="px-3 py-3.5 text-xs text-muted">{b.profile.last_login ? date(b.profile.last_login) : 'Belum pernah'}</td>
                    <td className="px-3 py-3.5 text-right tabular">{counts[b.user_id]?.active ?? 0} aktif / {counts[b.user_id]?.total ?? 0}</td>
                    <td className="px-3 py-3.5">{b.profile.status === 'ACTIVE' ? <Badge tone="moss">Aktif</Badge> : <Badge>Nonaktif</Badge>}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEdit(b)} aria-label="Edit"><Pencil className="size-4" /></Button>
                        <Button size="sm" variant="ghost" loading={isPending} onClick={() => reset(b.user_id, b.profile.email)} aria-label="Reset password" title="Reset password"><KeyRound className="size-4" /></Button>
                        <ActionButton fn="set_user_status" variant="ghost" args={{ p_user: b.user_id, p_status: b.profile.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }}
                          success={b.profile.status === 'ACTIVE' ? 'Akun dinonaktifkan' : 'Akun diaktifkan'}
                          confirm={b.profile.status === 'ACTIVE' ? { title: 'Nonaktifkan akun brand?', body: 'Brand tidak dapat masuk sampai akun diaktifkan kembali. Data campaign tetap tersimpan.', cta: 'Nonaktifkan', danger: true } : undefined}>
                          {b.profile.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel padded={false}>
        <div className="flex items-center justify-between px-5 pt-5">
          <PanelTitle title="Admin" description="Tim internal dengan akses penuh." className="mb-0" />
          <Button size="sm" variant="secondary" onClick={() => setCreate('ADMIN')}><UserPlus className="size-4" />Tambah admin</Button>
        </div>
        <ul className="mt-4 divide-y divide-line-2 border-t border-line">
          {admins.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1"><b>{a.full_name}</b> <span className="text-muted">{a.email}</span></span>
              <span className="text-xs text-muted">{a.last_login ? `Login ${date(a.last_login)}` : 'Belum pernah login'}</span>
              {a.status !== 'ACTIVE' && <Badge>Nonaktif</Badge>}
            </li>
          ))}
        </ul>
      </Panel>

      {create && <CreateDialog role={create} onClose={() => setCreate('')} onCreated={(c) => { setCreate(''); if (c) setCred(c); router.refresh(); }} />}
      {edit && <EditBrandDialog b={edit} onClose={() => setEdit(null)} />}
      <Dialog open={!!cred} onClose={() => setCred(null)} title="Kredensial login" width="sm"
        footer={<Button onClick={() => setCred(null)}>Selesai</Button>}>
        <Notice tone="amber" className="mb-4">Password sementara hanya ditampilkan sekali. Kirim lewat kanal yang aman dan minta pengguna menggantinya setelah login.</Notice>
        <div className="space-y-2 rounded-control bg-paper p-4 text-sm">
          <p>Email: <b>{cred?.email}</b></p>
          <p>Password: <b className="tabular">{cred?.password}</b></p>
        </div>
        <CopyButton className="mt-3" value={`Login CreatorHub\nEmail: ${cred?.email}\nPassword: ${cred?.password}\n${typeof window !== 'undefined' ? window.location.origin : ''}/login`} label="Salin kredensial" />
      </Dialog>
    </div>
  );
}

function CreateDialog({ role, onClose, onCreated }: { role: 'BRAND' | 'ADMIN'; onClose: () => void; onCreated: (c: { email: string; password: string } | null) => void }) {
  const [v, setV] = useState({ email: '', full_name: '', company_name: '', industry: '', pic_phone: '', website: '', address: '', password: '' });
  const [pending, start] = useTransition();
  const b = (k: keyof typeof v) => ({ value: v[k], onChange: (e: any) => setV({ ...v, [k]: e.target.value }) });
  return (
    <Dialog open onClose={onClose} title={role === 'BRAND' ? 'Tambah brand' : 'Tambah admin'}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button loading={pending} onClick={() => start(async () => {
          const r = await createAccount({ role, ...v });
          if (!r.ok) return void toast.error(r.message);
          toast.success(role === 'BRAND' ? 'Akun brand dibuat' : 'Akun admin dibuat');
          onCreated(r.tempPassword ? { email: v.email.trim().toLowerCase(), password: r.tempPassword } : null);
        })}>Buat akun</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {role === 'BRAND' && <Field label="Nama perusahaan" required className="sm:col-span-2"><Input {...b('company_name')} /></Field>}
        <Field label={role === 'BRAND' ? 'Nama PIC' : 'Nama'} required><Input {...b('full_name')} /></Field>
        <Field label="Email login" required><Input type="email" {...b('email')} /></Field>
        <Field label="WhatsApp"><Input type="tel" {...b('pic_phone')} placeholder="08xx" /></Field>
        {role === 'BRAND' && <Field label="Industri"><Input {...b('industry')} placeholder="F&B, Beauty, Fintech" /></Field>}
        {role === 'BRAND' && <Field label="Website"><Input type="url" {...b('website')} /></Field>}
        <Field label="Password" hint="Kosongkan untuk membuat password sementara otomatis." className={role === 'BRAND' ? '' : 'sm:col-span-2'}>
          <Input type="text" autoComplete="off" {...b('password')} />
        </Field>
        {role === 'BRAND' && <Field label="Alamat" className="sm:col-span-2"><Textarea rows={2} {...b('address')} /></Field>}
      </div>
    </Dialog>
  );
}

function EditBrandDialog({ b, onClose }: { b: any; onClose: () => void }) {
  const [v, setV] = useState({ company_name: b.company_name, industry: b.industry, pic_name: b.pic_name, pic_phone: b.pic_phone, website: b.website, address: b.address });
  const { call, pending } = useRpc();
  const bind = (k: keyof typeof v) => ({ value: v[k] ?? '', onChange: (e: any) => setV({ ...v, [k]: e.target.value }) });
  return (
    <Dialog open onClose={onClose} title="Edit profil brand"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button loading={pending} onClick={async () => { const r = await call('save_brand_profile', { p: v, p_user: b.user_id }, { success: 'Profil brand disimpan' }); if (r.ok) onClose(); }}>Simpan</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama perusahaan" required className="sm:col-span-2"><Input {...bind('company_name')} /></Field>
        <Field label="Nama PIC"><Input {...bind('pic_name')} /></Field>
        <Field label="WhatsApp PIC"><Input {...bind('pic_phone')} /></Field>
        <Field label="Industri"><Input {...bind('industry')} /></Field>
        <Field label="Website"><Input type="url" {...bind('website')} /></Field>
        <Field label="Alamat" className="sm:col-span-2"><Textarea rows={2} {...bind('address')} /></Field>
      </div>
    </Dialog>
  );
}
