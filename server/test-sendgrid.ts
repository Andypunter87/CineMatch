import { sendEmail } from './services/email';

/**
 * Test the SendGrid integration
 */
async function testSendgrid() {
  console.log('Testing SendGrid integration...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('Cannot test: SENDGRID_API_KEY is not set');
    return;
  }
  
  try {
    const result = await sendEmail({
      to: 'test@example.com', // This should be a valid email for testing
      subject: 'SendGrid Test from CineMatch',
      html: '<h1>Test Email</h1><p>This is a test email from CineMatch.</p>'
    });
    
    console.log('SendGrid test result:', result);
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testSendgrid().catch(console.error);