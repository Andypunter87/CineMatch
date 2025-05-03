import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, User, LogOut, Settings, Bookmark, Home, BarChart, Users, Bug } from "lucide-react";
import { NotificationBell } from "./notifications/NotificationBell";

export default function Header() {
  const { user, isLoading, logoutMutation } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Debug log to check user admin status
  console.log("User data in header:", user);

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsMenuOpen(false);
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container px-4 py-3 mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent cursor-pointer">
              CineMatch
            </span>
          </Link>
          
          {user && (
            <nav className="hidden sm:flex items-center gap-4">
              <Link href="/">
                <span className="flex items-center text-sm font-medium hover:text-blue-500 transition-colors">
                  <Home className="mr-1 h-4 w-4" />
                  Home
                </span>
              </Link>
              <Link href="/watchlist">
                <span className="flex items-center text-sm font-medium hover:text-blue-500 transition-colors">
                  <Bookmark className="mr-1 h-4 w-4" />
                  Watchlist
                </span>
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <Loader2 className="animate-spin text-slate-500 h-5 w-5" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm hidden sm:inline-block">
                Welcome, {user.name || user.username}
              </span>
              <NotificationBell />
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/watchlist">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                      <Bookmark className="mr-2 h-4 w-4" />
                      <span>My Watchlist</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/friends">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>My Friends</span>
                    </DropdownMenuItem>
                  </Link>
                  {user.isAdmin && (
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                        <BarChart className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {/* Debug menu options for Firebase auth */}
                  <Link href="/firebase-auth-debug">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                      <Bug className="mr-2 h-4 w-4" />
                      <span>Firebase Debug</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="inline-flex gap-1 items-center">
              <Link href="/auth">
                <Button size="sm" variant="ghost">Log in</Button>
              </Link>
              <Link href="/auth">
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
                >
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}