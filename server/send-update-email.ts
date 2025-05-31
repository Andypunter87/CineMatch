import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Creates the CineMatch update email with proper styling and content
 */
function createUpdateEmailTemplate(): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CineMatch Update</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            background: #6366f1;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: -30px -30px 30px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .cta-button {
            display: inline-block;
            background: #6366f1;
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .feature {
            margin: 15px 0;
            padding: 10px 0;
        }
        .feature-icon {
            font-size: 18px;
            margin-right: 10px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .links a {
            color: #6366f1;
            text-decoration: none;
        }
        .links a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 CineMatch just got smarter (and friendlier)!</h1>
        </div>
        
        <p>I've been busy behind the scenes – and I am thrilled to let you know that a brand new version of <strong>CineMatch</strong> is now live! 🥳</p>
        
        <div style="text-align: center;">
            <a href="https://cinematch.replit.app" class="cta-button">Take me there!</a>
        </div>
        
        <h3>Here's what's new:</h3>
        
        <div class="feature">
            <span class="feature-icon">🌟</span><strong>Smarter recommendations</strong> – our upgraded engine uses your ratings and preferences more intelligently to serve up better film suggestions.
        </div>
        
        <div class="feature">
            <span class="feature-icon">👥</span><strong>Watch with friends</strong> – new <strong>blended recommendations</strong> help you find the perfect film to enjoy <em>together</em>, based on everyone's tastes.
        </div>
        
        <div class="feature">
            <span class="feature-icon">📺</span><strong>Streaming service matching</strong> – we've improved how we match films with the platforms you're actually subscribed to.
        </div>
        
        <div class="feature">
            <span class="feature-icon">🚀</span><strong>New onboarding experience</strong> – getting started (or restarting!) is easier than ever, with a guided journey to personalise your profile.
        </div>
        
        <p>To reflect these changes, we've updated our:</p>
        
        <div class="links">
            <p>• <a href="https://www.notion.so/20409efe06d180f59db7dac7f8c9fc29?pvs=21">Privacy Policy</a> – to explain how Firestore is used and what we do with your data</p>
            <p>• <a href="https://www.notion.so/20409efe06d180f59db7dac7f8c9fc29?pvs=21">Terms of Service</a> – to cover new features and clarify a few things</p>
        </div>
        
        <p>You can continue using CineMatch as usual, and by doing so you're agreeing to the updated terms. If you have any questions or would like your data removed, just reply to this email or drop us a line at <a href="mailto:andy@more-human.co.uk">andy@more-human.co.uk</a>.</p>
        
        <p>Thanks for being part of the CineMatch journey – we can't wait to help you discover your next favourite film. 🍿</p>
        
        <div class="footer">
            <p><strong>Thanks as always,</strong></p>
            <p>Andy</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Send the update email to a specific user
 */
async function sendUpdateEmail(email: string): Promise<boolean> {
  try {
    const emailContent = {
      to: email,
      from: 'andy@more-human.co.uk',
      subject: '🎬 Big CineMatch Update: New Features You\'ll Love + Privacy Policy Changes',
      html: createUpdateEmailTemplate(),
    };

    await mailService.send(emailContent);
    console.log(`Update email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending update email:', error);
    return false;
  }
}

/**
 * Send the update email to all users in the database
 */
async function sendToAllUsers() {
  console.log('Fetching all users from database...');
  
  try {
    // Import database connection
    const { db } = await import('./db');
    const { users } = await import('../shared/schema');
    
    const allUsers = await db.select({
      email: users.email,
      name: users.name
    }).from(users);
    
    console.log(`Found ${allUsers.length} users to email`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const user of allUsers) {
      if (user.email) {
        const success = await sendUpdateEmail(user.email);
        if (success) {
          successCount++;
          console.log(`✅ Sent to ${user.email}`);
        } else {
          failureCount++;
          console.log(`❌ Failed to send to ${user.email}`);
        }
        
        // Add a small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n📊 Email campaign completed:`);
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed to send: ${failureCount}`);
    console.log(`📧 Total attempted: ${allUsers.length}`);
    
  } catch (error) {
    console.error('Error sending emails to all users:', error);
  }
}

/**
 * Test sending the update email to a single user
 */
async function testSendUpdateEmail() {
  console.log('Sending test update email...');
  const success = await sendUpdateEmail('andy@more-human.co.uk');
  
  if (success) {
    console.log('✅ Test update email sent successfully!');
  } else {
    console.log('❌ Failed to send test update email');
  }
}

// Check command line arguments to determine which function to run
const args = process.argv.slice(2);
if (args.includes('--all')) {
  sendToAllUsers();
} else {
  testSendUpdateEmail();
}