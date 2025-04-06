import Layout from "@/components/Layout";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-4">
          Last Updated: April 6, 2025
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
        <p>
          This Privacy Policy describes how CineMatch collects, uses, and discloses your information
          when you use our service. We are committed to protecting your privacy and the security of your personal information.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
        <p>
          We collect the following types of information:
        </p>
        <ul className="list-disc pl-8 my-4">
          <li><strong>Account Information:</strong> When you register for an account, we collect your email address, name (optional), and password.</li>
          <li><strong>Profile Information:</strong> We collect information about your streaming service subscriptions and country of residence to provide better recommendations.</li>
          <li><strong>Usage Information:</strong> We collect information about how you interact with our service, including your movie preferences, ratings, and watchlist items.</li>
          <li><strong>Device Information:</strong> We collect information about the device you use to access our service, including your IP address, browser type, and operating system.</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
        <p>
          We use your information for the following purposes:
        </p>
        <ul className="list-disc pl-8 my-4">
          <li>To provide and maintain our service, including to process your account registration and personalize your experience.</li>
          <li>To generate personalized movie recommendations based on your preferences, viewing history, and ratings.</li>
          <li>To filter recommendations based on availability on your selected streaming services in your country.</li>
          <li>To improve and optimize our recommendation algorithms and user experience.</li>
          <li>To communicate with you about service-related announcements or updates.</li>
          <li>To detect and prevent fraudulent or unauthorized use of our service.</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Information Sharing and Disclosure</h2>
        <p>
          We do not sell, trade, or otherwise transfer your personal information to outside parties except in the following circumstances:
        </p>
        <ul className="list-disc pl-8 my-4">
          <li>With service providers who assist us in operating our service and serving you.</li>
          <li>When required by law, such as to comply with a subpoena or similar legal process.</li>
          <li>When we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request.</li>
          <li>In connection with a merger, acquisition, or sale of all or a portion of our assets, in which case the acquiring company would acquire the same rights over your information that we describe in this Privacy Policy.</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Security</h2>
        <p>
          We implement reasonable security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee absolute security.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Choices and Rights</h2>
        <p>
          You have certain rights regarding your personal information:
        </p>
        <ul className="list-disc pl-8 my-4">
          <li>You can access, update, or delete your personal information through your account settings.</li>
          <li>You can choose not to provide certain information, although this may limit your ability to use certain features of our service.</li>
          <li>You can opt-out of receiving marketing communications from us.</li>
          <li>Depending on your location, you may have additional rights under applicable data protection laws.</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:
        </p>
        <p>
          Email: privacy@cinematch.app
        </p>
      </div>
    </div>
  );
}