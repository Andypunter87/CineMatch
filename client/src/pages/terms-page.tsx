import Layout from "@/components/Layout";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-4">
          Last Updated: April 6, 2025
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
        <p>
          Welcome to CineMatch. These Terms of Service govern your use of our website and services.
          By accessing or using CineMatch, you agree to be bound by these Terms.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
        <p>
          CineMatch provides personalized movie recommendations based on user preferences, including mood, 
          time availability, and personal taste. Our platform uses artificial intelligence to suggest 
          both mainstream Hollywood films and lesser-known indie or foreign films that match your criteria.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Accounts</h2>
        <p>
          To use certain features of our Service, you need to create an account. You are responsible 
          for maintaining the confidentiality of your account information and for all activities that 
          occur under your account. You agree to notify us immediately of any unauthorized use of your account.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">4. User Data</h2>
        <p>
          Our collection and use of personal information in connection with the Service is described 
          in our Privacy Policy. By using the Service, you consent to our collection and use of your 
          personal information as described in our Privacy Policy.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Prohibited Uses</h2>
        <p>
          You agree not to use the Service to:
        </p>
        <ul className="list-disc pl-8 my-4">
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe the rights of any third party</li>
          <li>Transmit any material that is defamatory, offensive, or otherwise objectionable</li>
          <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
          <li>Attempt to gain unauthorized access to any part of the Service</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Intellectual Property</h2>
        <p>
          The Service and its contents, including but not limited to text, graphics, logos, icons, 
          and software, are the property of CineMatch or its licensors and are protected by copyright, 
          trademark, and other intellectual property laws.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND, 
          EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, 
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Limitation of Liability</h2>
        <p>
          IN NO EVENT SHALL CINEMATCH BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, 
          OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, 
          OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS 
          OR USE THE SERVICE.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will provide notice of any material 
          changes to these Terms by posting the new Terms on the Service and updating the "Last Updated" date.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Contact Information</h2>
        <p>
          If you have any questions about these Terms, please contact us at support@cinematch.app.
        </p>
      </div>
    </div>
  );
}