import { sendWelcomeEmail } from './services/email';

/**
 * Test sending a welcome email
 */
async function testWelcomeEmail() {
  console.log('Sending welcome email to andy@more-human.co.uk...');
  
  try {
    const result = await sendWelcomeEmail('Andy', 'andy@more-human.co.uk');
    
    if (result) {
      console.log('✅ Welcome email sent successfully!');
    } else {
      console.log('❌ Welcome email failed to send');
    }
    
    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

// Run the test
testWelcomeEmail().catch(console.error);