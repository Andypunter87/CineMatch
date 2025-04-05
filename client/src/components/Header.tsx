import { Film } from "lucide-react";

export default function Header() {
  return (
    <header className="py-4 px-6 flex justify-between items-center border-b border-gray-800">
      <div className="flex items-center">
        <Film className="w-8 h-8 text-primary" />
        <h1 className="ml-2 text-xl md:text-2xl font-bold">CineMatch</h1>
      </div>
      <nav>
        <ul className="flex space-x-4">
          <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
          <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
        </ul>
      </nav>
    </header>
  );
}
