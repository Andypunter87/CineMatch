import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Bookmark, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",                                 label: "Home",      Icon: Home },
  { href: "/watchlist?bypass_onboarding=true", label: "Watchlist", Icon: Bookmark },
  { href: "/profile",                          label: "Profile",   Icon: User },
];

export default function BottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  return (
    <nav
      style={{
        position: "sticky",
        bottom: 0,
        background: "#FAF6EE",
        borderTop: "1.5px dashed #1A1A1A",
        display: "flex",
        justifyContent: "space-around",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 40,
      }}
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const basePath = href.split("?")[0];
        const active = location === basePath;
        return (
          <Link key={href} href={href}>
            <span
              data-testid={`nav-${label.toLowerCase()}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "10px 20px",
                cursor: "pointer",
                color: active ? "#1A1A1A" : "#8A8478",
                textDecoration: "none",
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span
                style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
