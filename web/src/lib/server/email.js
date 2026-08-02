/**
 * Email Service — Resend
 * Wrapper untuk kirim email transaksional.
 */
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

let _resend = null;

function getResend() {
  if (!_resend) {
    if (!env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY tidak dikonfigurasi');
      return null;
    }
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_DEFAULT = env.EMAIL_FROM || 'Bizgrow <noreply@bizgrow.id>';

/**
 * Kirim email
 * @param {{ to: string|string[], subject: string, html: string, from?: string }} opts
 */
export async function sendEmail({ to, subject, html, from = FROM_DEFAULT }) {
  const resend = getResend();
  if (!resend) return { success: false, error: 'Email service tidak dikonfigurasi' };

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) { console.error('[Email] Resend error:', error); return { success: false, error }; }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Email] Send error:', err);
    return { success: false, error: err.message };
  }
}

// ─── Template helpers ─────────────────────────────────────────────────────────

export function emailBase(content, title = 'Bizgrow') {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:sans-serif;background:#f8fafc;margin:0;padding:20px}
  .card{background:#fff;border-radius:12px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #e2e8f0}
  .logo{font-weight:900;font-size:20px;color:#1e40af;margin-bottom:24px}
  .footer{text-align:center;margin-top:24px;font-size:12px;color:#94a3b8}</style>
  </head><body><div class="card">
  <div class="logo">⚡ Bizgrow</div>${content}
  <div class="footer">© ${new Date().getFullYear()} Bizgrow · Platform Bisnis UMKM Indonesia</div>
  </div></body></html>`;
}

export const emailTemplates = {
  /** Email verifikasi akun — dipakai oleh sendVerifyEmail() */
  verifyEmail: (username, verifyUrl) => emailBase(`
      <h2 style="margin:0 0 8px">Halo, ${username}!</h2>
      <p style="color:#475569">Klik tombol di bawah untuk verifikasi email kamu:</p>
      <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Verifikasi Email</a>
      <p style="color:#94a3b8;font-size:12px">Link berlaku 24 jam. Abaikan jika bukan kamu.</p>
  `),

  /** Email reset password — dipakai oleh sendPasswordResetEmail() */
  resetPassword: (username, resetUrl) => emailBase(`
      <h2 style="margin:0 0 8px">Reset Password</h2>
      <p style="color:#475569">Halo ${username}, klik tombol berikut untuk reset password:</p>
      <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a>
      <p style="color:#94a3b8;font-size:12px">Link berlaku 1 jam.</p>
  `),

  /** Notifikasi stok menipis */
  stockAlert: (to, unitName, products) => sendEmail({
    to,
    subject: `⚠️ Stok Menipis — ${unitName}`,
    html: emailBase(`
      <h2 style="margin:0 0 8px">⚠️ Peringatan Stok Menipis</h2>
      <p style="color:#475569">Unit: <strong>${unitName}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <tr style="background:#f1f5f9"><th style="padding:8px;text-align:left">Produk</th><th style="padding:8px">Stok</th><th style="padding:8px">Min</th></tr>
        ${products.map(p => `<tr><td style="padding:8px;border-top:1px solid #e2e8f0">${p.nama}</td><td style="padding:8px;text-align:center;color:#dc2626;font-weight:bold">${p.stok}</td><td style="padding:8px;text-align:center">${p.minStok}</td></tr>`).join('')}
      </table>
      <p style="margin-top:16px"><a href="${env.ORIGIN}/finance" style="color:#1e40af">→ Buka Bizgrow</a></p>
    `)
  }),

  /** Slip gaji via email */
  slipGaji: (to, employeeName, monthYear, netSalary) => sendEmail({
    to,
    subject: `Slip Gaji ${monthYear} — Bizgrow HR`,
    html: emailBase(`
      <h2 style="margin:0 0 8px">Slip Gaji — ${monthYear}</h2>
      <p style="color:#475569">Halo <strong>${employeeName}</strong>, slip gaji kamu telah diproses.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
        <div style="font-size:12px;color:#16a34a;font-weight:bold">GAJI BERSIH</div>
        <div style="font-size:28px;font-weight:900;color:#15803d">Rp ${Number(netSalary).toLocaleString('id-ID')}</div>
      </div>
    `)
  }),
};

// ─── Named send helpers (dipakai oleh auth routes) ────────────────────────────

/**
 * Kirim email verifikasi akun
 * @param {{ to: string, username: string, verifyUrl: string }} opts
 */
export async function sendVerifyEmail({ to, username, verifyUrl }) {
  return sendEmail({
    to,
    subject: 'Verifikasi Email Akun Bizgrow',
    html: emailTemplates.verifyEmail(username, verifyUrl),
  });
}

/**
 * Kirim email selamat datang setelah verifikasi berhasil
 * @param {{ to: string, username: string }} opts
 */
export async function sendWelcomeEmail({ to, username }) {
  return sendEmail({
    to,
    subject: 'Selamat Datang di Bizgrow! 🎉',
    html: emailBase(`
      <h2 style="margin:0 0 8px">Selamat datang, ${username}!</h2>
      <p style="color:#475569">Akun Bizgrow kamu sudah aktif. Mulai kelola bisnismu sekarang.</p>
      <a href="${env.ORIGIN || 'https://bizgrow.id'}/finance" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Buka Dashboard →</a>
    `),
  });
}

/**
 * Kirim email reset password
 * @param {{ to: string, username: string, resetUrl: string }} opts
 */
export async function sendPasswordResetEmail({ to, username, resetUrl }) {
  return sendEmail({
    to,
    subject: 'Reset Password Bizgrow',
    html: emailTemplates.resetPassword(username, resetUrl),
  });
}
