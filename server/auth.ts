import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendWelcomeEmail, sendAdminNewUserNotification } from "./services/email";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";
  const isHttps = !!process.env.REPLIT_DEV_DOMAIN || isProduction;

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      httpOnly: true,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Build the callback URL from environment
  const callbackURL = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
    : "http://localhost:5000/api/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value ?? `${profile.id}@google.invalid`;
          const name = profile.displayName ?? "";

          // 1. Try to find existing user by googleId (primary key for Google auth)
          let user = await storage.getUserByGoogleId(profile.id);

          if (!user) {
            // 2. Fallback: find by legacy providerId field
            user = await storage.getUserByProviderId(profile.id);
          }

          if (!user) {
            // 3. Try to find by email (existing local/password account — link it)
            user = await storage.getUserByEmail(email);
          }

          if (!user) {
            // 4. No existing account — create a new one
            user = await storage.createUser({
              username: email.split("@")[0],
              email,
              name,
              googleId: profile.id,
              providerId: profile.id,
              authProvider: "google",
              streamingServices: [],
              country: "",
              onboardingState: {
                completed: false,
                currentStep: "intro",
                progress: 0,
                lastUpdated: new Date().toISOString(),
              },
            });

            // Send welcome emails asynchronously
            if (email) {
              const safeName = name.trim() || "User";
              sendWelcomeEmail(safeName, email).catch((err) =>
                console.error("Welcome email error:", err)
              );
              sendAdminNewUserNotification(safeName, email).catch((err) =>
                console.error("Admin notification error:", err)
              );
            }

            // Track registration
            storage
              .trackEvent({
                eventType: "user_registration",
                userId: user.id,
                data: { registrationType: "google" } as Record<string, any>,
                ip: "unknown",
                userAgent: "unknown",
              })
              .catch((err) => console.error("Analytics error:", err));
          } else if (!user.googleId) {
            // Persist the Google ID linkage so future logins use the fast path
            user = await storage.updateUserGoogleId(user.id, profile.id);
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserWithFallback(id);
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  // ── Debug route — shows the exact OAuth URL + callback registered ─────────
  app.get("/api/auth/debug", (_req, res) => {
    res.json({
      callbackURL,
      clientIDPrefix: (process.env.GOOGLE_CLIENT_ID || "").slice(0, 12) + "...",
      replit_dev_domain: process.env.REPLIT_DEV_DOMAIN || null,
    });
  });

  // ── Session write test — verifies cookie+store round-trip ────────────────
  app.get("/api/auth/session-test", (req: any, res) => {
    req.session.testValue = Date.now();
    req.session.save((err: any) => {
      if (err) {
        console.error("[session-test] save error:", err);
        return res.status(500).json({ error: err.message });
      }
      console.log("[session-test] saved sid:", req.sessionID, "val:", req.session.testValue);
      res.json({ ok: true, sid: req.sessionID, val: req.session.testValue });
    });
  });

  // ── OAuth routes ──────────────────────────────────────────────────────────

  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      console.log("[OAuth callback] hit — query:", JSON.stringify(req.query));
      next();
    },
    passport.authenticate("google", { failureRedirect: "/auth?error=google" }),
    (_req, res) => {
      console.log("[OAuth callback] success");
      // If opened as a popup (/auth/success closes it & redirects opener)
      res.redirect("/auth/success");
    }
  );

  // ── Session / user routes ─────────────────────────────────────────────────

  app.post("/api/logout", (req, res, next) => {
    if (req.isAuthenticated()) {
      const userId = (req.user as SelectUser).id;
      storage
        .trackEvent({
          eventType: "user_logout",
          userId,
          data: {} as Record<string, any>,
          ip:
            req.ip ||
            (req.headers["x-forwarded-for"] as string) ||
            "unknown",
          userAgent: (req.headers["user-agent"] as string) || "unknown",
        })
        .catch((err) => console.error("Error tracking logout event:", err));
    }

    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { password, ...userWithoutPassword } = req.user as SelectUser;

    let needsOnboarding = true;
    if (userWithoutPassword.onboardingState) {
      try {
        const onboardingState =
          typeof userWithoutPassword.onboardingState === "string"
            ? JSON.parse(userWithoutPassword.onboardingState)
            : userWithoutPassword.onboardingState;
        needsOnboarding = !onboardingState.completed;
      } catch {
        needsOnboarding = true;
      }
    }

    res.json({ ...userWithoutPassword, needsOnboarding } as any);
  });

  app.put("/api/user/streaming", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { streamingServices } = req.body;
      const userId = (req.user as SelectUser).id;
      const updatedUser = await storage.updateUserStreamingServices(
        userId,
        streamingServices
      );
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/user/country", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { country } = req.body;
      const userId = (req.user as SelectUser).id;
      const updatedUser = await storage.updateUserCountry(userId, country);
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
}
