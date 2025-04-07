import { sendAdminNewUserNotification } from './services/email';

async function testAdminNotification() {
  console.log('Testing admin notification email...');
  
  try {
    const result = await sendAdminNewUserNotification('Test User', 'test@example.com');
    
    if (result) {
      console.log('Admin notification email sent successfully!');
    } else {
      console.error('Failed to send admin notification email');
    }
  } catch (error) {
    console.error('Error sending admin notification email:', error);
  }
}

// Run the test
testAdminNotification().catch(console.error);