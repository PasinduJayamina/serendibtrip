# 🌴 SerendibTrip — AI-Powered Travel Planner for Sri Lanka

A modern, full-stack web application that helps travelers plan personalized trips to Sri Lanka using **AI-powered recommendations**, **real-time weather intelligence**, **interactive maps**, and **smart budget tracking**.

---

## ✨ Features

### 🤖 AI-Powered Planning

- **Smart Itinerary Generation** — Gemini AI creates personalized day-by-day itineraries based on your preferences, budget, and travel style
- **AI Chat Concierge** — Ask travel questions and get instant, context-aware answers about Sri Lanka
- **Smart Packing Lists** — AI-generated packing suggestions based on destination, weather, and activities
- **Cost Optimization** — AI recommends verified hotels and activities matched to your budget tier

### 🗺️ Interactive Maps & Discovery

- **Live Attraction Map** — Leaflet-powered map with pins for all recommended places
- **Google Maps Integration** — One-click directions to any activity or restaurant
- **Geocoded Locations** — Accurate map pins via Google Geocoding API

### 🌤️ Weather Intelligence

- **Real-time Weather** — Current conditions and 5-day forecast for any destination
- **Trip Weather Analysis** — Shows which days are best for outdoor activities
- **Outfit Suggestions** — What to wear based on temperature, rain, and humidity
- **Smart Alerts** — Pack rain gear, sunscreen, or layers based on forecast

### 💰 Budget & Expense Tracking

- **Per-Trip Budgets** — Set and track budgets for each trip
- **Category Breakdown** — Accommodation, food, transport, activities, and misc
- **Paid/Unpaid Tracking** — Mark items as paid with per-day tracking
- **Budget Alerts** — Warnings when approaching or exceeding budget limits
- **Daily Budget Calculator** — Per-person daily allowance

### 📋 Trip Management

- **Multi-Trip Support** — Plan and manage multiple trips simultaneously
- **Day-by-Day Itinerary** — Drag activities between days
- **Add More Mode** — Return to recommendations to add items to existing trips
- **Trip Date Overlap Detection** — Warns when trips have conflicting dates
- **Cloud Sync** — Saved items sync to backend for authenticated users

### 🔐 Authentication & Security

- **JWT Authentication** — Secure token-based auth with expiry
- **Password Reset** — Email-based reset flow via Gmail SMTP
- **Rate Limiting** — Separate limits for general, auth, and password reset routes
- **Helmet Security Headers** — HTTP security best practices
- **Guest Mode** — Limited AI chat access (3 messages) without sign-up

### 🌙 UI/UX

- **Dark/Light Theme** — System-aware with manual toggle
- **Responsive Design** — Mobile-first with bottom tab navigation
- **i18n Ready** — Translation-ready with `react-i18next`
- **Smooth Animations** — Micro-interactions and transitions throughout

---

## 🛠️ Tech Stack

### Frontend

| Technology         | Purpose                      |
| ------------------ | ---------------------------- |
| React 19 + Vite    | UI framework & build tool    |
| Tailwind CSS 3     | Utility-first styling        |
| Zustand            | State management (persisted) |
| React Router 7     | Client-side routing          |
| React Leaflet      | Interactive maps             |
| React Hook Form    | Form handling & validation   |
| Lucide & Heroicons | Icon libraries               |
| date-fns           | Date formatting              |
| react-i18next      | Internationalization         |

### Backend

| Technology         | Purpose                                    |
| ------------------ | ------------------------------------------ |
| Node.js + Express  | REST API server                            |
| MongoDB + Mongoose | Database & ODM                             |
| JWT + bcryptjs     | Authentication & password hashing          |
| Helmet             | Security middleware                        |
| express-rate-limit | Rate limiting                              |
| Nodemailer         | Email (password reset & trip reminders)    |
| node-cron          | Scheduled tasks (cache cleanup, reminders) |

### External APIs

| API                     | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| Google Gemini           | AI itinerary generation, chat, packing lists |
| OpenWeatherMap          | Weather data & forecasts                     |
| Google Maps / Geocoding | Location data & map links                    |

---

## 📁 Project Structure

