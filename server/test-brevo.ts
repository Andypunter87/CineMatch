import { sendEmail } from './services/email';

/**
 * Test the Brevo integration
 */
async function testBrevo() {
  console.log('Testing Brevo integration...');
  
  if (!process.env.BREVO_API_KEY) {
    console.error('Cannot test: BREVO_API_KEY is not set');
    return;
  }
  
  try {
    const result = await sendEmail({
      to: 'andy@more-human.co.uk', // Test email address
      subject: 'Brevo Test from CineMatch',
      html: '<h1>Test Email</h1><p>This is a test email from CineMatch using Brevo.</p>',
      text: 'Test Email\n\nThis is a test email from CineMatch using Brevo.'
    });
    
    console.log('Brevo test result:', result);
    
    if (result) {
      console.log('✅ Brevo integration is working correctly!');
    } else {
      console.log('❌ Brevo integration failed');
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testBrevo().catch(console.error);