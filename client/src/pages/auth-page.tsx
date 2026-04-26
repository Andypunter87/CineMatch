import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { SiGoogle } from "react-icons/si";
import { Cine } from "@/components/ui/cinematch/Cine";
import { FilmPoster } from "@/components/ui/cinematch/FilmPoster";
import { PillBtn } from "@/components/ui/cinematch/PillBtn";

const POSTER_STRIP: Array<{
  colors: [string, string, string];
  stripe: "horizontal" | "diagonal" | "vertical" | "burst" | "flame" | "splash" | "neon";
  rotate: number;
}> = [
  { colors: ["#E8A4C4", "#F0C8A8", "#C8A0B4"], stripe: "horizontal", rotate: -6 },
  { colors: ["#FF6B9D", "#FFB84D", "#4DBFB8"], stripe: "burst",      rotate: -3 },
  { colors: ["#1A3A5C", "#4A6B8C", "#2C4C6D"], stripe: "diagonal",   rotate:  0 },
  { colors: ["#E85D75", "#F4C2C2", "#A8455C"], stripe: "horizontal", rotate:  3 },
  { colors: ["#E91E63", "#1A1A2E", "#16213E"], stripe: "neon",       rotate:  6 },
];

export default function AuthPage() {
  const { user } = useAuth();

  if (user) {
    return <Redirect to="/" />;
  }

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 py-10"
      style={{
        background: "#FAF6EE",
        backgroundImage: `
          radial-gradient(circle at 15% 20%, rgba(255,201,60,0.12) 0%, transparent 40%),
          radial-gradient(circle at 85% 70%, rgba(255,77,143,0.08) 0%, transparent 45%)
        `,
      }}
    >
      <div className="w-full max-w-sm flex flex-col gap-5">
        {/* Poster strip */}
        <div className="flex justify-center gap-1.5 mb-1">
          {POSTER_STRIP.map((p, i) => (
            <FilmPoster
              key={i}
              colors={p.colors}
              stripe={p.stripe}
              width={46}
              height={64}
              style={{ transform: `rotate(${p.rotate}deg)` }}
            />
          ))}
        </div>

        {/* Wordmark */}
        <div>
          <p
            className="font-spaceMono text-inkSoft uppercase"
            style={{ fontSize: 10, letterSpacing: "0.2em" }}
          >
            welcome to
          </p>
          <h1
            className="font-caveat font-bold text-ink"
            style={{ fontSize: 52, lineHeight: 0.95, marginTop: 2 }}
          >
            cinematch<span className="text-pink">.</span>
          </h1>
          <p
            className="font-nunito text-inkSoft"
            style={{ fontSize: 14, lineHeight: 1.35, marginTop: 8 }}
          >
            find a film that fits tonight — no scrolling, just your vibe.
          </p>
        </div>

        {/* Cine intro card */}
        <div
          className="bg-paper2 rounded-2xl"
          style={{
            border: "2px solid #1A1A1A",
            padding: "12px 14px",
            boxShadow: "3px 3px 0 #1A1A1A",
          }}
        >
          <div className="flex gap-2.5 items-start">
            <Cine size={36} mood="happy" />
            <div>
              <p
                className="font-caveat font-bold text-ink"
                style={{ fontSize: 18, lineHeight: 1 }}
              >
                hi, i'm Cine!
              </p>
              <p
                className="font-nunito text-ink"
                style={{ fontSize: 13, lineHeight: 1.35, marginTop: 3 }}
              >
                sign in and i'll find your perfect film — just your vibe, no browsing.
              </p>
            </div>
          </div>
        </div>

        {/* Auth section */}
        <div className="flex flex-col gap-3">
          <p
            className="font-spaceMono text-inkSoft uppercase"
            style={{ fontSize: 10, letterSpacing: "0.2em" }}
          >
            create your account
          </p>

          {/* Google SSO button */}
          <button
            data-testid="button-google-signin"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center gap-3.5 bg-paper text-ink rounded-full"
            style={{
              padding: "13px 18px",
              border: "2px solid #1A1A1A",
              boxShadow: "3px 3px 0 #1A1A1A",
              cursor: "pointer",
              transition: "transform 0.08s, box-shadow 0.08s",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translate(2px,2px)";
              e.currentTarget.style.boxShadow = "1px 1px 0 #1A1A1A";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "3px 3px 0 #1A1A1A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "3px 3px 0 #1A1A1A";
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#4285F422",
                border: "1.5px solid #4285F444",
              }}
            >
              <SiGoogle size={16} color="#4285F4" />
            </div>
            <span
              className="font-nunito font-bold text-ink flex-1 text-left"
              style={{ fontSize: 15 }}
            >
              Continue with Google
            </span>
          </button>
        </div>

        {/* Footer */}
        <p
          className="font-spaceMono text-center text-inkLight"
          style={{ fontSize: 9, letterSpacing: "0.05em", lineHeight: 1.7 }}
        >
          by continuing you agree to our
          <br />
          <a
            href="https://material-wave-7a1.notion.site/Terms-of-Service-1cde201190c980039e7cdecc08746433?pvs=4"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            terms of service
          </a>
          {" · "}
          <a
            href="https://material-wave-7a1.notion.site/Privacy-Policy-1cde201190c980d4bb60d1ed8dff7b70?pvs=4"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            privacy policy
          </a>
        </p>
      </div>
    </div>
  );
}
