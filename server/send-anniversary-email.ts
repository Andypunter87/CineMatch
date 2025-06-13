import { sendEmail } from './services/email';
import { db } from './db';
import { users } from '@shared/schema';

// Check if Brevo API key is available
if (!process.env.BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY environment variable is not set");
}

/**
 * Creates a rich HTML email with CineMatch branding for the anniversary announcement
 * @param firstName User's first name for personalization
 * @returns HTML content for the email
 */
function createEmailTemplate(firstName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CineMatch Weekly Update</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      max-width: 200px;
      margin-bottom: 20px;
    }
    h1 {
      color: #3B82F6;
      margin-bottom: 20px;
      font-weight: 700;
    }
    .content {
      background-color: #ffffff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.1);
    }
    .feature-list {
      margin: 20px 0;
    }
    .feature {
      margin-bottom: 10px;
    }
    .emoji {
      margin-right: 8px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 14px;
      color: #666;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(to right, #3B82F6, #60A5FA);
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-weight: 600;
      margin: 20px 0;
    }
    .highlight {
      background: linear-gradient(to right, #3B82F6, #60A5FA);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>CineMatch</h1>
      <div>The Right Movie For Right Now</div>
    </div>
    
    <div class="content">
      <p>Dear ${firstName},</p>
      
      <p><span class="highlight">CineMatch is officially one week old!</span> 🎉</p>
      <p>I just wanted to say a huge thank you for giving us a try. Honestly, I've been blown away by the enthusiasm so many of you have shown — and by how generous you've been with your feedback. It's made a big difference.</p>
      
      <p>In fact, thanks to your ideas, we've already rolled out a bunch of updates:</p>
      
      <div class="feature-list">
        <div class="feature"><span class="emoji">✨</span> <strong>Movie Poster Art</strong> – your recommendations now come with posters, so they're more memorable (and a bit more fun to scroll through).</div>
        <div class="feature"><span class="emoji">⏱️</span> <strong>Run Time Filter</strong> – want a tight 90-minute watch? Now you can lock it in.</div>
        <div class="feature"><span class="emoji">📺</span> <strong>Smarter Streaming Matches</strong> – better syncing with your services = more useful suggestions.</div>
        <div class="feature"><span class="emoji">👍</span> <strong>Thumbs Up / Down Feedback</strong> – helping us learn what you like, so we can improve over time.</div>
        <div class="feature"><span class="emoji">👯</span> <strong>Group Watch Mode</strong> – choose "Date Night" or "Group Watch Party" in the quiz and invite a friend to get joint recommendations.</div>
        <div class="feature"><span class="emoji">👨‍👩‍👧‍👦</span> <strong>Family-Friendly Options</strong> – because, let's face it, Death Wish probably isn't one for the kids…</div>
      </div>
      
      <p>There's still loads I'd love to build — but if there's something you'd love to see, or something that could be better, just hit reply. I'm all ears.</p>
      
      <p>And finally, one tiny favour:</p>
      <p>If you've enjoyed using CineMatch and want to help keep it growing, please tell a friend about us! Word of mouth means the world at this stage.</p>
      
      <div style="text-align: center;">
        <a href="https://cinematch.app" class="cta-button">Visit CineMatch</a>
      </div>
      
      <p>Thanks again for being part of the journey.</p>
      
      <p>Cheers,<br>Andy</p>
    </div>
    
    <div class="footer">
      <p>© 2025 CineMatch. All rights reserved.</p>
      <p>If you'd prefer not to receive these updates, you can <a href="#">unsubscribe</a>.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends the anniversary email to the specified user
 * @param email User's email address
 * @param name User's name
 * @returns True if email sent successfully, false otherwise
 */
async function sendAnniversaryEmail(email: string, name: string): Promise<boolean> {
  // Parse first name from full name
  const firstName = name.split(' ')[0];
  
  try {
    const htmlContent = createEmailTemplate(firstName);
    
    const success = await sendEmail({
      to: email,
      subject: "We turned one (week)! Here's what we learned",
      html: htmlContent,
      text: "Dear " + firstName + ",\n\n" + 
      "CineMatch is officially one week old! 🎉\n\n" + 
      "I just wanted to say a huge thank you for giving us a try. Honestly, I've been blown away by the enthusiasm so many of you have shown — and by how generous you've been with your feedback. It's made a big difference.\n\n" + 
      "In fact, thanks to your ideas, we've already rolled out a bunch of updates:\n\n" + 
      "✨ Movie Poster Art – your recommendations now come with posters, so they're more memorable.\n" + 
      "⏱ Run Time Filter – want a tight 90-minute watch? Now you can lock it in.\n" + 
      "📺 Smarter Streaming Matches – better syncing with your services = more useful suggestions.\n" + 
      "👍 Thumbs Up / Down Feedback – helping us learn what you like, so we can improve over time.\n" + 
      "👯 Group Watch Mode – choose \"Date Night\" or \"Group Watch\" in the quiz for joint recommendations.\n" + 
      "👨‍👩‍👧‍👦 Family-Friendly Options – because, let's face it, Death Wish probably isn't for kids.\n\n" + 
      "There's still loads I'd love to build — but if there's something you'd love to see, or something that could be better, just hit reply. I'm all ears.\n\n" + 
      "And finally, one tiny favour:\n" + 
      "If you've enjoyed using CineMatch and want to help keep it growing, please tell a friend about us! Word of mouth means the world at this stage.\n\n" + 
      "Thanks again for being part of the journey.\n\n" + 
      "Cheers,\n" + 
      "Andy"
    });
    
    if (!success) {
      throw new Error('Failed to send email via Brevo');
    }
    
    console.log(`Anniversary email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error(`Error sending anniversary email to ${email}:`, error);
    return false;
  }
}

/**
 * Test sending the anniversary email to a single user
 */
async function testSendAnniversaryEmail() {
  // Get a test user (admin is a good choice for testing)
  const admin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.isAdmin, true)
  });
  
  if (!admin) {
    console.error("No admin user found for testing. Please create a user with isAdmin=true.");
    return;
  }
  
  console.log(`Sending test email to ${admin.email}...`);
  const success = await sendAnniversaryEmail(admin.email, admin.name || 'User');
  
  if (success) {
    console.log(`Test email sent successfully to ${admin.email}`);
  } else {
    console.error(`Failed to send test email to ${admin.email}`);
  }
}

/**
 * Send the anniversary email to all users
 */
async function sendToAllUsers() {
  // Get all active users
  const allUsers = await db.query.users.findMany();
  
  console.log(`Found ${allUsers.length} users to email`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const user of allUsers) {
    if (!user.email) {
      console.warn(`User ID ${user.id} has no email address, skipping`);
      continue;
    }
    
    const success = await sendAnniversaryEmail(user.email, user.name || 'CineMatch User');
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Add a small delay between sends to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`Email campaign complete: ${successCount} sent successfully, ${failureCount} failed`);
}

// If run directly, send a test email
if (process.argv[2] === '--all') {
  sendToAllUsers()
    .then(() => {
      console.log("Send to all users completed");
      process.exit(0);
    })
    .catch(error => {
      console.error("Error sending to all users:", error);
      process.exit(1);
    });
} else {
  testSendAnniversaryEmail()
    .then(() => {
      console.log("Test completed");
      process.exit(0);
    })
    .catch(error => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}