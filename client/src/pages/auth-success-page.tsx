import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthSuccessPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If we were opened as a popup, close it and redirect the opener
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.location.href = "/";
      } catch {
        // cross-origin fallback — opener handles polling
      }
      window.close();
    } else {
      // Direct navigation (non-popup flow) — just go home
      setLocation("/");
    }
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <p className="font-nunito text-inkSoft text-sm">Signing you in…</p>
    </div>
  );
}
