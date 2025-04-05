import { Film } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto py-6 px-4 border-t border-gray-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center">
            <Film className="w-6 h-6 text-primary" />
            <span className="ml-2 font-bold">CineMatch</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Find your perfect film match</p>
        </div>
        <div className="flex space-x-6">
          <a href="#" className="text-gray-400 hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="text-gray-400 hover:text-primary transition-colors">Terms of Service</a>
          <a href="#" className="text-gray-400 hover:text-primary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