```
serendibtrip/
├── frontend/                       # React Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── itinerary/          # Timeline, DayCard, ActivityCard
│   │   │   ├── recommendations/    # RecommendationPanel, RecommendationCard
│   │   │   ├── profile/            # ProfileForm, SavedTrips, Favorites, Settings
│   │   │   ├── ui/                 # Toast, BottomTabBar
│   │   │   ├── AIChatAssistant.jsx
│   │   │   ├── AttractionMap.jsx
│   │   │   ├── PackingListGenerator.jsx
│   │   │   ├── TripPlannerForm.jsx
│   │   │   └── WeatherWidget.jsx
│   │   ├── pages/                  # LoginPage, RegisterPage, RecommendationsPage, etc.
│   │   ├── hooks/                  # useWeather, useRecommendations, useTheme, useFeatureAccess
│   │   ├── store/                  # Zustand stores (itinerary, recommendations, user, trip)
│   │   ├── services/               # API clients (auth, user, recommendations, budget, geocoding)
│   │   ├── utils/                  # Category icons, formatters
│   │   ├── data/                   # Static data
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── backend/                        # Express API server
│   ├── models/                     # User, WeatherCache (Mongoose schemas)
│   ├── routes/                     # auth, weather, recommendations, users, notifications
│   ├── controllers/                # userController
│   ├── middleware/                  # auth (JWT verification)
│   ├── services/                   # emailService, tripReminderScheduler, weatherCacheService
│   ├── utils/                      # geminiService, aiCostOptimizer, cacheCleanup
│   ├── index.js                    # Server entry point
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **MongoDB Atlas** account (free at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas))
- **API Keys**: Google Gemini, OpenWeatherMap, Google Maps

### 1. Clone the Repository

```bash
git clone https://github.com/PasinduJayamina/serendibtrip.git
cd serendibtrip
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` from the example:

```bash
cp .env.example .env
```

Fill in your environment variables (see below), then start the server:

```bash
npm run dev        # Development (with nodemon)
npm start          # Production
```

API runs on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the dev server:

```bash
npm run dev
```

App runs on `http://localhost:3000`

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable              | Description                        |
| --------------------- | ---------------------------------- |
| `PORT`                | Server port (default: `5000`)      |
| `NODE_ENV`            | `development` or `production`      |
| `MONGODB_URI`         | MongoDB Atlas connection string    |
| `JWT_SECRET`          | Secret key for JWT token signing   |
| `GEMINI_API_KEY`      | Google Gemini API key              |
| `WEATHER_API_KEY`     | OpenWeatherMap API key             |
| `GOOGLE_MAPS_API_KEY` | Google Maps / Geocoding API key    |
| `CORS_ORIGIN`         | Allowed frontend origin URL        |
| `FRONTEND_URL`        | Frontend URL (for email links)     |
| `EMAIL_HOST`          | SMTP host (e.g., `smtp.gmail.com`) |
| `EMAIL_PORT`          | SMTP port (e.g., `587`)            |
| `EMAIL_USER`          | Sender email address               |
| `EMAIL_APP_PASSWORD`  | App-specific password              |

### Frontend (`frontend/.env.local`)

| Variable       | Description                                              |
| -------------- | -------------------------------------------------------- |
| `VITE_API_URL` | Backend API base URL (e.g., `http://localhost:5000/api`) |

---

## 🌐 Deployment

### Recommended Free Stack

| Component | Service                                              | Free Tier                        |
| --------- | ---------------------------------------------------- | -------------------------------- |
| Frontend  | [Vercel](https://vercel.com)                         | Unlimited deploys, custom domain |
| Backend   | [Render](https://render.com)                         | 750 hrs/month web service        |
| Database  | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | 512MB M0 cluster                 |

### Quick Deploy

1. **Backend → Render**: Connect GitHub, set root directory to `backend`, add env vars
2. **Frontend → Vercel**: Connect GitHub, set root directory to `frontend`, set `VITE_API_URL` to Render URL
3. **Update CORS**: Set `CORS_ORIGIN` and `FRONTEND_URL` in Render to your Vercel URL
4. **MongoDB Atlas**: Allow access from `0.0.0.0/0` for Render's dynamic IPs

---

## 📄 License

This project is licensed under the ISC License.
