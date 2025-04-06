import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not found. Email functionality will not work.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Sender email address - update this with your verified sender
const FROM_EMAIL = 'cineMatch@example.com';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('Cannot send email: SENDGRID_API_KEY is not set');
      return false;
    }

    const msg = {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(name: string, email: string): Promise<boolean> {
  const subject = 'Welcome to CineMatch!';
  
  // Create HTML content with inline styles for email compatibility
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Welcome to CineMatch</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(to right, #3b82f6, #06b6d4);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #fff;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(to right, #3b82f6, #06b6d4);
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to CineMatch!</h1>
      </div>
      <div class="content">
        <p>Hello ${name},</p>
        
        <p>Thank you for joining CineMatch! We're excited to help you discover films that perfectly match your preferences and mood.</p>
        
        <p>With CineMatch, you can:</p>
        <ul>
          <li>Get personalized movie recommendations based on your mood and preferences</li>
          <li>Discover hidden gems from indie and international cinema</li>
          <li>Keep track of films you want to watch in your personal Watchlist</li>
          <li>Rate and review films you've watched to improve future recommendations</li>
        </ul>
        
        <p>Ready to find your next favorite film?</p>
        
        <a href="https://cinematch.replit.app" class="button">Explore Recommendations</a>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
        
        <p>Happy watching!</p>
        <p>The CineMatch Team</p>
      </div>
      <div class="footer">
        <p>Powered by More Human | Contact: andy@more-human.co.uk</p>
        <p>This email was sent to ${email}. If you didn't create this account, please ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html: htmlContent
  });
}