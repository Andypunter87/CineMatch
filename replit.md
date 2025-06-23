# CineMatch - AI-Powered Film Recommendation Platform

## Overview

CineMatch is a sophisticated film recommendation platform that uses AI to provide personalized movie suggestions based on user preferences, mood, and viewing context. The application combines modern web technologies with AI services to deliver an intelligent, social movie discovery experience.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **State Management**: TanStack Query for server state management
- **Authentication**: Session-based authentication with Firebase integration
- **Build Tool**: Vite with hot module replacement for development

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ESM modules)
- **Framework**: Express.js for REST API endpoints
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: OpenAI GPT-4o for recommendation generation and mood analysis
- **External APIs**: TMDB for movie data and streaming availability
- **Image Processing**: Placid API for generating shareable mood cards
- **Email Service**: Brevo (formerly Sendinblue) for transactional emails

### Data Storage Solutions
- **Primary Database**: PostgreSQL with structured tables for users, watchlists, analytics, friends, and recommendations
- **Real-time Data**: Firestore for user preferences, feedback, and social features
- **ORM**: Drizzle for type-safe database operations
- **Migrations**: Custom migration system for database schema updates

## Key Components

### Authentication & User Management
- Session-based authentication with Passport.js
- Firebase Admin SDK for custom token generation
- User onboarding flow with film preference collection
- Social features including friend requests and shared recommendations

### AI-Powered Recommendation Engine
- OpenAI GPT-4o integration for intelligent film matching
- Context-aware recommendations based on mood, time, location, and audience
- Feedback loop system using Firestore for continuous learning
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
3. OpenAI generates contextual recommendations with reasoning
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
- **OpenAI API**: Film recommendation generation and mood analysis
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

## Changelog
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