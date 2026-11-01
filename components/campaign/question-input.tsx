'use client';

import { Checkbox, Field, Input, Select, Textarea, cx } from '../ui/primitives';

export type PublicQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  help_text: string;
  placeholder: string;
  required: boolean;
  options: string[];
  min_value: number | null;
  max_value: number | null;
};

export function QuestionInput({ q, value, onChange, error }: { q: PublicQuestion; value: any; onChange: (v: any) => void; error?: string }) {
  const id = `q-${q.id}`;
  const common = { id, placeholder: q.placeholder || undefined, 'aria-invalid': !!error };
  let control: React.ReactNode;

  switch (q.question_type) {
    case 'PARAGRAPH':
      control = <Textarea {...common} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'NUMBER':
      control = <Input {...common} type="number" inputMode="decimal" min={q.min_value ?? undefined} max={q.max_value ?? undefined} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'EMAIL':
      control = <Input {...common} type="email" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'URL':
      control = <Input {...common} type="url" placeholder={q.placeholder || 'https://'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'DATE':
      control = <Input {...common} type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'DROPDOWN':
      control = (
        <Select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Pilih</option>
          {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      );
      break;
    case 'RADIO':
    case 'YES_NO': {
      const opts = q.question_type === 'YES_NO' ? ['Ya', 'Tidak'] : q.options;
      control = (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${id}-label`}>
          {opts.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)}
              className={cx('min-h-10 rounded-control border px-4 py-2 text-left text-sm font-medium transition-colors',
                value === o ? 'border-iris bg-iris-50 text-iris-700' : 'border-line hover:border-ink/25')}>
              {o}
            </button>
          ))}
        </div>
      );
      break;
    }
    case 'CHECKBOX': {
      const arr: string[] = Array.isArray(value) ? value : [];
      control = (
        <div className="space-y-2">
          {q.options.map((o) => (
            <Checkbox key={o} label={o} checked={arr.includes(o)} onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
          ))}
        </div>
      );
      break;
    }
    case 'CONSENT':
      return (
        <div>
          <Checkbox label={<span className="text-ink">{q.question_text}{q.required && <span className="text-rose"> *</span>}</span>}
            checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : '')} />
          {q.help_text && <p className="mt-1 ml-6.5 text-xs text-muted">{q.help_text}</p>}
          {error && <p className="mt-1 ml-6.5 text-xs text-rose">{error}</p>}
        </div>
      );
    default:
      control = <Input {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <Field label={<span id={`${id}-label`}>{q.question_text}</span>} required={q.required} hint={q.help_text} error={error} htmlFor={id}>
      {control}
    </Field>
  );
}
