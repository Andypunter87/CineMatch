import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function PrivacyPage() {
  // Redirect to external Privacy Policy page
  useEffect(() => {
    window.location.href = "https://material-wave-7a1.notion.site/Privacy-Policy-1cde201190c980d4bb60d1ed8dff7b70?pvs=4";
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
      <p className="text-gray-600">Redirecting to Privacy Policy...</p>
    </div>
  );
}