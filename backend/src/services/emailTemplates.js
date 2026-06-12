function baseLayout({ title, body, footer }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { padding: 0 !important; }
      .email-content { padding: 20px 16px !important; }
      .otp-code { font-size: 28px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a0e17;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e17;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table class="email-container" role="presentation" width="100%" style="max-width:520px;background:linear-gradient(135deg,#111827,#1a1f2e);border-radius:16px;border:1px solid rgba(56,189,248,0.15);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="text-align:center;">
                    <div style="display:inline-block;width:44px;height:44px;background:linear-gradient(135deg,#38bdf8,#0ea5e9);border-radius:12px;text-align:center;line-height:44px;font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">eK</div>
                    <h1 style="color:#f1f5f9;font-size:18px;font-weight:600;margin:8px 0 0;letter-spacing:-0.3px;">eKavach</h1>
                    <p style="color:#64748b;font-size:12px;margin:2px 0 0;">VAPT Management Platform</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding:24px 32px;">
              <h2 style="color:#f1f5f9;font-size:20px;font-weight:600;margin:0 0 16px;letter-spacing:-0.3px;">${title}</h2>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="border-top:1px solid rgba(56,189,248,0.08);padding-top:16px;">
                    ${footer || `
                    <p style="color:#475569;font-size:11px;margin:0 0 4px;line-height:1.5;">
                      This is an automated security notification from eKavach. If you did not request this, please ignore this email or contact your administrator.
                    </p>
                    <p style="color:#334155;font-size:10px;margin:0;">&copy; ${new Date().getFullYear()} eKavach. All rights reserved.</p>
                    `}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpEmail({ otp, name, purpose, expiresInMinutes = 5 }) {
  const title = purpose === 'login'
    ? 'Verify Your Login'
    : 'Reset Your Password';

  const subtitle = purpose === 'login'
    ? 'Use the OTP below to complete your login to eKavach.'
    : 'Use the OTP below to reset your password on eKavach.';

  const body = `
    <p style="color:#94a3b8;font-size:14px;margin:0 0 4px;line-height:1.5;">Hello${name ? ` ${name}` : ''},</p>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 20px;line-height:1.5;">${subtitle}</p>
    <div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.12);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <p style="color:#64748b;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1.5px;">One-Time Password</p>
      <div class="otp-code" style="font-family:'JetBrains Mono','Courier New',monospace;font-size:32px;font-weight:700;color:#38bdf8;letter-spacing:8px;margin:0 0 4px;">${otp}</div>
      <p style="color:#64748b;font-size:11px;margin:8px 0 0;">Expires in ${expiresInMinutes} minutes · One-time use only</p>
    </div>
    <p style="color:#64748b;font-size:11px;margin:0;line-height:1.5;">If you did not request this OTP, please ignore this email. Do not share this code with anyone.</p>
  `;

  return baseLayout({ title, body });
}

function resetLinkEmail({ name, resetUrl }) {
  const title = 'Password Reset Link';
  const body = `
    <p style="color:#94a3b8;font-size:14px;margin:0 0 4px;line-height:1.5;">Hello${name ? ` ${name}` : ''},</p>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 20px;line-height:1.5;">A password reset has been initiated for your account. Click the button below to set a new password.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td align="center">
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">Reset Password</a>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.12);border-radius:8px;padding:12px 16px;">
          <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;word-break:break-all;">${resetUrl}</p>
          <p style="color:#64748b;font-size:11px;margin:0;">This link expires in 15 minutes and can only be used once.</p>
        </td>
      </tr>
    </table>
  `;

  return baseLayout({ title, body });
}

module.exports = { otpEmail, resetLinkEmail };
