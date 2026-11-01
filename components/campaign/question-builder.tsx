'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PROFILE_FIELDS, QUESTION_TYPES, SCREENING_OPERATORS } from '@/lib/constants';
import type { Question } from '@/lib/types';
import { Button, Checkbox, Field, Input, Select, Textarea, cx } from '../ui/primitives';
import { ChevronDown, Plus, Trash2 } from '../ui/icons';
import { Dialog } from '../ui/dialog';
import { useRpc } from '../ui/client';

export const blankQuestion = (): Question => ({
  question_text: '', question_type: 'SHORT_TEXT', help_text: '', placeholder: '', required: false, options: [],
  profile_field: '', min_value: null, max_value: null, screening_enabled: false, screening_operator: 'EQUALS', screening_value: '', weight: 0,
});

const needsOptions = (t: string) => ['RADIO', 'DROPDOWN', 'CHECKBOX'].includes(t);

export function QuestionBuilder({
  value,
  onChange,
  templates,
}: {
  value: Question[];
  onChange: (q: Question[]) => void;
  templates: { id: string; name: string; questions: Question[] }[];
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(value.length ? null : 0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const { call, pending } = useRpc();

  const update = (i: number, patch: Partial<Question>) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpenIdx(j);
  };
  const add = () => {
    onChange([...value, blankQuestion()]);
    setOpenIdx(value.length);
  };
  const totalWeight = value.filter((q) => q.screening_enabled).reduce((s, q) => s + Number(q.weight || 0), 0);

  return (
    <div>
      {value.length === 0 && (
        <p className="mb-3 rounded-control border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Form pendaftaran sudah memuat nama, WhatsApp, domisili, platform, kategori, dan followers. Tambahkan pertanyaan khusus campaign bila perlu.
        </p>
      )}
      <ol className="space-y-2.5">
        {value.map((q, i) => {
          const open = openIdx === i;
          return (
            <li key={q.id ?? `new-${i}`} className={cx('rounded-control border bg-surface', open ? 'border-iris/40' : 'border-line')}>
              <button type="button" onClick={() => setOpenIdx(open ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="text-xs font-semibold text-faint tabular">{i + 1}</span>
                <span className={cx('flex-1 truncate text-sm font-semibold', !q.question_text && 'text-faint')}>{q.question_text || 'Pertanyaan baru'}</span>
                <span className="hidden text-xs text-muted sm:inline">{QUESTION_TYPES.find((t) => t.value === q.question_type)?.label}</span>
                {q.required && <span className="text-xs text-rose">Wajib</span>}
                {q.screening_enabled && <span className="rounded bg-iris-50 px-1.5 text-xs font-semibold text-iris-700">Screening {q.weight}</span>}
                <ChevronDown className={cx('size-4 text-muted transition-transform', open && 'rotate-180')} />
              </button>
              {open && (
                <div className="space-y-4 border-t border-line-2 px-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                    <Field label="Pertanyaan" required>
                      <Input value={q.question_text} onChange={(e) => update(i, { question_text: e.target.value })} placeholder="Contoh: Berapa rata-rata views Reels kamu?" />
                    </Field>
                    <Field label="Jenis jawaban">
                      <Select value={q.question_type} onChange={(e) => update(i, { question_type: e.target.value })}>
                        {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </Select>
                    </Field>
                  </div>
                  {needsOptions(q.question_type) && (
                    <Field label="Pilihan jawaban" hint="Satu pilihan per baris.">
                      <Textarea rows={3} value={q.options.join('\n')} onChange={(e) => update(i, { options: e.target.value.split('\n') })} />
                    </Field>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Petunjuk untuk creator"><Input value={q.help_text} onChange={(e) => update(i, { help_text: e.target.value })} /></Field>
                    <Field label="Simpan ke profil creator" hint="Jawaban otomatis memperbarui profil.">
                      <Select value={q.profile_field} onChange={(e) => update(i, { profile_field: e.target.value })}>
                        {PROFILE_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </Select>
                    </Field>
                  </div>
                  {q.question_type === 'NUMBER' && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Nilai minimum"><Input type="number" value={q.min_value ?? ''} onChange={(e) => update(i, { min_value: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
                      <Field label="Nilai maksimum"><Input type="number" value={q.max_value ?? ''} onChange={(e) => update(i, { max_value: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
                    </div>
                  )}
                  <Checkbox label="Wajib dijawab" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} />
                  <div className="rounded-control bg-paper p-4">
                    <Checkbox label={<><span className="font-semibold text-ink">Gunakan untuk screening</span><span className="block text-xs text-muted">Jawaban yang sesuai menambah bobot Recommendation (30% dari penilaian).</span></>}
                      checked={q.screening_enabled} onChange={(e) => update(i, { screening_enabled: e.target.checked, weight: e.target.checked && !q.weight ? 10 : q.weight })} />
                    {q.screening_enabled && (
                      <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr_110px]">
                        <Field label="Aturan">
                          <Select value={q.screening_operator} onChange={(e) => update(i, { screening_operator: e.target.value })}>
                            {SCREENING_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </Select>
                        </Field>
                        <Field label="Jawaban yang diharapkan"><Input value={q.screening_value} onChange={(e) => update(i, { screening_value: e.target.value })} placeholder={q.question_type === 'YES_NO' ? 'Ya' : ''} /></Field>
                        <Field label="Bobot"><Input type="number" min={0} value={q.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })} /></Field>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>Naikkan</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === value.length - 1}>Turunkan</Button>
                    </div>
                    <Button type="button" size="sm" variant="danger" onClick={() => { onChange(value.filter((_, j) => j !== i)); setOpenIdx(null); }}>
                      <Trash2 className="size-4" />Hapus
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={add}><Plus className="size-4" />Tambah pertanyaan</Button>
        {templates.length > 0 && (
          <Select className="h-8 w-auto text-[13px]" value="" onChange={(e) => {
            const t = templates.find((x) => x.id === e.target.value);
            if (!t) return;
            onChange([...value, ...t.questions.map((q) => ({ ...blankQuestion(), ...q, id: undefined }))]);
            toast.success(`${t.questions.length} pertanyaan dari template "${t.name}" ditambahkan.`);
          }}>
            <option value="">Pakai template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        )}
        {value.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setSaveOpen(true)}>Simpan sebagai template</Button>}
        {totalWeight > 0 && <span className="ml-auto text-xs text-muted">Total bobot screening: <b className="tabular">{totalWeight}</b></span>}
      </div>
      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} title="Simpan template pertanyaan" width="sm"
        footer={<><Button variant="secondary" onClick={() => setSaveOpen(false)}>Batal</Button>
          <Button loading={pending} onClick={async () => {
            const qs = value.map(({ id, ...rest }) => rest);
            const r = await call('save_question_template', { p_id: null, p_name: tplName, p_description: '', p_questions: qs }, { success: 'Template disimpan' });
            if (r.ok) setSaveOpen(false);
          }}>Simpan template</Button></>}>
        <Field label="Nama template"><Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Contoh: Screening F&B standar" /></Field>
      </Dialog>
    </div>
  );
}
