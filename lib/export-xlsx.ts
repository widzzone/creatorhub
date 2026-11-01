'use client';

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Dibayar', READY_FOR_PAYMENT: 'Siap dibayar', PROCESSING: 'Diproses', PENDING_VERIFICATION: 'Menunggu verifikasi', CANCELLED: 'Dibatalkan',
};

/** Builds the campaign report workbook (Summary, Creator Performance, Funnel) in the browser. */
export async function exportReportXlsx(r: any) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CreatorHub';
  wb.created = new Date();
  const c = r.campaign;
  const ink = 'FF16182B';
  const iris = 'FF4C3FD6';
  const header = (ws: any, row: number) => {
    ws.getRow(row).eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: iris } };
      cell.alignment = { vertical: 'middle' };
    });
    ws.getRow(row).height = 22;
  };

  // Summary
  const s = wb.addWorksheet('Summary');
  s.columns = [{ width: 32 }, { width: 28 }];
  s.addRow([c.title]).font = { bold: true, size: 15, color: { argb: ink } };
  s.addRow([`${c.brand_name} — ${c.start_date ?? ''} s.d. ${c.end_date ?? ''}`]).font = { color: { argb: 'FF646A7E' } };
  s.addRow([]);
  s.addRow(['Metrik', 'Nilai']);
  header(s, 4);
  const rows: [string, number | string, string?][] = [
    ['Target creator', r.summary.creator_target],
    ['Pendaftar', r.summary.applicants],
    ['Creator final', r.summary.final_creators],
    ['Creator selesai (dibayar)', r.summary.completed_creators],
    ['Publikasi terverifikasi', r.summary.publications_verified],
    ['Insight terverifikasi', r.summary.insights_verified],
    ['Views', r.metrics.views, '#,##0'],
    ['Reach', r.metrics.reach, '#,##0'],
    ['Impressions', r.metrics.impressions, '#,##0'],
    ['Likes', r.metrics.likes, '#,##0'],
    ['Komentar', r.metrics.comments, '#,##0'],
    ['Share', r.metrics.shares, '#,##0'],
    ['Save', r.metrics.saves, '#,##0'],
    ['Total interaksi', r.metrics.engagements, '#,##0'],
    ['Engagement rate agregat (%)', Number(r.metrics.aggregate_er), '0.00'],
    ['Rata-rata ER creator (%)', Number(r.metrics.average_er), '0.00'],
    ['Total komitmen fee (Rp)', Number(r.finance.committed), '#,##0'],
    ['Sudah dibayar (Rp)', Number(r.finance.paid), '#,##0'],
    ['Belum dibayar (Rp)', Number(r.finance.pending), '#,##0'],
  ];
  rows.forEach(([k, v, fmt]) => {
    const row = s.addRow([k, v]);
    if (fmt) row.getCell(2).numFmt = fmt;
  });
  if (r.saved_report?.summary) {
    s.addRow([]);
    s.addRow(['Ringkasan eksekutif']).font = { bold: true };
    const row = s.addRow([r.saved_report.summary]);
    s.mergeCells(`A${row.number}:B${row.number}`);
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    row.height = 90;
  }

  // Creator Performance
  const p = wb.addWorksheet('Creator Performance');
  p.columns = [
    { header: 'Creator', width: 26 }, { header: 'Status', width: 20 }, { header: 'Platform', width: 12 }, { header: 'Link postingan', width: 42 },
    { header: 'Tanggal tayang', width: 14 }, { header: 'Views', width: 12 }, { header: 'Reach', width: 12 }, { header: 'Impressions', width: 13 },
    { header: 'Likes', width: 10 }, { header: 'Komentar', width: 10 }, { header: 'Share', width: 10 }, { header: 'Save', width: 10 },
    { header: 'ER (%)', width: 9 }, { header: 'Fee (Rp)', width: 14 }, { header: 'Pembayaran', width: 18 },
  ];
  header(p, 1);
  r.creators.forEach((x: any) => {
    const i = x.insight ?? {};
    const row = p.addRow([
      x.talent_name, x.status, x.publication?.platform ?? '', x.publication?.content_url ?? '', x.publication?.published_at ?? '',
      i.views ?? null, i.reach ?? null, i.impressions ?? null, i.likes ?? null, i.comments ?? null, i.shares ?? null, i.saves ?? null,
      i.engagement_rate != null ? Number(i.engagement_rate) : null, x.payment ? Number(x.payment.amount) : null,
      x.payment ? STATUS_LABEL[x.payment.status] ?? x.payment.status : '',
    ]);
    [6, 7, 8, 9, 10, 11, 12, 14].forEach((n) => (row.getCell(n).numFmt = '#,##0'));
    row.getCell(13).numFmt = '0.00';
    if (x.publication?.content_url) row.getCell(4).value = { text: x.publication.content_url, hyperlink: x.publication.content_url };
  });
  p.views = [{ state: 'frozen', ySplit: 1 }];

  // Funnel
  const fsh = wb.addWorksheet('Funnel');
  fsh.columns = [{ header: 'Tahap', width: 28 }, { header: 'Jumlah creator', width: 16 }, { header: 'Konversi dari pendaftar', width: 22 }];
  header(fsh, 1);
  const base = Math.max(1, Number(r.funnel.applied));
  ([
    ['Mendaftar', r.funnel.applied], ['Lolos screening', r.funnel.shortlisted], ['Menerima offer', r.funnel.offer_accepted],
    ['Disetujui Brand', r.funnel.brand_approved], ['Tayang terverifikasi', r.funnel.published],
    ['Insight terverifikasi', r.funnel.insight_verified], ['Dibayar', r.funnel.paid],
  ] as [string, number][]).forEach(([k, n]) => {
    const row = fsh.addRow([k, n, n / base]);
    row.getCell(3).numFmt = '0.0%';
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Report_${(c.code || c.id).toString()}_${c.title.replace(/[^\w-]+/g, '_').slice(0, 50)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
