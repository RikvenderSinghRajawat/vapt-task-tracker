const nodemailer = require('nodemailer');

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASSWORD || '',
  fromEmail: process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@example.com',
  fromName: process.env.SMTP_FROM_NAME || process.env.FROM_NAME || 'eKavach',
};

let transportPromise = null;

function createTransport() {
  if (!SMTP_CONFIG.host) return null;

  return nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.secure,
    auth: {
      user: SMTP_CONFIG.user,
      pass: SMTP_CONFIG.pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

async function getTransport() {
  if (transportPromise) return transportPromise;

  if (!SMTP_CONFIG.host) {
    transportPromise = Promise.resolve(null);
    return transportPromise;
  }

  transportPromise = (async () => {
    const transporter = createTransport();
    if (!transporter) return null;
    try {
      await transporter.verify();
      console.log('[SMTP] Connection verified successfully');
      return transporter;
    } catch (err) {
      console.warn(`[SMTP] Verification failed: ${err.message}. Will retry on send.`);
      return transporter;
    }
  })();

  return transportPromise;
}

async function sendMail({ to, subject, html, text }) {
  if (!SMTP_CONFIG.host) {
    console.warn(`[Mail] SMTP not configured. Skipping email to ${to}: ${subject}`);
    return { skipped: true };
  }

  try {
    const transporter = await getTransport();
    if (!transporter) {
      console.warn(`[Mail] No transporter available. Skipping: ${subject}`);
      return { skipped: true };
    }

    const info = await transporter.sendMail({
      from: `"${SMTP_CONFIG.fromName}" <${SMTP_CONFIG.fromEmail}>`,
      to,
      subject,
      html,
      text,
    });

    console.log(`[Mail] Sent: ${subject} -> ${to} (id: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Mail] Failed to send "${subject}" to ${to}: ${err.message}`);
    transportPromise = null;
    return { skipped: true, error: err.message };
  }
}

function getSmtpStatus() {
  return {
    configured: !!SMTP_CONFIG.host,
    host: SMTP_CONFIG.host || '(not set)',
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.secure,
    fromEmail: SMTP_CONFIG.fromEmail,
    fromName: SMTP_CONFIG.fromName,
  };
}

module.exports = { sendMail, getSmtpStatus };
