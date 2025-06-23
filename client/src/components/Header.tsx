import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, User, LogOut, Settings, Bookmark, Home, BarChart, Users, Bug, Database, Sparkles, MessageCircle } from "lucide-react";
import { NotificationBell } from "./notifications/NotificationBell";

interface MoodCardData {
  moodName: string;
  year: number;
  month: number;
}

export default function Header() {
  const { user, isLoading, logoutMutation } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [latestMoodCard, setLatestMoodCard] = useState<MoodCardData | null>(null);
  
  // Debug log to check user admin status
  console.log("User data in header:", user);

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsMenuOpen(false);
  };

  // Fetch latest mood card for the dropdown menu
  useEffect(() => {
    if (user) {
      const fetchLatestMoodCard = async () => {
        try {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1;

          let response = await fetch(`/api/mood-card/${year}/${month}`);
          
          if (response.status === 404) {
            // Try previous month
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            response = await fetch(`/api/mood-card/${prevYear}/${prevMonth}`);
          }

          if (response.ok) {
            const data = await response.json();
            setLatestMoodCard({
              moodName: data.moodName,
              year: data.year,
              month: data.month
            });
          }
        } catch (error) {
          // Silently handle error
        }
      };

      fetchLatestMoodCard();
    }
  }, [user]);

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
              <Link href="/watchlist?bypass_onboarding=true">
                <span className="flex items-center text-sm font-medium hover:text-blue-500 transition-colors">
                  <Bookmark className="mr-1 h-4 w-4" />
                  Watchlist
                </span>
              </Link>
              <Link href="/chat">
                <span className="flex items-center text-sm font-medium hover:text-blue-500 transition-colors">
                  <MessageCircle className="mr-1 h-4 w-4" />
                  Chat
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
                  <Link href="/watchlist?bypass_onboarding=true">
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
                  <Link href="/chat">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      <span>Chat with CineMate</span>
                    </DropdownMenuItem>
                  </Link>
                  {latestMoodCard && (
                    <Link href={`/mymood/${latestMoodCard.year}-${latestMoodCard.month.toString().padStart(2, '0')}`}>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        <span>My Monthly Mood</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {user.isAdmin && (
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                        <BarChart className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  
                  {user.isAdmin && (
                    <>
                      <div className="px-2 py-1.5">
                        <div className="h-px bg-border" />
                      </div>
                      
                      {/* Debug menu section - Admin only */}
                      <DropdownMenuItem className="flex items-center py-2 px-3 font-medium text-xs opacity-70 cursor-default">
                        <Bug className="mr-2 h-4 w-4" />
                        <span>Developer Debug Tools</span>
                      </DropdownMenuItem>
                      <Link href="/firebase-auth-debug">
                        <DropdownMenuItem className="cursor-pointer pl-6" onClick={() => setIsMenuOpen(false)}>
                          <span>Firebase Auth Debug</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/firestore-test-debug">
                        <DropdownMenuItem className="cursor-pointer pl-6" onClick={() => setIsMenuOpen(false)}>
                          <span>Firestore Debug</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/firestore-test">
                        <DropdownMenuItem className="cursor-pointer pl-6" onClick={() => setIsMenuOpen(false)}>
                          <span>Firestore Test</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/firestore-test-report">
                        <DropdownMenuItem className="cursor-pointer pl-6" onClick={() => setIsMenuOpen(false)}>
                          <span>Firestore Report</span>
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
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