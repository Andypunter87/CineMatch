import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
let sgMailInitialized = false;

if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not found. Email functionality will not work.');
} else {
  // Validate the API key format (should start with "SG.")
  if (!process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    console.warn('SENDGRID_API_KEY appears to be in an invalid format. It should start with "SG."');
    console.warn('Email functionality may not work correctly.');
  }
  
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sgMailInitialized = true;
    console.log('SendGrid initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SendGrid:', error);
  }
}

// Sender email address - using the verified sender email
const FROM_EMAIL = 'andy@more-human.co.uk';

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
    // Check if SendGrid is properly initialized
    if (!sgMailInitialized) {
      console.error('Cannot send email: SendGrid is not properly initialized');
      
      // Try to initialize again if API key is available
      if (process.env.SENDGRID_API_KEY) {
        try {
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);
          sgMailInitialized = true;
          console.log('SendGrid re-initialized successfully');
        } catch (initError) {
          console.error('Failed to re-initialize SendGrid:', initError);
          return false;
        }
      } else {
        console.error('Cannot send email: SENDGRID_API_KEY is not set');
        return false;
      }
    }

    // Validate email address format
    if (!options.to || !options.to.includes('@') || !options.to.includes('.')) {
      console.error(`Invalid email address format: ${options.to}`);
      return false;
    }

    // Make sure text content is always provided
    const textContent = options.text || options.html.replace(/<[^>]*>/g, '');
    
    // Ensure html content is properly formatted if provided
    const htmlContent = options.html ? options.html.trim() : '';
    
    // If both text and html are empty, don't try to send
    if (!textContent && !htmlContent) {
      console.error('Cannot send email: No content provided');
      return false;
    }

    // Define message with proper typing
    const msg: {
      to: string;
      from: string;
      subject: string;
      text: string;
      html?: string;
    } = {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      text: textContent,
    };
    
    // Only add html if it's non-empty
    if (htmlContent) {
      msg.html = htmlContent;
    }

    try {
      await sgMail.send(msg);
      console.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (sendError: any) {
      // Log detailed SendGrid error information
      console.error('Error sending email:', sendError.toString());
      
      // If we have response details, log them for debugging
      if (sendError.response && sendError.response.body) {
        const errorDetails = sendError.response.body;
        console.error('SendGrid API error details:', JSON.stringify(errorDetails, null, 2));
      }
      
      // For now, we'll continue the app flow even if emails fail
      // In production, you might want to implement a retry mechanism or queue
      return false;
    }
  } catch (error) {
    console.error('Unexpected error in sendEmail function:', error);
    return false;
  }
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(name: string, email: string): Promise<boolean> {
  const subject = 'Welcome to CineMatch!';
  
  // Create a plain text version for email clients that don't support HTML
  const textContent = `
Hi ${name},

I'm Andy, the creator of CineMatch. I just wanted to say a huge thank you for signing up and trying us out!

I love movies. Nothing makes me happier than discovering something new to watch that I connect with. However, in an age of almost infinite choice at our fingertips it can sometimes be hard to find the right thing to watch at the right time.

I wanted to make something that makes it easier to find something awesome to watch quickly and ideally, find something that I might not have discovered on my own. CineMatch is my attempt to solve that problem.

This project is very much in its early stages, so I'd love to hear from you about how you find it and if you have any feedback for me, I'd really love to hear it!

I hope you find something amazing to watch,
Andy

---
Powered by More Human | Contact: andy@more-human.co.uk
This email was sent to ${email}. If you didn't create this account, please ignore this email.
  `;
  
  // Create HTML content with inline styles for email compatibility
  const htmlContent = `<!DOCTYPE html>
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
    <p>Hi ${name},</p>
    
    <p>I'm Andy, the creator of CineMatch. I just wanted to say a huge thank you for signing up and trying us out!</p>
    
    <p>I love movies. Nothing makes me happier than discovering something new to watch that I connect with. However, in an age of almost infinite choice at our fingertips it can sometimes be hard to find the right thing to watch at the right time. If you are anything like me, you probably end up spending ages flipping through the different menus of the streaming services just hoping that something perfect for your mood jumps out at you.</p>
    
    <p>I wanted to make something that makes it easier to find something awesome to watch quickly and ideally, find something that I might not have discovered on my own. CineMatch is my attempt to solve that problem.</p>
    
    <p>This project is very much in its early stages, so I'd love to hear from you about how you find it and if you have any feedback for me, I'd really love to hear it!</p>
    
    <a href="https://cine-match.replit.app" class="button">Explore Recommendations</a>
    
    <p>I hope you find something amazing to watch,</p>
    <p>Andy</p>
  </div>
  <div class="footer">
    <p>Powered by More Human | Contact: andy@more-human.co.uk</p>
    <p>This email was sent to ${email}. If you didn't create this account, please ignore this email.</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject,
    text: textContent,
    html: htmlContent
  });
}