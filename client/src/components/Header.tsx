import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, LogOut, Settings, Bookmark, BarChart, Users, MessageCircle } from "lucide-react";
import { NotificationBell } from "./notifications/NotificationBell";
import { PillBtn } from "./ui/cinematch/PillBtn";

export default function Header() {
  const { user, isLoading, logoutMutation } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsMenuOpen(false);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "#FAF6EE",
        borderBottom: "1.5px dashed #1A1A1A",
      }}
    >
      <div className="container px-4 py-3 mx-auto flex justify-between items-center">
        <Link href="/">
          <span
            data-testid="link-home-wordmark"
            style={{
              fontFamily: "Caveat, cursive",
              fontWeight: 700,
              fontSize: 28,
              color: "#1A1A1A",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            cinematch<span style={{ color: "#FF4D8F" }}>.</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="animate-spin h-5 w-5" style={{ color: "#8A8478" }} />
          ) : user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    data-testid="button-user-menu"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#FFC93C",
                      border: "2px solid #1A1A1A",
                      boxShadow: "2px 2px 0 #1A1A1A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "Caveat, cursive",
                      fontWeight: 700,
                      fontSize: 18,
                      color: "#1A1A1A",
                      cursor: "pointer",
                    }}
                  >
                    {(user.name || user.username || "?")[0].toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  style={{
                    background: "#FAF6EE",
                    border: "1.5px solid #1A1A1A",
                    borderRadius: 12,
                    boxShadow: "3px 3px 0 #1A1A1A",
                  }}
                >
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
                  {user.isAdmin && (
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                        <BarChart className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link href="/auth">
              <PillBtn data-testid="button-signin" size="sm">
                sign in
              </PillBtn>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
