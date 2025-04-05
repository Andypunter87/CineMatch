import { Film } from "lucide-react";

export default function Header() {
  return (
    <header className="py-4 px-6 flex justify-between items-center border-b border-blue-200 bg-white shadow-sm">
      <div className="flex items-center">
        <Film className="w-8 h-8 text-primary" />
        <h1 className="ml-2 text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">CineMatch</h1>
      </div>
      <nav>
        <ul className="flex space-x-4">
          <li><a href="#" className="text-gray-600 hover:text-primary transition-colors">About</a></li>
          <li><a href="#" className="text-gray-600 hover:text-primary transition-colors">FAQ</a></li>
        </ul>
      </nav>
    </header>
  );
}
