'use client';

import { useEffect, useState } from 'react';
import { SOP_STEPS } from '@/lib/constants';

/** Satu kalimat per tahap SOP, ditampilkan bergantian di halaman login. */
const STEP_NOTES = [
  'Fee, kuota, dan kriteria creator ditetapkan bersama Brand.',
  'Link pendaftaran dibagikan dan creator mendaftar sendiri.',
  'Pendaftar dinilai otomatis sesuai kriteria campaign.',
  'Creator terpilih menerima dan mengonfirmasi job offer.',
  'Brand meninjau dan menyetujui daftar creator.',
  'Creator menerima brief, produk, lalu mulai produksi.',
  'Draft ditinjau dan direvisi lewat chat sebelum tayang.',
  'Link konten yang tayang dicatat per creator.',
  'Data performa dikirim creator dan diverifikasi tim.',
  'Fee dibayar ke rekening creator dan statusnya tercatat.',
  'Laporan akhir siap dibagikan ke Brand, campaign ditutup.',
];

const STEP_MS = 2600;
const HOLD_MS = 3200;

export function LoginShowcase() {
  const total = SOP_STEPS.length;
  const [step, setStep] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      return;
    }
    const t = setTimeout(() => setStep((s) => (s + 1) % total), step === total - 1 ? HOLD_MS : STEP_MS);
    return () => clearTimeout(t);
  }, [step, total]);

  const current = still ? total - 1 : step;

  return (
    <div>
      <p className="sr-only">
        Alur kerja {total} tahap SOP, dari {SOP_STEPS[0]} sampai {SOP_STEPS[total - 1]}.
      </p>
      <div aria-hidden>
        <div key={current} className="showcase-in">
          <p className="text-xs text-white/45 tabular">
            Tahap {String(current + 1).padStart(2, '0')} dari {total}
          </p>
          <p className="mt-1.5 text-[19px] leading-snug font-semibold tracking-[-0.015em] text-white">{SOP_STEPS[current]}</p>
          <p className="mt-1.5 min-h-[2.8em] max-w-[44ch] text-sm leading-relaxed text-white/55">{STEP_NOTES[current]}</p>
        </div>

        <div className="mt-5 flex h-1.5 gap-[3px]">
          {SOP_STEPS.map((s, i) => (
            <span key={s} className="flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                key={i === current ? `now-${step}` : 'static'}
                className={
                  still || i < current
                    ? 'block h-full rounded-full bg-[#a49bf6]'
                    : i === current
                      ? 'showcase-fill block h-full rounded-full bg-[#a49bf6]'
                      : 'block h-full'
                }
                style={i === current && !still ? { animationDuration: `${current === total - 1 ? HOLD_MS : STEP_MS}ms` } : undefined}
              />
            </span>
          ))}
        </div>
        <p className="mt-2.5 flex justify-between gap-4 text-xs text-white/40">
          <span>{SOP_STEPS[0]}</span>
          <span>{SOP_STEPS[total - 1]}</span>
        </p>
      </div>
    </div>
  );
}
