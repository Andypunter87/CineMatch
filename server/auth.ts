import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, User as SelectUser } from "@shared/schema";
import { sendWelcomeEmail, sendAdminNewUserNotification } from "./services/email";
import { createFirebaseToken } from './firebase-admin';

declare global {
  namespace Express {
    interface User extends SelectUser {}
    
    interface Request {
      headers: {
        firebaseToken?: string;
        [key: string]: string | string[] | undefined;
      }
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string | null) {
  if (!stored) return false;
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Helper function to verify Firebase ID token
async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }
  
  try {
    // In a real implementation, you would verify the token using Firebase Admin SDK
    // This is a placeholder for the token verification logic
    // For now, we'll pass the token in the request for authentication in the route handler
    req.headers.firebaseToken = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "supersecretkey", // It's better to use a proper env variable for this
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' }, // Use email field for authentication
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          } else {
            return done(null, user);
          }
        } catch (error) {
          return done(error);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Get the user using a simplified query that won't fail if isAdmin doesn't exist yet
      // This is a fallback for the migration period
      const user = await storage.getUserWithFallback(id);
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { password, name, email, streamingServices, country } = req.body;

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Create the user with hashed password
      const userToCreate = {
        username: email.split('@')[0], // Generating username from email as a fallback
        email,
        name,
        password: await hashPassword(password),
        streamingServices: streamingServices || [],
        country,
        authProvider: "local",
        onboardingState: {
          completed: false,
          currentStep: "intro",
          progress: 0,
          lastUpdated: new Date().toISOString(),
        }
      };
      
      const user = await storage.createUser(userToCreate);

      // Send welcome email asynchronously (don't wait for it to complete)
      // Make sure name and email are properly sanitized
      const sanitizedName = (name || '').trim() || 'User';
      const sanitizedEmail = (email || '').trim();
      
      if (sanitizedEmail) {
        try {
          // Send welcome email to the user
          sendWelcomeEmail(sanitizedName, sanitizedEmail)
            .then(success => {
              if (success) {
                console.log(`Welcome email sent successfully to ${sanitizedEmail}`);
              } else {
                console.warn(`Failed to send welcome email to ${sanitizedEmail}`);
              }
            })
            .catch(error => {
              console.error(`Error sending welcome email to ${sanitizedEmail}:`, error);
            });
            
          // Send notification to admin
          sendAdminNewUserNotification(sanitizedName, sanitizedEmail)
            .then(success => {
              if (success) {
                console.log(`Admin notification sent successfully for new user: ${sanitizedEmail}`);
              } else {
                console.warn(`Failed to send admin notification for new user: ${sanitizedEmail}`);
              }
            })
            .catch(error => {
              console.error(`Error sending admin notification for new user: ${sanitizedEmail}:`, error);
            });
        } catch (emailError) {
          console.error(`Unexpected error attempting to send emails for new user ${sanitizedEmail}:`, emailError);
        }
      } else {
        console.warn('Cannot send emails: Invalid or missing email address');
      }

      // Track user registration analytics
      storage.trackEvent({
        eventType: 'user_registration',
        userId: user.id,
        data: {
          registrationType: 'email',
          country: country || 'unknown'
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking registration event:', err));
      
      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: Error | null, user: SelectUser | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      
      // Track login event
      storage.trackEvent({
        eventType: 'user_login',
        userId: user.id,
        data: {
          loginMethod: 'email',
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking login event:', err));
      
      // Generate Firebase token
      let firebaseToken: string | null = null;
      try {
        firebaseToken = await createFirebaseToken(user.id);
      } catch (tokenError) {
        console.error('Error generating Firebase token during login:', tokenError);
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password but with Firebase token
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json({
          ...userWithoutPassword,
          ...(firebaseToken ? { firebaseToken } : {}) // Only include token if available
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    if (req.isAuthenticated()) {
      const userId = (req.user as SelectUser).id;
      
      // Track logout event
      storage.trackEvent({
        eventType: 'user_logout',
        userId: userId,
        data: {} as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking logout event:', err));
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      // Generate a Firebase token for the user
      const firebaseToken = await createFirebaseToken(req.user.id);
      
      // Return user without password but with Firebase token
      const { password, ...userWithoutPassword } = req.user as SelectUser;
      res.json({
        ...userWithoutPassword,
        firebaseToken // Include the token in the response
      });
    } catch (error) {
      console.error('Error generating Firebase token:', error);
      // Still return the user even if token generation fails
      const { password, ...userWithoutPassword } = req.user as SelectUser;
      res.json(userWithoutPassword);
    }
  });

  app.put("/api/user/streaming", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const { streamingServices } = req.body;
      const userId = (req.user as SelectUser).id;
      
      // Update user's streaming services
      const updatedUser = await storage.updateUserStreamingServices(userId, streamingServices);
      
      // Return user without password
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
      
      // Update user's country
      const updatedUser = await storage.updateUserCountry(userId, country);
      
      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/user/password", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req.user as SelectUser).id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Verify current password
      const isMatch = await comparePasswords(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Update user's password
      const passwordHash = await hashPassword(newPassword);
      const updatedUser = await storage.updateUserPassword(userId, passwordHash);
      
      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  // Firebase Authentication Routes
  
  // Handle Google Sign-In
  app.post("/api/auth/google", verifyFirebaseToken, async (req, res, next) => {
    try {
      const { email, name, uid, photoURL } = req.body;
      
      // Check if the user already exists with this provider ID
      let user = await storage.getUserByProviderId(uid);
      
      if (!user) {
        // Check if email exists but not linked to this provider
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // If the user exists with this email but has a different provider,
          // we could update the provider ID or handle this case differently
          return res.status(400).json({ error: "Email already in use with a different authentication method" });
        }
        
        // Create a new user
        user = await storage.createUser({
          username: email.split('@')[0], // Generate username from email
          email,
          name,
          providerId: uid,
          authProvider: 'google',
          streamingServices: [],
          country: '',
          needsOnboarding: true // Flag for Google sign-in users to go through onboarding
        });
        
        // Send welcome email for new Google-authenticated users
        // Make sure name and email are properly sanitized
        const sanitizedName = (name || '').trim() || 'User';
        const sanitizedEmail = (email || '').trim();
        
        if (sanitizedEmail) {
          try {
            // Send welcome email to the user
            sendWelcomeEmail(sanitizedName, sanitizedEmail)
              .then(success => {
                if (success) {
                  console.log(`Welcome email sent successfully to ${sanitizedEmail} (Google Auth)`);
                } else {
                  console.warn(`Failed to send welcome email to ${sanitizedEmail} (Google Auth)`);
                }
              })
              .catch(error => {
                console.error(`Error sending welcome email to ${sanitizedEmail} (Google Auth):`, error);
              });
              
            // Send notification to admin
            sendAdminNewUserNotification(sanitizedName, sanitizedEmail)
              .then(success => {
                if (success) {
                  console.log(`Admin notification sent successfully for new user: ${sanitizedEmail} (Google Auth)`);
                } else {
                  console.warn(`Failed to send admin notification for new user: ${sanitizedEmail} (Google Auth)`);
                }
              })
              .catch(error => {
                console.error(`Error sending admin notification for new user: ${sanitizedEmail} (Google Auth):`, error);
              });
          } catch (emailError) {
            console.error(`Unexpected error attempting to send emails for new user ${sanitizedEmail} (Google Auth):`, emailError);
          }
        } else {
          console.warn('Cannot send emails for Google Auth: Invalid or missing email address');
        }
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });
}