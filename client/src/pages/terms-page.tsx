import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function TermsPage() {
  // Redirect to external Terms of Service page
  useEffect(() => {
    window.location.href = "https://material-wave-7a1.notion.site/Terms-of-Service-1cde201190c980039e7cdecc08746433?pvs=4";
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
      <p className="text-gray-600">Redirecting to Terms of Service...</p>
    </div>
  );
}