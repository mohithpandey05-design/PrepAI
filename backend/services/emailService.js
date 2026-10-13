const nodemailer = require('nodemailer');

let etherealTransporter = null;

const createTransporter = async () => {
  const user = process.env.EMAIL_USER;
  const rawPass = process.env.EMAIL_PASS;
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : '';

  const isConfigured = user && pass && !user.includes('your_') && !pass.includes('your_');

  if (isConfigured) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  if (!etherealTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      etherealTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`\n📧 [EMAIL SERVICE] Initialized auto Ethereal test inbox for: ${testAccount.user}`);
    } catch (e) {
      console.warn('⚠️ Could not create Ethereal test account:', e.message);
    }
  }

  return etherealTransporter;
};

const sendOtpEmail = async (email, otp, fullName) => {
  let transporter = await createTransporter();

  const senderEmail = process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your_')
    ? process.env.EMAIL_USER
    : 'noreply@aiinterviewplatform.com';

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"AI Interview Platform" <${senderEmail}>`,
    to: email,
    subject: '🔐 Verify Your Email — AI Interview Platform',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #6366f1, #7c3aed); padding: 35px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: white;">AI Interview Platform</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 15px;">Email Verification Code</p>
        </div>
        <div style="padding: 35px 30px;">
          <p style="font-size: 16px; margin-bottom: 12px; color: #f8fafc;">Hello <strong>${fullName || 'Candidate'}</strong>,</p>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
            Thank you for registering! Enter the 6-digit OTP code below to verify your email address. This code expires in <strong>10 minutes</strong>.
          </p>
          <div style="background: rgba(99, 102, 241, 0.12); border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
            <span style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #818cf8;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center;">
            If you did not request this verification code, please ignore this email.
          </p>
        </div>
        <div style="background: rgba(255,255,255,0.02); padding: 18px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
          <p style="color: #475569; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} AI Interview Platform. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    if (!transporter) {
      console.log(`[OTP LOG] OTP Sent via fallback log mode for ${email}`);
      return { success: true, mode: 'fallback' };
    }

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log(`[OTP LOG] OTP Sent successfully to ${email} (MessageId: ${info.messageId})`);
    if (previewUrl) {
      console.log(`[OTP LOG] Preview email at: ${previewUrl}`);
    }
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error(`[OTP LOG] Failed to send email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (email, resetToken, fullName) => {
  console.log(`[PASSWORD RESET] Email send started for ${email}`);
  const transporter = await createTransporter();

  const clientUrl = process.env.CLIENT_URL || 'http://127.0.0.1:5500';
  const resetUrl = `${clientUrl}/frontend/pages/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const senderEmail = process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your_')
    ? process.env.EMAIL_USER
    : 'noreply@aiinterviewplatform.com';

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"PrepAI Platform" <${senderEmail}>`,
    to: email,
    subject: '🔑 Password Reset — PrepAI Platform',
    text: `Hello ${fullName || 'Candidate'},\n\nYou requested a password reset for your PrepAI account.\nPlease open the following link in your browser to reset your password:\n${resetUrl}\n\nThis link will expire in 15 minutes.\nIf you did not request this password reset, please ignore this email.`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #6366f1, #7c3aed); padding: 35px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: white;">PrepAI Platform</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 15px;">Password Reset Request</p>
        </div>
        <div style="padding: 35px 30px;">
          <p style="font-size: 16px; margin-bottom: 12px; color: #f8fafc;">Hello <strong>${fullName || 'Candidate'}</strong>,</p>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to set a new password. This secure link expires in <strong>15 minutes</strong>.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #7c3aed); color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
              Reset Your Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center;">
            If you did not request a password reset, please ignore this message. Your account remains completely secure.
          </p>
        </div>
        <div style="background: rgba(255,255,255,0.02); padding: 18px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
          <p style="color: #475569; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} PrepAI Platform. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    if (!transporter) {
      console.log(`[PASSWORD RESET] Email send completed via fallback log mode for ${email}`);
      return { success: true, mode: 'fallback' };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[PASSWORD RESET] Email send successful to ${email} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[PASSWORD RESET] Email send failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail,
};
