import * as brevo from '@getbrevo/brevo';
import { User } from '@shared/schema';

// Initialize Brevo with API key
let brevoInitialized = false;

// For development/debugging purposes only
const DEBUG_MODE = false;

// Sender email address - using the verified sender email
const FROM_EMAIL = 'andy@more-human.co.uk';

// Check if Brevo API key is available
if (!process.env.BREVO_API_KEY) {
  console.warn('BREVO_API_KEY not found. Email functionality will not work.');
} else {
  brevoInitialized = true;
  console.log('Brevo initialized successfully');
}

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

/**
 * Send an email using Brevo
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
    
    // Check if Brevo is properly initialized
    if (!brevoInitialized) {
      console.error('Cannot send email: Brevo is not properly initialized');
      
      if (!process.env.BREVO_API_KEY) {
        console.error('Cannot send email: BREVO_API_KEY is not set');
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

    // Use Brevo API directly with fetch
    const brevoUrl = 'https://api.brevo.com/v3/smtp/email';
    
    const emailData = {
      sender: { email: FROM_EMAIL, name: 'CineMatch' },
      to: [{ email: options.to }],
      subject: options.subject,
      textContent: textContent,
      htmlContent: htmlContent || undefined
    };

    try {
      const response = await fetch(brevoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY!
        },
        body: JSON.stringify(emailData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo API error: ${response.status} - ${errorText}`);
      }
      console.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (sendError: any) {
      // Log detailed Brevo error information
      console.error('Error sending email:', sendError.toString());
      
      // If we have response details, log them for debugging
      if (sendError.response && sendError.response.body) {
        const errorDetails = sendError.response.body;
        console.error('Brevo API error details:', JSON.stringify(errorDetails, null, 2));
      }
      
      // For now, we'll continue the app flow even if emails fail
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
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e5007d;">🎬 New CineMatch User Registration</h2>
      <p>A new user has registered on CineMatch:</p>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
      <p>Visit the <a href="https://cinematch.co.uk/admin">admin dashboard</a> to view more details.</p>
    </div>
  `;

  return await sendEmail({
    to: 'andy@more-human.co.uk',
    subject: '🎬 New CineMatch User Registration',
    html: htmlContent
  });
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(name: string, email: string): Promise<boolean> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #e5007d; font-size: 28px; margin: 0;">🎬 Welcome to CineMatch!</h1>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">Hi ${name},</p>
      
      <p style="font-size: 16px; line-height: 1.6;">
        Welcome to CineMatch - your personalized film recommendation platform! We're excited to help you discover your next favorite movie.
      </p>
      
      <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #e5007d; margin-top: 0;">🎯 What's Next?</h3>
        <ul style="line-height: 1.8;">
          <li>Complete your onboarding to get personalized recommendations</li>
          <li>Rate some films to improve your suggestions</li>
          <li>Explore our extensive movie database</li>
          <li>Build your watchlist for future viewing</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://cinematch.co.uk" 
           style="background-color: #e5007d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Start Exploring
        </a>
      </div>
      
      <p style="font-size: 14px; color: #888; margin-top: 30px;">
        Happy movie watching!<br>
        The CineMatch Team
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: '🎬 Welcome to CineMatch - Your Movie Journey Begins!',
    html: htmlContent
  });
}

/**
 * Send a friend invitation email to the recipient
 * @param senderName The name of the sender
 * @param recipientEmail The recipient's email address
 * @param inviteCode The invite code for linking
 * @param isExistingUser Whether the recipient is an existing user
 * @param senderEmail The email of the sender (for notifications)
 * @param recipientName Optional recipient name for personalization
 */
