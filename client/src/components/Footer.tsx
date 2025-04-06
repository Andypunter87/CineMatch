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
            <Link href="/terms" className="hover:text-blue-500 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-blue-500 transition-colors">
              Privacy Policy
            </Link>
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