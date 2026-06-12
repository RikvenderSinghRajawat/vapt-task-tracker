const { sendMail } = require('../config/smtp');
const { otpEmail, resetLinkEmail } = require('./emailTemplates');

const sendOtpMail = async ({ to, otp, name, purpose }) => {
  const subject = purpose === 'login'
    ? 'Your OTP for VAPT Tracker Login'
    : 'Your OTP for VAPT Tracker Password Reset';

  return sendMail({
    to,
    subject,
    html: otpEmail({ otp, name, purpose }),
    text: `Your OTP is: ${otp}. It expires in 5 minutes. Do not share this code.`,
  });
};

const sendPasswordResetMail = async ({ to, resetUrl, name }) => {
  return sendMail({
    to,
    subject: 'Reset your VAPT Tracker password',
    html: resetLinkEmail({ name, resetUrl }),
    text: `Reset your password here: ${resetUrl}. This link expires in 15 minutes.`,
  });
};

module.exports = {
  sendMail,
  sendOtpMail,
  sendPasswordResetMail,
};