export async function sendFriendInvitationEmail(
  senderName: string,
  recipientEmail: string,
  inviteCode: string,
  isExistingUser: boolean,
  senderEmail?: string,
  recipientName?: string
): Promise<boolean> {
  const displayName = recipientName || 'there';
  const actionText = isExistingUser ? 'Accept Friend Request' : 'Join CineMatch & Connect';
  const baseUrl = 'https://cinematch.co.uk';
  const inviteUrl = `${baseUrl}${isExistingUser ? '/friends' : '/register'}?invite=${inviteCode}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #e5007d; font-size: 28px; margin: 0;">🎬 CineMatch Friend Invitation</h1>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">Hi ${displayName},</p>
      
      <p style="font-size: 16px; line-height: 1.6;">
        <strong>${senderName}</strong> has invited you to connect on CineMatch! 
        ${isExistingUser ? 
          'They want to share movie recommendations and discover films together.' : 
          'Join the platform to get personalized movie recommendations and connect with friends.'
        }
      </p>
      
      <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #e5007d; margin-top: 0;">🎯 What You'll Get:</h3>
        <ul style="line-height: 1.8;">
          <li>Personalized movie recommendations</li>
          <li>Share watchlists with friends</li>
          <li>Discover what your friends are watching</li>
          <li>Get social recommendations based on shared tastes</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" 
           style="background-color: #e5007d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          ${actionText}
        </a>
      </div>
      
      <p style="font-size: 14px; color: #888; margin-top: 30px;">
        This invitation was sent by ${senderName} (${senderEmail || 'CineMatch user'}).<br>
        If you don't want to receive these invitations, please ignore this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: recipientEmail,
    subject: `🎬 ${senderName} invited you to CineMatch!`,
    html: htmlContent
  });
}

/**
 * Send a confirmation email to the sender when they invite someone
 * @param senderName The name of the person who sent the invitation
 * @param senderEmail The email of the sender
 * @param recipientEmail The email of the person who was invited
 * @param isExistingUser Whether the recipient is an existing user
 * @param recipientName Optional recipient name for personalization
 */
export async function sendInvitationConfirmationEmail(
  senderName: string,
  senderEmail: string,
  recipientEmail: string,
  isExistingUser: boolean,
  recipientName?: string
): Promise<boolean> {
  const displayName = recipientName || recipientEmail;
  const statusText = isExistingUser ? 'existing CineMatch user' : 'new user';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #e5007d; font-size: 28px; margin: 0;">🎬 Invitation Sent!</h1>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">Hi ${senderName},</p>
      
      <p style="font-size: 16px; line-height: 1.6;">
        Your friend invitation has been sent successfully! We've emailed <strong>${displayName}</strong> 
        (${statusText}) at ${recipientEmail}.
      </p>
      
      <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #e5007d; margin-top: 0;">🎯 What happens next?</h3>
        <p style="line-height: 1.8; margin: 0;">
          ${isExistingUser ? 
            'They can accept your friend request from their CineMatch friends page, and you\'ll be notified when they do.' :
            'If they join CineMatch using your invitation, you\'ll automatically become friends and can start sharing recommendations!'
          }
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://cinematch.co.uk/friends" 
           style="background-color: #e5007d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Manage Friends
        </a>
      </div>
      
      <p style="font-size: 14px; color: #888; margin-top: 30px;">
        Thanks for helping grow the CineMatch community!<br>
        The CineMatch Team
      </p>
    </div>
  `;

  return await sendEmail({
    to: senderEmail,
    subject: `🎬 Friend invitation sent to ${displayName}`,
    html: htmlContent
  });
}

/**
 * Send notification emails when a friend request is accepted
 * This sends emails to both the requester and the accepter
 * @param requesterUser The user who initially sent the request
 * @param accepterUser The user who accepted the request
 */
export async function sendFriendRequestAcceptedEmails(
  requesterUser: User,
  accepterUser: User
): Promise<boolean> {
  // Email to the person who sent the original request
  const requesterHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #e5007d; font-size: 28px; margin: 0;">🎉 Friend Request Accepted!</h1>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">Hi ${requesterUser.name},</p>
      
      <p style="font-size: 16px; line-height: 1.6;">
        Great news! <strong>${accepterUser.name}</strong> has accepted your friend request on CineMatch. 
        You can now share movie recommendations and see what each other are watching!
      </p>
      
      <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #e5007d; margin-top: 0;">🎬 Start sharing:</h3>
        <ul style="line-height: 1.8;">
          <li>Check out ${accepterUser.name}'s watchlist</li>
          <li>Get recommendations based on shared interests</li>
          <li>See their latest movie ratings</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://cinematch.co.uk/friends" 
           style="background-color: #e5007d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Friends
        </a>
      </div>
    </div>
  `;

  // Email to the person who accepted the request
  const accepterHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #e5007d; font-size: 28px; margin: 0;">🎬 You're Now Friends!</h1>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">Hi ${accepterUser.name},</p>
      
      <p style="font-size: 16px; line-height: 1.6;">
        You've successfully connected with <strong>${requesterUser.name}</strong> on CineMatch! 
        Start exploring movies together and sharing your recommendations.
      </p>
      
      <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #e5007d; margin-top: 0;">🎯 Explore together:</h3>
        <ul style="line-height: 1.8;">
          <li>Browse ${requesterUser.name}'s favorite movies</li>
          <li>Get social recommendations</li>
          <li>Share your latest discoveries</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://cinematch.co.uk/friends" 
           style="background-color: #e5007d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Friends
        </a>
      </div>
    </div>
  `;

  // Send both emails
  const results = await Promise.all([
    sendEmail({
      to: requesterUser.email,
      subject: `🎉 ${accepterUser.name} accepted your friend request on CineMatch!`,
      html: requesterHtml
    }),
    sendEmail({
      to: accepterUser.email,
      subject: `🎬 You're now friends with ${requesterUser.name} on CineMatch!`,
      html: accepterHtml
    })
  ]);

  // Return true if both emails were sent successfully
  return results.every(result => result === true);
}