# CineMatch - AI-Powered Film Recommendation Platform

## Overview

CineMatch is a sophisticated film recommendation platform that uses AI to provide personalized movie suggestions based on user preferences, mood, and viewing context. The application combines modern web technologies with AI services to deliver an intelligent, social movie discovery experience.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **State Management**: TanStack Query for server state management
- **Authentication**: Session-based authentication with Google OAuth 2.0 SSO
- **Build Tool**: Vite with hot module replacement for development

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ESM modules)
- **Framework**: Express.js for REST API endpoints
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: Anthropic Claude (claude-opus-4-5) for recommendation generation and mood analysis
- **External APIs**: TMDB for movie data and streaming availability
- **Image Processing**: Placid API for generating shareable mood cards
- **Email Service**: Brevo (formerly Sendinblue) for transactional emails

### Data Storage Solutions
- **Primary Database**: PostgreSQL with structured tables for users, watchlists, analytics, friends, recommendations, film_feedback, and chat_sessions
- **ORM**: Drizzle for type-safe database operations
- **Migrations**: `npm run db:push` via drizzle-kit

## Key Components

### Authentication & User Management
- Session-based authentication with Passport.js
- Google OAuth 2.0 (SSO) via Passport-Google-OAuth20
- User onboarding flow with film preference collection
- Social features including friend requests and shared recommendations

### AI-Powered Recommendation Engine
- Anthropic Claude integration for intelligent film matching
- Context-aware recommendations based on mood, time, location, and audience
- Feedback loop system using PostgreSQL (`film_feedback` table) for continuous learning
- Personalization through user rating history and preference analysis

### Monthly Mood Cards
- AI-generated mood analysis based on user's monthly film preferences
- Visual card generation using Placid API
- Automated email campaigns with shareable mood cards
- Public sharing pages for social media distribution

### Social Features
- Friend system with invitations and acceptance flow
- Shared recommendation sessions for group viewing
- Notification system for friend activities
- Email-based friend invitations with personalized messages

### Content Enhancement
- TMDB API integration for comprehensive movie metadata
- Streaming service availability by country
- High-quality poster images and movie details
- Runtime and rating information for better filtering

## Data Flow

### Recommendation Generation
1. User submits preferences (mood, audience, location, time)
2. System queries user's historical ratings and feedback from Firestore
3. Claude generates contextual recommendations with reasoning
4. TMDB API enhances results with metadata and streaming availability
5. Results are filtered by user's streaming services and country
6. Recommendations are stored for caching and analytics

### User Feedback Loop
1. User rates or provides feedback on recommended films
2. Feedback is stored in Firestore for real-time access
3. Future recommendations incorporate feedback patterns
4. System learns user preferences over time for improved personalization

### Social Interactions
1. Users can send friend requests via email or within the platform
2. Accepted friends can create shared recommendation sessions
3. Group preferences are blended for collaborative viewing suggestions
4. Notifications keep users informed of friend activities

## External Dependencies

### Core Services
- **Anthropic Claude API**: Film recommendation generation and mood analysis
- **TMDB API**: Movie metadata, images, and streaming availability
- **Firebase**: Real-time database for user preferences and social features
- **Brevo**: Email delivery for notifications and marketing
- **Placid API**: Dynamic image generation for mood cards

### Database & Infrastructure
- **PostgreSQL**: Primary data storage hosted on Neon or similar
- **Drizzle ORM**: Type-safe database operations
- **Express Session Store**: Session management with PostgreSQL backend

### Development Tools
- **Jest & React Testing Library**: Comprehensive testing framework
- **MSW**: API mocking for testing
- **ESBuild**: Fast JavaScript/TypeScript compilation
- **Tailwind CSS**: Utility-first styling framework

## Deployment Strategy

### Production Environment
- **Platform**: Replit with autoscale deployment
- **Build Process**: Vite builds client-side assets, ESBuild bundles server
- **Port Configuration**: Internal port 5000 mapped to external port 80
- **Environment Variables**: Managed through Replit secrets
- **SSL/HTTPS**: Automatic HTTPS enforcement with redirect middleware

### Development Workflow
- **Hot Reload**: Vite dev server with HMR for rapid development
- **Database Migrations**: Manual migration scripts for schema updates
- **Testing**: Jest-based testing with coverage reporting
- **Code Quality**: TypeScript strict mode with comprehensive type checking

### Environment Configuration
- Database connections handle both local PostgreSQL and cloud-hosted instances
- API keys and secrets managed through environment variables
- Graceful fallbacks for email services and external API failures
- CORS and security headers configured for production deployment

