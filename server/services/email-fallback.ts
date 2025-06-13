import { User } from '@shared/schema';

// Fallback email service that logs email attempts
// This ensures the application continues functioning even if email service is misconfigured

const FROM_EMAIL = 'andy@more-human.co.uk';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

/**
 * Fallback email function that logs email details instead of sending
 * This prevents application crashes when email service is misconfigured
 */
export async function sendEmailFallback(options: EmailOptions): Promise<boolean> {
  console.log('=== EMAIL FALLBACK ACTIVE ===');
  console.log(`To: ${options.to}`);
  console.log(`From: ${FROM_EMAIL}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`HTML Content: ${options.html.substring(0, 200)}...`);
  console.log(`Text Content: ${options.text ? options.text.substring(0, 200) + '...' : 'Generated from HTML'}`);
  console.log('=== END EMAIL FALLBACK ===');
  
  // Return true to prevent application errors
  return true;
}

// Export all the same functions as the main email service
export async function sendAdminNewUserNotification(name: string, email: string): Promise<boolean> {
  return await sendEmailFallback({
    to: 'andy@more-human.co.uk',
    subject: '🎬 New CineMatch User Registration',
    html: `<h2>New user registered: ${name} (${email})</h2>`
  });
}

export async function sendWelcomeEmail(name: string, email: string): Promise<boolean> {
  return await sendEmailFallback({
    to: email,
    subject: '🎬 Welcome to CineMatch!',
    html: `<h1>Welcome ${name}!</h1><p>Thank you for joining CineMatch.</p>`
  });
}

export async function sendFriendInvitationEmail(
  senderName: string,
  recipientEmail: string,
  inviteCode: string,
  isExistingUser: boolean,
  senderEmail?: string,
  recipientName?: string
): Promise<boolean> {
  return await sendEmailFallback({
    to: recipientEmail,
    subject: `${senderName} invited you to CineMatch!`,
    html: `<h1>${senderName} invited you to join CineMatch!</h1>`
  });
}

export async function sendInvitationConfirmationEmail(
  senderName: string,
  senderEmail: string,
  recipientEmail: string,
  isExistingUser: boolean,
  recipientName?: string
): Promise<boolean> {
  return await sendEmailFallback({
    to: senderEmail,
    subject: `Friend invitation sent to ${recipientName || recipientEmail}`,
    html: `<h1>Invitation sent successfully!</h1>`
  });
}

export async function sendFriendRequestAcceptedEmails(
  requesterUser: User,
  accepterUser: User
): Promise<boolean> {
  const result1 = await sendEmailFallback({
    to: requesterUser.email,
    subject: `${accepterUser.name} accepted your friend request!`,
    html: `<h1>${accepterUser.name} accepted your friend request!</h1>`
  });
  
  const result2 = await sendEmailFallback({
    to: accepterUser.email,
    subject: `You're now friends with ${requesterUser.name}!`,
    html: `<h1>You're now friends with ${requesterUser.name}!</h1>`
  });
  
  return result1 && result2;
}