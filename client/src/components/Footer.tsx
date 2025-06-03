import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white shadow-sm py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col space-y-6 items-center">
          {/* TMDB Attribution */}
          <div className="flex flex-col items-center">
            <p className="text-xs text-gray-500 mb-2">Movie data provided by:</p>
            <a 
              href="https://www.themoviedb.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <img 
                src="/tmdb-logo.svg" 
                alt="The Movie Database (TMDB)" 
                className="h-6" 
              />
            </a>
          </div>
          
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row justify-between items-center text-sm text-gray-500 w-full">
            <div className="text-center md:text-left">
              <p>© {currentYear} CineMatch. All rights reserved.</p>
              <p className="mt-1">
                This service is powered by More Human. Contact{" "}
                <a 
                  href="mailto:andy@more-human.co.uk" 
                  className="text-blue-500 hover:underline"
                >
                  andy@more-human.co.uk
                </a>
                {" "}with any questions or comments.
              </p>
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
                href="mailto:andy@more-human.co.uk" 
                className="hover:text-blue-500 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}