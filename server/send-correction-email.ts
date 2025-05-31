import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Creates the correction email with proper styling and content
 */
function createCorrectionEmailTemplate(): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CineMatch Correction</title>
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
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 Woopsie!</h1>
        </div>
        
        <p>In all the excitement I sent out the wrong link to get you back to the app!</p>
        
        <div style="text-align: center;">
            <a href="https://cine-match.replit.app/" class="cta-button">Take Me To CineMatch</a>
        </div>
        
        <div class="footer">
            <p><strong>Thanks!</strong></p>
            <p>Andy</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Send the correction email to a specific user
 */
async function sendCorrectionEmail(email: string): Promise<boolean> {
  try {
    const emailContent = {
      to: email,
      from: 'andy@more-human.co.uk',
      subject: 'Woopsie!',
      html: createCorrectionEmailTemplate(),
    };

    await mailService.send(emailContent);
    console.log(`Correction email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending correction email:', error);
    return false;
  }
}

/**
 * Test sending the correction email
 */
async function testSendCorrectionEmail() {
  console.log('Sending correction email to andy@more-human.co.uk...');
  const success = await sendCorrectionEmail('andy@more-human.co.uk');
  
  if (success) {
    console.log('✅ Correction email sent successfully!');
  } else {
    console.log('❌ Failed to send correction email');
  }
}

/**
 * Send the correction email to all users in the database
 */
async function sendToAllUsers() {
  console.log('Fetching all users from database...');
  
  try {
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
        const success = await sendCorrectionEmail(user.email);
        if (success) {
          console.log(`✅ Sent to ${user.email}`);
          successCount++;
        } else {
          console.log(`❌ Failed to send to ${user.email}`);
          failureCount++;
        }
        
        // Add delay between emails to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n📊 Email campaign complete:`);
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed to send: ${failureCount}`);
    console.log(`📧 Total attempted: ${allUsers.length}`);
    
  } catch (error) {
    console.error('Error sending emails to all users:', error);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--all')) {
  sendToAllUsers();
} else {
  testSendCorrectionEmail();
}