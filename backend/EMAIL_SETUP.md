# Email Setup Guide

## Overview

The application can send invitation emails to users. Email functionality uses **nodemailer** with SMTP.

## Setup Options

### Option 1: Gmail (Easiest for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Go to App Passwords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

3. **Add to `.env`**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=your-email@gmail.com
APP_URL=http://localhost:5173
```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up** at https://sendgrid.com
2. **Create API Key** in SendGrid dashboard
3. **Add to `.env`**:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
APP_URL=https://yourdomain.com
```

### Option 3: Mailgun

1. **Sign up** at https://mailgun.com
2. **Get SMTP credentials** from dashboard
3. **Add to `.env`**:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
SMTP_FROM=noreply@yourdomain.com
APP_URL=https://yourdomain.com
```

### Option 4: Other SMTP Providers

Any SMTP provider works. Common ones:
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your provider's SMTP settings

## Environment Variables

Add these to `backend/.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Application URL (for invite links)
APP_URL=http://localhost:5173
```

## Testing

### 1. Install Dependencies

```bash
cd backend
npm install nodemailer @types/nodemailer
```

### 2. Restart Backend

```bash
npm run dev
```

### 3. Test Invitation

1. Create a project
2. Invite a member
3. Check the email inbox
4. Check backend console for email status

## Troubleshooting

### "SMTP not configured" warning
- Check all SMTP env vars are set in `.env`
- Restart backend after adding env vars

### "Authentication failed"
- Gmail: Use App Password, not regular password
- Check credentials are correct
- Verify 2FA is enabled (for Gmail)

### "Connection timeout"
- Check SMTP_HOST and SMTP_PORT are correct
- Check firewall isn't blocking port
- Try different port (587 vs 465)

### Emails go to spam
- Use a proper domain email (not Gmail for production)
- Set up SPF/DKIM records
- Use a service like SendGrid/Mailgun

## Development Mode

If SMTP is not configured, invitations are still created but emails are not sent. The system logs a warning but continues normally.

## Production Recommendations

1. **Use a dedicated email service** (SendGrid, Mailgun, AWS SES)
2. **Set up proper domain** with SPF/DKIM records
3. **Monitor email delivery** rates
4. **Use email templates** (already implemented)
5. **Add email queue** for high volume

## Email Template

The invitation email includes:
- Inviter's name
- Project name
- Role (Admin/Member/Viewer)
- Accept invitation button
- Invite link
- Expiration notice

You can customize the template in `backend/src/services/email.ts`.



