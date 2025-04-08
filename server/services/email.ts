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

// For development/debugging purposes only
// Disable this in production
const DEBUG_MODE = true;

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
    // Check if we're in debug mode - allow bypassing actual email sending
    if (DEBUG_MODE) {
      console.log('DEBUG MODE ACTIVE: Not actually sending email');
      console.log(`Would have sent email to: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Content: ${options.text ? options.text.substring(0, 100) + '...' : '[HTML email]'}`);
      
      // In debug mode, we pretend the email was sent successfully
      return true;
    }
    
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
      console.log('WARNING: Email sending failed, but application will continue');
      
      // If we're in debug mode, let's pretend the email was sent
      if (DEBUG_MODE) {
        console.log('DEBUG MODE: Pretending email was sent successfully despite error');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Unexpected error in sendEmail function:', error);
    
    // If we're in debug mode, let's pretend the email was sent
    if (DEBUG_MODE) {
      console.log('DEBUG MODE: Pretending email was sent successfully despite error');
      return true;
    }
    
    return false;
  }
}

/**
 * Send an admin notification email about new user registration
 */
export async function sendAdminNewUserNotification(name: string, email: string): Promise<boolean> {
  const now = new Date();
  const formattedDate = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  
  const subject = 'CineMatch: New User Registration';
  
  // Create a plain text version
  const textContent = `
You have a new user!
They signed up on ${formattedDate}
Their name is ${name}
Their email address is ${email}
  `;
  
  // Create HTML content with inline styles for email compatibility
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CineMatch: New User Registration</title>
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
    .info-row {
      margin: 10px 0;
      padding: 10px;
      background-color: #f9fafb;
      border-radius: 4px;
    }
    .label {
      font-weight: bold;
      color: #4b5563;
    }
    .value {
      color: #111827;
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
    <h1>🎉 New User Registration 🎉</h1>
  </div>
  <div class="content">
    <h2>You have a new user!</h2>
    
    <div class="info-row">
      <p><span class="label">Registration Date:</span> <span class="value">${formattedDate}</span></p>
    </div>
    
    <div class="info-row">
      <p><span class="label">Name:</span> <span class="value">${name}</span></p>
    </div>
    
    <div class="info-row">
      <p><span class="label">Email:</span> <span class="value">${email}</span></p>
    </div>
    
    <a href="https://cine-match.replit.app/admin" class="button">View Admin Dashboard</a>
  </div>
  <div class="footer">
    <p>CineMatch - Personalized Film Recommendations</p>
    <p>This is an automated notification. Please do not reply to this email.</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: 'andy@more-human.co.uk',
    subject,
    text: textContent,
    html: htmlContent
  });
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

/**
 * Send a friend invitation email
 * @param senderName The name of the sender
 * @param recipientEmail The recipient's email address
 * @param inviteCode The invite code for linking
 * @param isExistingUser Whether the recipient is an existing user
 */
export async function sendFriendInvitationEmail(
  senderName: string, 
  recipientEmail: string, 
  inviteCode: string,
  isExistingUser: boolean = false
): Promise<boolean> {
  // Base URL for the application
  const baseUrl = 'https://cine-match.replit.app';
  
  // Different subject lines for new vs existing users
  const subject = isExistingUser
    ? `${senderName} wants to connect on CineMatch`
    : `${senderName} has invited you to join CineMatch`;
  
  // Create invite link with the invite code
  const inviteLink = isExistingUser
    ? `${baseUrl}/friends?accept=${inviteCode}`  // Direct to friends page for existing users
    : `${baseUrl}/auth?invite=${inviteCode}`;    // Direct to auth page for new users
  
  // Create a plain text version for email clients that don't support HTML
  const textContent = isExistingUser
    ? `
Hi there,

${senderName} wants to connect with you on CineMatch so you can share film recommendations and plan watch parties together.

Click the link below to accept their friend request:
${inviteLink}

Happy movie watching!

---
Powered by More Human | Contact: andy@more-human.co.uk
`
    : `
Hi there,

${senderName} has invited you to join CineMatch - a personalized film recommendation platform.

CineMatch helps you discover films that match your mood and preferences, and now you can share the experience with friends!

Use this link to create an account and connect with ${senderName}:
${inviteLink}

Happy movie watching!

---
Powered by More Human | Contact: andy@more-human.co.uk
If you didn't expect this invitation, you can safely ignore this email.
  `;
  
  // Create HTML content with inline styles for email compatibility
  let htmlContent = '';
  
  // Different HTML templates for new vs existing users
  if (isExistingUser) {
    // For existing users - simpler email focusing on the friend connection
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Friend Request on CineMatch</title>
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
    .friend-bubble {
      background-color: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
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
      text-align: center;
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
    <h1>New Friend Request</h1>
  </div>
  <div class="content">
    <div class="friend-bubble">
      <p><strong>${senderName}</strong> wants to connect with you on CineMatch 🎬</p>
    </div>
    
    <p>Connect with ${senderName} to share recommendations and plan movie nights together.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" class="button">Accept Friend Request</a>
    </div>
    
    <p>Once connected, you'll be able to:</p>
    <ul>
      <li>Share your favorite films and recommendations</li>
      <li>Create watch parties with shared preferences</li>
      <li>Discover movies that you'll both enjoy</li>
    </ul>
  </div>
  <div class="footer">
    <p>Powered by More Human | Contact: andy@more-human.co.uk</p>
  </div>
</body>
</html>`;
  } else {
    // For new users - more detailed email about the platform
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Friend Invitation to CineMatch</title>
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
    .friend-bubble {
      background-color: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
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
      text-align: center;
    }
    .features {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin: 20px 0;
    }
    .feature {
      flex: 1 0 45%;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 8px;
      min-width: 200px;
    }
    .feature-title {
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 5px;
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
    <h1>You've Been Invited to CineMatch!</h1>
  </div>
  <div class="content">
    <div class="friend-bubble">
      <p><strong>${senderName}</strong> has invited you to join CineMatch - a personalized film recommendation platform. 🎬</p>
    </div>
    
    <p>CineMatch helps you discover films that match your mood and preferences, and now you can share the experience with friends!</p>
    
    <div class="features">
      <div class="feature">
        <div class="feature-title">🎯 Personalized Recommendations</div>
        <p>Get film suggestions tailored to your mood and preferences</p>
      </div>
      <div class="feature">
        <div class="feature-title">👥 Watch with Friends</div>
        <p>Create viewing parties and get recommendations that everyone will enjoy</p>
      </div>
      <div class="feature">
        <div class="feature-title">📋 Build Your Watchlist</div>
        <p>Save films to watch later and track what you've seen</p>
      </div>
      <div class="feature">
        <div class="feature-title">🔍 Find Where to Stream</div>
        <p>See which of your services offer each recommended film</p>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" class="button">Accept Invitation & Join</a>
    </div>
    
    <p>When you accept this invitation, you'll be automatically connected with ${senderName} so you can share recommendations and create movie nights together.</p>
  </div>
  <div class="footer">
    <p>Powered by More Human | Contact: andy@more-human.co.uk</p>
    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>
</body>
</html>`;
  }

  return sendEmail({
    to: recipientEmail,
    subject,
    text: textContent,
    html: htmlContent
  });
}