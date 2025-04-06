import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white shadow-sm py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <div className="mb-4 md:mb-0">
            <p>© {currentYear} CineMatch. All rights reserved.</p>
          </div>
          
          <div className="flex space-x-6">
            <a 
              href="https://material-wave-7a1.notion.site/Terms-of-Service-1cde201190c980039e7cdecc08746433?pvs=4"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
            >
              Terms of Service
            </a>
            <a 
              href="https://material-wave-7a1.notion.site/Privacy-Policy-1cde201190c980d4bb60d1ed8dff7b70?pvs=4"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
            >
              Privacy Policy
            </a>
            <a 
              href="mailto:support@cinematch.app" 
              className="hover:text-blue-500 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}