# SerendibTrip - Personalized Travel Planner

A modern web application that helps Sri Lankan travelers plan personalized trips using AI recommendations, real-time weather, and interactive maps.

## 🌍 Features

- 🔐 **User Authentication** - Secure registration and login
- 🗺️ **Interactive Maps** - Discover attractions in Sri Lanka
- 🌤️ **Real-time Weather** - Get weather updates for your destination
- 🤖 **AI Recommendations** - Gemini-powered personalized suggestions
- ✈️ **Trip Planning** - Create and manage detailed itineraries
- 💰 **Budget Tracking** - Track expenses for each activity and day

## 🛠️ Tech Stack

**Frontend:**

- React 18 + Vite
- Tailwind CSS
- Zustand (State Management)
- React Router
- Axios
- Leaflet (Maps)

**Backend:**

- Node.js + Express
- MongoDB
- JWT Authentication
- bcryptjs (Password Hashing)

**APIs:**

- Google Gemini (AI)
- OpenWeather (Weather Data)
- Google Maps (Location Data)

## 📁 Project Structure

serendibtrip/
├── frontend/ # React Vite application
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── hooks/
│ │ ├── store/
│ │ ├── utils/
│ │ ├── App.jsx
│ │ └── main.jsx
│ ├── .env.local
│ ├── .env.example
│ ├── .gitignore
│ └── package.json
│
├── backend/ # Express API server
│ ├── models/
│ ├── routes/
│ ├── controllers/
│ ├── middleware/
│ ├── utils/
│ ├── .env
│ ├── .env.example
│ ├── .gitignore
│ ├── index.js
│ └── package.json
│
├── .gitignore
└── README.md

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB account (free at mongodb.com/cloud/atlas)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev

Visit http://localhost:3000
```

### Backend Setup

```bash
cd backend
npm install
npm run dev

API running on http://localhost:5000

```

## 🔑 Environment Variables

### Frontend(.env.local)

- VITE_BACKEND_URL=http://localhost:5000
- VITE_WEATHER_API_KEY=your_openweather_key
- VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
- VITE_GEMINI_API_KEY=your_gemini_key

### Backend(.env)

- PORT=5000
- NODE_ENV=development
- MONGODB_URI=your_mongodb_connection_string
- JWT_SECRET=your_jwt_secret
- GEMINI_API_KEY=your_gemini_key
- WEATHER_API_KEY=your_openweather_key
- CORS_ORIGIN=http://localhost:3000
