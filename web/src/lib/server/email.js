/**
 * Email service menggunakan Resend API langsung via fetch.
 * Tidak perlu install library tambahan — zero dependencies.
 */
import { env } from '$env/dynamic/private';

const FROM_ADDRESS = 'Upstyle <onboarding@resend.dev>';
const APP_NAME = 'Upstyle';
const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Kirim email via Resend REST API
 * @param {{ to: string, subject: string, html: string }} opts
 */
export async function sendEmail({ to, subject, html }) {
	const apiKey = env.RESEND_API_KEY;
	if (!apiKey) {
		// Kalau belum dikonfigurasi, log ke console saja (jangan crash)
		console.warn('[Email] RESEND_API_KEY belum dikonfigurasi. Email tidak terkirim.');
		console.info('[Email] Preview:', { to, subject });
		return;
	}

	const response = await fetch(RESEND_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			from: FROM_ADDRESS,
			to,
			subject,
			html
		})
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Resend API error ${response.status}: ${text}`);
	}
}

// ─── Verify Email ──────────────────────────────────────────────────────────────

/**
 * Kirim email verifikasi akun baru
 * @param {{ to: string, username: string, verifyUrl: string }} opts
 */
export async function sendVerifyEmail({ to, username, verifyUrl }) {
	await sendEmail({
		to,
		subject: `Verifikasi Email Kamu — ${APP_NAME}`,
		html: emailTemplate({
			title: 'Verifikasi Email Kamu',
			body: `
				<p>Hai <strong>${escHtml(username)}</strong>,</p>
				<p>Terima kasih sudah daftar di ${APP_NAME}. Klik tombol di bawah untuk verifikasi email kamu.</p>
				<p>Link ini berlaku selama <strong>24 jam</strong>.</p>
			`,
			ctaText: 'Verifikasi Email',
			ctaUrl: verifyUrl,
			footer: 'Kalau kamu tidak mendaftar di Upstyle, abaikan email ini.'
		})
	});
}

// ─── Forgot Password ───────────────────────────────────────────────────────────

/**
 * Kirim email reset password
 * @param {{ to: string, username: string, resetUrl: string }} opts
 */
export async function sendPasswordResetEmail({ to, username, resetUrl }) {
	await sendEmail({
		to,
		subject: `Reset Password — ${APP_NAME}`,
		html: emailTemplate({
			title: 'Reset Password',
			body: `
				<p>Hai <strong>${escHtml(username)}</strong>,</p>
				<p>Kami menerima permintaan reset password untuk akun kamu. Klik tombol di bawah untuk membuat password baru.</p>
				<p>Link ini berlaku selama <strong>1 jam</strong>. Kalau kamu tidak meminta reset password, abaikan email ini.</p>
			`,
			ctaText: 'Reset Password',
			ctaUrl: resetUrl,
			footer: 'Demi keamanan, link ini hanya bisa dipakai sekali.'
		})
	});
}

// ─── Welcome Email ─────────────────────────────────────────────────────────────

/**
 * Kirim welcome email setelah verifikasi berhasil (non-blocking)
 * @param {{ to: string, username: string }} opts
 */
export async function sendWelcomeEmail({ to, username }) {
	await sendEmail({
		to,
		subject: `Selamat datang di ${APP_NAME}! 🎉`,
		html: emailTemplate({
			title: `Selamat Datang, ${escHtml(username)}!`,
			body: `
				<p>Akun kamu sudah aktif dan siap digunakan.</p>
				<p>Dengan ${APP_NAME}, kamu bisa mengelola keuangan, inventory, HR, CRM, dan banyak lagi dalam satu platform.</p>
				<p>Mulai dengan membuat unit bisnis pertama kamu.</p>
			`,
			ctaText: 'Buka Dashboard',
			ctaUrl: `${env.ORIGIN || 'https://app.upstyle.id'}/finance`,
			footer: 'Butuh bantuan? Balas email ini atau hubungi support kami.'
		})
	});
}

// ─── Utility ───────────────────────────────────────────────────────────────────

/** @param {string} str */
function escHtml(str) {
	return String(str || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * @param {{ title: string, body: string, ctaText: string, ctaUrl: string, footer: string }} opts
 */
function emailTemplate({ title, body, ctaText, ctaUrl, footer }) {
	return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#1e1b4b;padding:28px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">${APP_NAME}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px;color:#1e293b;font-size:22px;font-weight:800;">${escHtml(title)}</h2>
              <div style="color:#475569;font-size:15px;line-height:1.7;">${body}</div>
              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td style="background:#4f46e5;border-radius:6px;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px;">${escHtml(ctaText)}</a>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8;font-size:12px;margin:0;">Atau salin link ini ke browser:<br>
                <a href="${ctaUrl}" style="color:#4f46e5;word-break:break-all;">${ctaUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">${escHtml(footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
