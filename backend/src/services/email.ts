import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Create transporter based on environment variables
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // If SMTP is not configured, return null (emails won't be sent)
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('⚠️  SMTP not configured. Emails will not be sent.');
    console.warn('   Missing variables:');
    if (!smtpHost) console.warn('     - SMTP_HOST');
    if (!smtpPort) console.warn('     - SMTP_PORT');
    if (!smtpUser) console.warn('     - SMTP_USER');
    if (!smtpPass) console.warn('     - SMTP_PASS');
    console.warn('   Add these to backend/.env file');
    return null;
  }

  console.log('📧 SMTP configured:', {
    host: smtpHost,
    port: smtpPort,
    user: smtpUser,
    secure: smtpPort === '465'
  });

  return nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: smtpPort === '465', // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // Add debug logging
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
  });
};

const transporter = createTransporter();

export interface InvitationEmailData {
  to: string;
  inviterName: string;
  projectName: string;
  role: string;
  inviteLink: string;
  expiresIn: string;
}

export async function sendInvitationEmail(data: InvitationEmailData): Promise<void> {
  if (!transporter) {
    console.log('📧 Email not sent (SMTP not configured):', data.to);
    return;
  }

  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@projectmanager.com';
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  const roleLabels: Record<string, string> = {
    ADMIN: 'Admin',
    MEMBER: 'Member',
    VIEWER: 'Viewer',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Project Invitation</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Project Invitation</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Hello,
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>${data.inviterName}</strong> has invited you to join the project <strong>"${data.projectName}"</strong> as a <strong>${roleLabels[data.role] || data.role}</strong>.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.inviteLink}" 
             style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #999; word-break: break-all; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e5e7eb;">
          ${data.inviteLink}
        </p>
        
        <p style="font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          This invitation will expire in ${data.expiresIn}. If you didn't request this invitation, you can safely ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Project Manager. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Project Invitation

Hello,

${data.inviterName} has invited you to join the project "${data.projectName}" as a ${roleLabels[data.role] || data.role}.

Accept the invitation by clicking this link:
${data.inviteLink}

This invitation will expire in ${data.expiresIn}. If you didn't request this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Project Manager. All rights reserved.
  `;

  try {
    console.log(`📧 Attempting to send invitation email to ${data.to}...`);
    
    const info = await transporter.sendMail({
      from: `"Project Manager" <${fromEmail}>`,
      to: data.to,
      subject: `You've been invited to join "${data.projectName}"`,
      text: text,
      html: html,
    });
    
    console.log(`✅ Invitation email sent successfully to ${data.to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
  } catch (error: any) {
    console.error('❌ Failed to send invitation email:');
    console.error('   To:', data.to);
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    if (error.response) {
      console.error('   SMTP Response:', error.response);
    }
    if (error.responseCode) {
      console.error('   Response Code:', error.responseCode);
    }
    // Don't throw - invitation is still created even if email fails
  }
}

