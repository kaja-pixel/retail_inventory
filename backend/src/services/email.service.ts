import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';

// Cache Ethereal test account so we don't create a new one on every request
let etherealTransporter: Transporter | null = null;
let etherealUser = '';

const getEtherealTransporter = async (): Promise<Transporter> => {
  if (etherealTransporter) return etherealTransporter;

  const testAccount = await nodemailer.createTestAccount();
  etherealUser = testAccount.user;
  console.log('\n📧 [Ethereal SMTP] Test account auto-created:');
  console.log(`   User: ${testAccount.user}`);
  console.log('   Preview emails at: https://ethereal.email\n');

  etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return etherealTransporter;
};

const isRealSmtpConfigured = (): boolean => {
  const { user, pass } = config.smtp;
  return (
    Boolean(user && pass) &&
    user !== 'test' &&
    pass !== 'test' &&
    !pass.includes('REPLACE') &&
    !pass.includes('your_')
  );
};

/**
 * Sends a password reset email.
 * - If real SMTP (Gmail) is configured in .env → sends via Gmail.
 * - Otherwise → sends via Ethereal (test inbox), logs preview URL to console.
 * Returns an optional preview URL (only set when using Ethereal).
 */
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<{ previewUrl?: string }> => {
  const resetUrl = `${config.clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const mailOptions = {
    from: isRealSmtpConfigured()
      ? `"SkillForge Inventory" <${config.smtp.from}>`
      : '"SkillForge Inventory" <noreply@skillforge-inventory.com>',
    to: email,
    subject: 'Password Reset Request - SkillForge Inventory',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e293b; font-size: 22px; margin: 0;">📦 SkillForge Inventory</h1>
        </div>
        <h2 style="color: #1e293b; font-size: 18px;">Password Reset Request</h2>
        <p style="color: #475569;">Hello,</p>
        <p style="color: #475569;">
          You requested a password reset for your <strong>SkillForge Inventory</strong> account
          associated with <strong>${email}</strong>.
        </p>
        <p style="color: #475569;">
          Click the button below to reset your password.
          This link is valid for <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
            style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none;
                   border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
            🔑 Reset My Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #2563eb; font-size: 13px; word-break: break-all;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          If you did not request this password reset, you can safely ignore this email.
        </p>
        <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin-top: 24px;">
          SkillForge Inventory Management System
        </p>
      </div>
    `,
  };

  if (isRealSmtpConfigured()) {
    // Send via real Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
    await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset email sent to ${email} via Gmail SMTP.`);
    return {};
  } else {
    // Send via Ethereal (auto test account - no credentials needed)
    const transporter = await getEtherealTransporter();
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

    console.log('\n' + '='.repeat(62));
    console.log('📧  PASSWORD RESET EMAIL — ETHEREAL PREVIEW');
    console.log('='.repeat(62));
    console.log(`   To:          ${email}`);
    console.log(`   Preview URL: ${previewUrl}`);
    console.log('   Open this URL in your browser to see the full email.');
    console.log('='.repeat(62) + '\n');

    return { previewUrl: previewUrl as string };
  }
};