## iOS App Store Packaging

CineMatch is configured to be packaged as a native iOS app using [Capacitor](https://capacitorjs.com/). The Xcode project lives in the `ios/` directory and is ready to be opened and built on a Mac.

### What's Configured

- **Bundle ID**: `uk.co.cinematch.app`
- **App Name**: CineMatch
- **Minimum iOS Version**: 16.0
- **Web build directory**: `dist/public` (output of Vite build)
- **App icon**: 1024×1024 PNG at `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
- **Splash screen**: `ios/App/App/Assets.xcassets/Splash.imageset/`
- **Capacitor config**: `capacitor.config.ts` in the project root
- **Safe-area / notch support**: `env(safe-area-inset-*)` CSS variables applied globally
- **Native feel**: overscroll bounce disabled, tap highlight removed, text-size-adjust locked

### Developer Workflow (requires macOS + Xcode)

To build and submit to the App Store you need:
- A Mac running macOS 13+
- Xcode 15+ installed from the Mac App Store
- An Apple Developer Program account ($99/year)
- CocoaPods installed: `sudo gem install cocoapods`

**Steps after cloning the repo on a Mac:**

```bash
# 1. Install dependencies
npm install

# 2. Build the web app
npm run build

# 3. Sync the web build into the Xcode project and install pods
npx cap sync ios

# 4. Open the Xcode project
npx cap open ios
```

**Inside Xcode:**

1. Select your development team under *Signing & Capabilities*
2. Replace the placeholder app icon in `Assets.xcassets/AppIcon.appiconset` with your custom 1024×1024 PNG
3. Bump the version number / build number in the *General* tab
4. Choose *Any iOS Device (arm64)* as the build target
5. Select *Product → Archive* to create an App Store archive
6. Use *Organizer → Distribute App* to upload to App Store Connect

**After every code change (run all three in sequence):**

```bash
npm run build && npx cap sync ios && npx cap open ios
```

This is the equivalent of `npm run ios` — it rebuilds the web app, syncs assets into the Xcode project, and re-opens Xcode.

### Notes

- **Capacitor version**: All three packages (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`) are pinned to v7.x, which is compatible with Node.js 20 (the version in this Replit). Capacitor v8 requires Node.js 22+.
- **No `npm run ios` script**: A convenience `npm run ios` entry cannot be added to `package.json` in this environment (system restriction). Use the one-liner above directly in your terminal on macOS.
- CocoaPods is skipped in the Replit (Linux) environment — this is expected and harmless; the iOS native dependencies are installed when you run `npx cap sync ios` on macOS.
- `ios/App/App/public/` (synced web assets) is **committed to git** for immediate Xcode builds — no manual sync required on a fresh clone.
- The Replit web preview continues to work normally using the Vite dev server — the Capacitor setup only affects the native iOS build.
- To replace placeholder icons/splash screens, swap out the PNG files in `ios/App/App/Assets.xcassets/` and re-run `npx cap sync ios`.

## Changelog
- June 23, 2025: Implemented chat data persistence to Firestore
  - Created useChatPersistence hook for saving chat sessions and vibe preferences
  - Chat interactions now save complete conversation history to Firestore
  - Custom vibe preferences are tracked with frequency and source attribution
  - AI-generated personalized moods are saved for future reference
  - Chat sessions include full message history, user preferences, and custom data
  - Firestore collections: chat_sessions and vibe_preferences under users/{userId}
- June 23, 2025: Secured mood card features with admin-only access controls
  - All mood card API endpoints now require admin authentication
  - Mood card page routes protected from non-admin users
  - Public mood card sharing restricted to admin access only
  - Mood card generation features completely hidden from regular users
- June 23, 2025: Successfully implemented personalized mood label generation feature
  - OpenAI generates custom mood options based on user context (audience, time of day)
  - Fixed JSON parsing to handle markdown code blocks from OpenAI responses
  - Improved chat UI layout with responsive grid for better mood option readability
  - Verified personalized mood labels are passed to OpenAI for enhanced recommendations
  - Fixed onboarding state for test users to prevent unwanted redirects
- June 23, 2025: Fixed profile navigation and onboarding redirect issues
  - Updated server-side user retrieval to include onboarding_state field in queries
  - Fixed onboarding state parsing logic to properly detect completed users
  - Modified protected routes to use server-provided needsOnboarding field
  - Ensured users who complete onboarding never see onboarding flow again
  - Profile button now navigates directly to profile page without unwanted redirects
- June 23, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.