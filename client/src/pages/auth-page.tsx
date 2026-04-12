import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SiGoogle } from "react-icons/si";

export default function AuthPage() {
  const { user } = useAuth();

  if (user) {
    return <Redirect to="/" />;
  }

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Sign in */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              CineMatch
            </CardTitle>
            <CardDescription>
              Sign in to get personalised movie recommendations
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-4 pt-2">
            <Button
              data-testid="button-google-signin"
              size="lg"
              className="w-full gap-3 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-50"
              onClick={handleGoogleSignIn}
            >
              <SiGoogle className="h-5 w-5" />
              Continue with Google
            </Button>

            <p className="text-xs text-center text-slate-500 mt-2">
              By signing in you agree to our{" "}
              <a
                href="https://material-wave-7a1.notion.site/Terms-of-Service-1cde201190c980039e7cdecc08746433?pvs=4"
                target="_blank"
                className="text-blue-500 hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://material-wave-7a1.notion.site/Privacy-Policy-1cde201190c980d4bb60d1ed8dff7b70?pvs=4"
                target="_blank"
                className="text-blue-500 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-b from-blue-400 to-cyan-500 flex-col justify-center items-center p-8 text-white">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold mb-4">The Right Movie For Right Now</h1>
          <p className="text-xl mb-6">
            CineMatch uses advanced AI to recommend movies based on your mood, time
            availability, and preferences.
          </p>
          <div className="space-y-4">
            {[
              {
                title: "Personalised Recommendations",
                desc: "Movies that match your unique preferences",
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
              },
              {
                title: "Discover Hidden Gems",
                desc: "Find amazing indie and foreign films",
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
              },
              {
                title: "Connect Your Streaming Services",
                desc: "Filter recommendations by what you can watch now",
                icon: "M12 6v6m0 0v6m0-6h6m-6 0H6",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start">
                <div className="bg-white/20 rounded-full p-2 mr-3 shrink-0">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={item.icon}
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-white/80">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
