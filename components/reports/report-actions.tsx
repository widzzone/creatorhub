'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Checkbox, Field, Input, Notice, Textarea } from '../ui/primitives';
import { useRpc } from '../ui/client';
import { Dialog } from '../ui/dialog';
import { Download, Lock, Printer } from '../ui/icons';
import { exportReportXlsx } from '@/lib/export-xlsx';

export function ReportActions({ report, role }: { report: any; role: 'ADMIN' | 'BRAND' }) {
  const c = report.campaign;
  const closed = ['CLOSED', 'CANCELLED'].includes(c.status);
  const [dlg, setDlg] = useState<'' | 'save' | 'close'>('');
  const [summary, setSummary] = useState(report.saved_report?.summary ?? '');
  const [url, setUrl] = useState(report.saved_report?.report_url ?? c.report_url ?? '');
  const [note, setNote] = useState('');
  const [force, setForce] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { call, pending } = useRpc();

  return (
    <>
      <Button variant="secondary" loading={exporting} onClick={async () => {
        setExporting(true);
        try { await exportReportXlsx(report); toast.success('File Excel diunduh'); }
        catch { toast.error('Export Excel gagal. Coba lagi.'); }
        finally { setExporting(false); }
      }}><Download className="size-4" />Excel</Button>
      <Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" />PDF</Button>
      {!closed && <Button variant={report.saved_report ? 'secondary' : 'primary'} onClick={() => setDlg('save')}>{report.saved_report ? 'Edit final report' : 'Simpan final report'}</Button>}
      {!closed && role === 'ADMIN' && <Button variant={report.ready_to_close ? 'primary' : 'ghost'} onClick={() => setDlg('close')}><Lock className="size-4" />Tutup campaign</Button>}

      <Dialog open={dlg === 'save'} onClose={() => setDlg('')} title="Final report" description="Angka KPI diambil otomatis dari insight terverifikasi saat disimpan."
        footer={<><Button variant="secondary" onClick={() => setDlg('')}>Batal</Button>
          <Button loading={pending} onClick={async () => { const r = await call('save_campaign_report', { p_campaign: c.id, p_report_url: url, p_summary: summary }, { success: 'Final report disimpan' }); if (r.ok) setDlg(''); }}>Simpan report</Button></>}>
        <div className="space-y-4">
          <Field label="Ringkasan eksekutif" required><Textarea rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Capaian utama, insight, rekomendasi untuk campaign berikutnya" /></Field>
          <Field label="Link report eksternal" hint="Opsional, bila ada deck atau dokumen terpisah."><Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
        </div>
      </Dialog>

      <Dialog open={dlg === 'close'} onClose={() => setDlg('')} title="Tutup campaign" width="sm"
        footer={<><Button variant="secondary" onClick={() => setDlg('')}>Batal</Button>
          <Button variant={force ? 'danger' : 'primary'} loading={pending} disabled={!report.ready_to_close && !force}
            onClick={async () => { const r = await call('close_campaign', { p_campaign: c.id, p_note: note, p_force: force }, { success: 'Campaign ditutup' }); if (r.ok) setDlg(''); }}>
            {force ? 'Tutup paksa' : 'Tutup campaign'}
          </Button></>}>
        <div className="space-y-4">
          {report.ready_to_close
            ? <Notice tone="moss">Semua creator final sudah dibayar dan final report tersimpan.</Notice>
            : <Notice tone="amber" title="Checklist belum lengkap">Campaign normalnya ditutup setelah semua creator dibayar dan final report tersimpan.</Notice>}
          <p className="text-sm text-ink-2">Recruitment ikut ditutup, creator yang sudah dibayar ditandai selesai dan menerima ucapan terima kasih. Campaign tidak dapat diubah lagi.</p>
          <Field label={force ? 'Alasan tutup paksa' : 'Catatan closing'} required={force}><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          {!report.ready_to_close && <Checkbox label="Tutup paksa meskipun checklist belum lengkap" checked={force} onChange={(e) => setForce(e.target.checked)} />}
        </div>
      </Dialog>
    </>
  );
}
