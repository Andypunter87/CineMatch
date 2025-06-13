# CineMatch Monthly Mood Cards

## Overview
The Monthly Mood Card feature generates personalized, shareable mood cards based on users' film preferences using OpenAI and Placid.app.

## Features Implemented

### 🧠 AI Mood Generation
- OpenAI GPT-4o analyzes user's top 5 films from each month
- Generates poetic mood names like "Bittersweet & Beautiful" or "French Existential Chaos"
- Creates matching subtitles, color schemes, and emojis

### 🎨 Visual Card Generation
- Integrates with Placid.app for beautiful, shareable images
- Fallback placeholder images when Placid is unavailable
- Customizable templates with user films and mood data

### 📧 Email Delivery
- Automated monthly email campaigns using Brevo SMTP
- Beautiful HTML emails with blue branding
- Personal mood card previews and sharing links

### 🔗 Shareable Landing Pages
- Public mood card viewing at `/mymood/YYYY-MM?uid=USER_ID`
- Social sharing buttons for Instagram, Twitter
- Download and copy link functionality

### 🗄️ Complete Database Integration
- New `monthly_mood_cards` table with full schema
- User relations and proper indexing
- Comprehensive API endpoints

## API Endpoints

### User Endpoints
- `GET /api/mood-card/:year/:month` - Get user's mood card
- `POST /api/mood-card/generate` - Generate mood card manually
- `GET /api/mood-card/public/:year/:month?uid=USER_ID` - Public sharing

### Admin Endpoints
- `POST /api/admin/mood-cards/generate` - Generate for all users

## Setup Requirements

### 1. Placid Template Creation
Create a template in your Placid dashboard with ID: `monthly-mood-card`

Template layers needed:
- `mood_name` (text)
- `subtitle` (text) 
- `film_1` through `film_5` (text)
- `bg_colour` (background color)
- `poster_img` (image, optional)

### 2. Environment Variables
All required secrets are already configured:
- `OPENAI_API_KEY` ✓
- `PLACID_API_KEY` ✓
- `BREVO_SMTP_LOGIN` ✓
- `BREVO_SMTP_PASSWORD` ✓

### 3. Database
The `monthly_mood_cards` table is created and ready.

## Usage

### Manual Generation
Users can generate mood cards manually via the API or admin interface.

### Automated Monthly Generation
Set up a monthly cron job to run:
```bash
curl -X POST https://cinematch.co.uk/api/admin/mood-cards/generate \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "month": 1}' \
  -u admin:password
```

### Frontend Access
Users can view mood cards at:
- `/mymood/2025-01` (authenticated users)
- `/mymood/2025-01?uid=123` (public sharing)

## Files Created

### Backend Services
- `server/services/mood-generation.ts` - OpenAI integration
- `server/services/placid.ts` - Image generation
- `server/services/monthly-mood-cards.ts` - Core business logic
- `server/test-mood-cards.ts` - Comprehensive testing

### Frontend Components
- `client/src/pages/MoodCard.tsx` - Mood card viewing and sharing
- Added route in `client/src/App.tsx`

### Database Schema
- Added `monthlyMoodCards` table and relations in `shared/schema.ts`
- API routes added to `server/routes.ts`

## Testing Results

The comprehensive test suite verified:
✅ OpenAI mood generation working perfectly
✅ Database operations successful
✅ Email integration ready
✅ Frontend components implemented
⚠️ Placid requires template setup (fallback working)

## Next Steps

1. Create the `monthly-mood-card` template in your Placid dashboard
2. Set up monthly automation (cron job or scheduled task)
3. Monitor user engagement and iterate on mood generation prompts
4. Consider adding mood card history and comparison features

The Monthly Mood Card system is production-ready and will provide users with delightful, shareable monthly summaries of their film preferences.