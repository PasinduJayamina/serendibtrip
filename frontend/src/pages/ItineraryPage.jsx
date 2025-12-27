import { useState, useCallback } from 'react';
import { ItineraryTimeline } from '../components/itinerary';
import { MapPinIcon, SparklesIcon } from '@heroicons/react/24/outline';

// Sample itinerary data (from Gemini API response)
const sampleItinerary = {
  tripSummary: {
    destination: 'Kandy',
    duration: 4,
    totalBudget: 150000,
    groupSize: 2,
    bestTimeToVisit:
      'January is part of the dry season in Kandy, offering pleasant temperatures (25-30°C) and minimal rainfall.',
    overallTheme:
      "Kandy's Cultural Tapestry & Green Serenity: A Journey into Sri Lanka's Hill Capital",
  },
  days: [
    {
      day: 1,
      date: '2025-01-15',
      theme: 'Arrival, Sacred Relics & Cultural Rhythms',
      activities: [
        {
          time: '12:00',
          name: 'Check-in to Accommodation & Freshen Up',
          description:
            'Arrive in Kandy and check into your guesthouse or hotel. Take some time to settle in and freshen up after your journey to the hill capital.',
          duration: '1 hour',
          location: 'Kandy City Center Area',
          coordinates: { lat: 7.2917, lng: 80.6387 },
          cost: 0,
          currency: 'LKR',
          tips: 'Confirm your check-in time with the hotel in advance.',
          category: 'relaxation',
        },
        {
          time: '14:00',
          name: 'Visit the Temple of the Sacred Tooth Relic',
          description:
            "Explore Sri Lanka's most sacred Buddhist site, housing the relic of the tooth of the Buddha. Witness devotees offering prayers and flowers.",
          duration: '2.5 hours',
          location: 'Temple of the Sacred Tooth Relic',
          coordinates: { lat: 7.2933, lng: 80.6406 },
          cost: 4000,
          currency: 'LKR',
          tips: "Dress modestly (shoulders and knees covered). Best to visit during 'Pooja' times.",
          category: 'culture',
        },
        {
          time: '16:30',
          name: 'Stroll Around Kandy Lake',
          description:
            'Enjoy a leisurely walk around the picturesque Kandy Lake, an artificial lake built by King Sri Wickrama Rajasinghe.',
          duration: '1 hour',
          location: 'Kandy Lake',
          coordinates: { lat: 7.2917, lng: 80.6417 },
          cost: 0,
          currency: 'LKR',
          tips: "It's a pleasant walk, so decline politely if tuk-tuk drivers offer rides.",
          category: 'nature',
        },
        {
          time: '18:30',
          name: 'Kandyan Cultural Show',
          description:
            'Experience a vibrant performance showcasing traditional Kandyan dance, drumming, and fire walking.',
          duration: '1 hour',
          location: 'Kandy Lake Club Auditorium',
          coordinates: { lat: 7.2913, lng: 80.6425 },
          cost: 5000,
          currency: 'LKR',
          tips: 'Arrive 15-20 minutes early to get good seats.',
          category: 'culture',
        },
      ],
      meals: {
        breakfast: {
          name: 'At Accommodation / En route',
          cuisine: 'Sri Lankan/International',
          specialty: 'Hoppers/Roti',
          priceRange: '$$',
          estimatedCost: 1500,
          location: 'Varies',
          coordinates: { lat: 7.2906, lng: 80.6337 },
        },
        lunch: {
          name: 'Slightly Chilled Lounge',
          cuisine: 'Fusion/International',
          specialty: 'Chop Suey, Curry & Rice',
          priceRange: '$$',
          estimatedCost: 4000,
          location: 'Aniwatta Road, Kandy',
          coordinates: { lat: 7.2929, lng: 80.6337 },
        },
        dinner: {
          name: 'The Empire Cafe',
          cuisine: 'Cafe/Sri Lankan/Western',
          specialty: 'Rice & Curry, fresh juices',
          priceRange: '$$',
          estimatedCost: 5500,
          location: 'Temple Street, Kandy',
          coordinates: { lat: 7.2932, lng: 80.6408 },
        },
      },
      accommodation: {
        name: 'Cinnamon Citadel Kandy',
        type: 'hotel',
        pricePerNight: 10000,
        location: 'Mahaweli Riverside',
        amenities: ['WiFi', 'AC', 'Pool', 'River View'],
      },
      transportation: {
        mode: 'tuk-tuk',
        estimatedCost: 2500,
        tips: 'Use ride-hailing apps like PickMe for fixed prices.',
      },
      totalDayBudget: 28500,
      dailyTips: [
        'Stay hydrated throughout the day, especially when walking.',
        'Keep small LKR notes for tuk-tuks and small purchases.',
      ],
    },
    {
      day: 2,
      date: '2025-01-16',
      theme: "Nature's Embrace & Panoramic Vistas",
      activities: [
        {
          time: '09:00',
          name: 'Royal Botanical Gardens, Peradeniya',
          description:
            'Wander through magnificent botanical gardens renowned for its diverse collection of orchids, spices, and palm avenues.',
          duration: '3 hours',
          location: 'Royal Botanical Gardens, Peradeniya',
          coordinates: { lat: 7.2721, lng: 80.5954 },
          cost: 6000,
          currency: 'LKR',
          tips: 'Wear comfortable walking shoes. Bring water and perhaps a snack.',
          category: 'nature',
        },
        {
          time: '13:30',
          name: 'Bahirawakanda Vihara Buddha Statue',
          description:
            'Ascend to the temple with a gigantic white Buddha statue overlooking Kandy. Breathtaking panoramic views.',
          duration: '1.5 hours',
          location: 'Bahirawakanda Vihara',
          coordinates: { lat: 7.2882, lng: 80.6277 },
          cost: 600,
          currency: 'LKR',
          tips: "It's a moderate climb; tuk-tuks can take you most of the way up.",
          category: 'culture',
        },
        {
          time: '15:30',
          name: 'Explore Kandy Market',
          description:
            'Immerse yourselves in the vibrant atmosphere with stalls of fresh produce, spices, local sweets, and handicrafts.',
          duration: '1.5 hours',
          location: 'Kandy Central Market',
          coordinates: { lat: 7.2941, lng: 80.6382 },
          cost: 0,
          currency: 'LKR',
          tips: 'Feel free to politely bargain for non-food items.',
          category: 'food',
        },
        {
          time: '17:30',
          name: "Sunset at Arthur's Seat",
          description:
            'Head to the most famous viewpoint in Kandy for spectacular panoramic vistas as the sun sets.',
          duration: '1 hour',
          location: "Arthur's Seat Viewpoint",
          coordinates: { lat: 7.2872, lng: 80.6471 },
          cost: 0,
          currency: 'LKR',
          tips: 'Arrive 30 minutes before sunset for the best light.',
          category: 'nature',
        },
      ],
      meals: {
        breakfast: {
          name: 'At Accommodation',
          cuisine: 'Sri Lankan/International',
          specialty: 'Hoppers, String Hoppers',
          priceRange: '$',
          estimatedCost: 0,
          location: 'Cinnamon Citadel Kandy',
          coordinates: { lat: 7.2898, lng: 80.642 },
        },
        lunch: {
          name: 'Sharon Inn',
          cuisine: 'Sri Lankan',
          specialty: 'Traditional Rice & Curry buffet',
          priceRange: '$$',
          estimatedCost: 4500,
          location: 'Peradeniya Road, Kandy',
          coordinates: { lat: 7.2893, lng: 80.6334 },
        },
        dinner: {
          name: 'Balaji Dosai',
          cuisine: 'South Indian',
          specialty: 'Various types of Dosai, Vada, Idli',
          priceRange: '$',
          estimatedCost: 2500,
          location: 'Kotugodella Street, Kandy',
          coordinates: { lat: 7.2946, lng: 80.6391 },
        },
      },
      transportation: {
        mode: 'tuk-tuk',
        estimatedCost: 3000,
        tips: 'Negotiate a round-trip fare for the Botanical Gardens.',
      },
      totalDayBudget: 27000,
      dailyTips: [
        'Carry sunscreen and a hat for the botanical gardens.',
        'Try a fresh king coconut from a street vendor.',
      ],
    },
    {
      day: 3,
      date: '2025-01-17',
      theme: 'Tea Plantations & Traditional Crafts',
      activities: [
        {
          time: '09:00',
          name: 'Geragama Tea Factory & Plantation',
          description:
            'Scenic drive to a working tea factory. Learn about tea manufacturing from leaf to cup.',
          duration: '3 hours',
          location: 'Geragama Tea Factory',
          coordinates: { lat: 7.2536, lng: 80.5284 },
          cost: 1000,
          currency: 'LKR',
          tips: 'Wear comfortable shoes for walking around the plantation.',
          category: 'nature',
        },
        {
          time: '13:00',
          name: 'Local Lunch in Tea Country',
          description:
            'Enjoy a simple yet delicious Sri Lankan lunch at a small restaurant near the tea factory.',
          duration: '1 hour',
          location: 'Near Geragama',
          coordinates: { lat: 7.253, lng: 80.528 },
          cost: 3000,
          currency: 'LKR',
          tips: 'Ask your driver for a recommendation for a clean, local spot.',
          category: 'food',
        },
        {
          time: '15:00',
          name: 'Batik & Wood Carving Centre',
          description:
            'Visit a local workshop to witness the intricate art of Batik textile dyeing and traditional Kandyan wood carving.',
          duration: '1.5 hours',
          location: 'Kandyan Arts & Crafts Center',
          coordinates: { lat: 7.2942, lng: 80.6342 },
          cost: 0,
          currency: 'LKR',
          tips: "It's free to enter and watch the demonstrations.",
          category: 'culture',
        },
        {
          time: '17:00',
          name: 'Relax at Hotel',
          description:
            'Head back to your hotel. Relax by the pool or enjoy a drink with a view.',
          duration: '2 hours',
          location: 'Cinnamon Citadel Kandy',
          coordinates: { lat: 7.2898, lng: 80.642 },
          cost: 0,
          currency: 'LKR',
          tips: 'Many hotels offer happy hour specials for drinks.',
          category: 'relaxation',
        },
      ],
      meals: {
        breakfast: {
          name: 'At Accommodation',
          cuisine: 'Sri Lankan/International',
          specialty: 'Fresh fruit platter, local pastries',
          priceRange: '$',
          estimatedCost: 0,
          location: 'Cinnamon Citadel Kandy',
          coordinates: { lat: 7.2898, lng: 80.642 },
        },
        lunch: {
          name: 'Garden Cafe (Local)',
          cuisine: 'Sri Lankan',
          specialty: 'Rice & Curry, Kotthu Roti',
          priceRange: '$',
          estimatedCost: 3000,
          location: 'Near Geragama',
          coordinates: { lat: 7.253, lng: 80.528 },
        },
        dinner: {
          name: 'Oak Ray Restaurant',
          cuisine: 'Sri Lankan/International Buffet',
          specialty: 'Wide range of local and international dishes',
          priceRange: '$$$',
          estimatedCost: 7000,
          location: 'Near Kandy Lake',
          coordinates: { lat: 7.2918, lng: 80.6415 },
        },
      },
      transportation: {
        mode: 'tuk-tuk/private car',
        estimatedCost: 7000,
        tips: 'For the tea factory trip, hire a tuk-tuk for a half-day.',
      },
      totalDayBudget: 28000,
      dailyTips: [
        'Be respectful of local customs when visiting workplaces.',
        'Haggle respectfully if purchasing items at craft centers.',
      ],
    },
    {
      day: 4,
      date: '2025-01-18',
      theme: 'Hidden Temples & Departure',
      activities: [
        {
          time: '09:00',
          name: 'Gadaladeniya Temple',
          description:
            'Check out and head to this beautiful stone temple showcasing South Indian influences.',
          duration: '1.5 hours',
          location: 'Gadaladeniya Temple',
          coordinates: { lat: 7.2906, lng: 80.5401 },
          cost: 1000,
          currency: 'LKR',
          tips: "It's about a 30-40 minute drive from Kandy city.",
          category: 'culture',
        },
        {
          time: '11:00',
          name: 'Lankathilaka Viharaya',
          description:
            'Visit this historic rock temple offering stunning views and intricate Kandyan-era paintings.',
          duration: '1.5 hours',
          location: 'Lankathilaka Viharaya',
          coordinates: { lat: 7.2882, lng: 80.5303 },
          cost: 1000,
          currency: 'LKR',
          tips: 'Wear comfortable shoes as there are some steps to climb.',
          category: 'culture',
        },
        {
          time: '13:00',
          name: "Local 'Buth Kade' Lunch",
          description:
            "Experience a true local dining at a 'Buth Kade' (rice stall) for delicious and affordable rice and curry.",
          duration: '1 hour',
          location: 'Near Peradeniya',
          coordinates: { lat: 7.275, lng: 80.6 },
          cost: 1500,
          currency: 'LKR',
          tips: 'Look for a busy spot, which usually indicates good food.',
          category: 'food',
        },
        {
          time: '15:00',
          name: 'Souvenir Shopping',
          description:
            'Do some last-minute souvenir shopping. Look for spices, Ceylon tea, wooden masks, or handicrafts.',
          duration: '1.5 hours',
          location: 'Kandy City Centre',
          coordinates: { lat: 7.2933, lng: 80.6387 },
          cost: 10000,
          currency: 'LKR',
          tips: 'Bargaining is common in smaller shops.',
          category: 'shopping',
        },
        {
          time: '17:00',
          name: 'Departure from Kandy',
          description:
            'Transfer to your onward destination (railway station, bus stand, or private transport).',
          duration: '1 hour',
          location: 'Kandy Railway Station',
          coordinates: { lat: 7.2974, lng: 80.6346 },
          cost: 0,
          currency: 'LKR',
          tips: 'Confirm your departure timings well in advance.',
          category: 'travel',
        },
      ],
      meals: {
        breakfast: {
          name: 'At Accommodation',
          cuisine: 'Sri Lankan/Continental',
          specialty: 'Coffee & pastry or fruit',
          priceRange: '$$',
          estimatedCost: 2000,
          location: 'Kandy City',
          coordinates: { lat: 7.292, lng: 80.639 },
        },
        lunch: {
          name: 'Local Buth Kade',
          cuisine: 'Sri Lankan',
          specialty: 'Fresh Rice & Curry',
          priceRange: '$',
          estimatedCost: 1500,
          location: 'Peradeniya area',
          coordinates: { lat: 7.275, lng: 80.6 },
        },
        dinner: {
          name: 'Onward journey',
          cuisine: 'N/A',
          specialty: 'N/A',
          priceRange: '$',
          estimatedCost: 0,
          location: 'N/A',
          coordinates: { lat: 0, lng: 0 },
        },
      },
      transportation: {
        mode: 'tuk-tuk/private car',
        estimatedCost: 6000,
        tips: 'Negotiate a fixed price for the entire route including waiting time.',
      },
      totalDayBudget: 22500,
      dailyTips: [
        'Plan your departure carefully, accounting for potential traffic.',
        'Always keep some small change handy for offerings at temples.',
      ],
    },
  ],
};

const ItineraryPage = () => {
  const [itinerary, setItinerary] = useState(sampleItinerary.days);
  const [tripSummary] = useState(sampleItinerary.tripSummary);

  // Handle activity update
  const handleActivityUpdate = useCallback(
    (dayIndex, activityIndex, updatedActivity) => {
      setItinerary((prev) => {
        const newItinerary = [...prev];
        newItinerary[dayIndex] = {
          ...newItinerary[dayIndex],
          activities: newItinerary[dayIndex].activities.map((activity, index) =>
            index === activityIndex
              ? { ...activity, ...updatedActivity }
              : activity
          ),
        };
        return newItinerary;
      });
    },
    []
  );

  // Handle activity delete
  const handleActivityDelete = useCallback((dayIndex, activityIndex) => {
    setItinerary((prev) => {
      const newItinerary = [...prev];
      newItinerary[dayIndex] = {
        ...newItinerary[dayIndex],
        activities: newItinerary[dayIndex].activities.filter(
          (_, index) => index !== activityIndex
        ),
      };
      return newItinerary;
    });
  }, []);

  // Handle activity add
  const handleActivityAdd = useCallback((dayIndex, newActivity) => {
    setItinerary((prev) => {
      const newItinerary = [...prev];
      newItinerary[dayIndex] = {
        ...newItinerary[dayIndex],
        activities: [...(newItinerary[dayIndex].activities || []), newActivity],
      };
      return newItinerary;
    });
  }, []);

  // Handle activity reorder
  const handleActivityReorder = useCallback((dayIndex, fromIndex, toIndex) => {
    setItinerary((prev) => {
      const newItinerary = [...prev];
      const activities = [...newItinerary[dayIndex].activities];
      const [movedItem] = activities.splice(fromIndex, 1);
      activities.splice(toIndex, 0, movedItem);
      newItinerary[dayIndex] = {
        ...newItinerary[dayIndex],
        activities,
      };
      return newItinerary;
    });
  }, []);

  // Handle view map
  const handleViewMap = (coordinates, dayNumber) => {
    console.log('View map for day', dayNumber, coordinates);
    // You can implement map modal or navigate to map view
    alert(
      `Viewing route for Day ${dayNumber} with ${
        coordinates?.length || 0
      } locations`
    );
  };

  // Handle location click
  const handleLocationClick = (coordinates, locationName) => {
    console.log('Location clicked:', locationName, coordinates);
    // Open Google Maps searching for the place name near the coordinates
    if (locationName) {
      const encodedName = encodeURIComponent(locationName);
      if (coordinates?.lat && coordinates?.lng) {
        // Search for place name centered on coordinates
        window.open(
          `https://www.google.com/maps/search/${encodedName}/@${coordinates.lat},${coordinates.lng},17z`,
          '_blank'
        );
      } else {
        // Just search for the place name
        window.open(
          `https://www.google.com/maps/search/${encodedName}`,
          '_blank'
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Page header */}
      <div className="bg-gradient-to-r from-secondary-600 to-accent-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <SparklesIcon className="w-8 h-8" />
            <span className="text-secondary-100 font-medium">
              AI-Generated Itinerary
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">
            Your Trip to {tripSummary.destination}
          </h1>
          <div className="flex items-center gap-2 text-secondary-100">
            <MapPinIcon className="w-5 h-5" />
            <span>Sri Lanka</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ItineraryTimeline
          itinerary={itinerary}
          tripSummary={tripSummary}
          onActivityUpdate={handleActivityUpdate}
          onActivityDelete={handleActivityDelete}
          onActivityAdd={handleActivityAdd}
          onActivityReorder={handleActivityReorder}
          totalBudget={tripSummary.totalBudget}
          weatherData={[
            { day: 1, date: '2025-01-15', temp: 28, condition: 'sunny' },
            { day: 2, date: '2025-01-16', temp: 26, condition: 'cloudy' },
            { day: 3, date: '2025-01-17', temp: 27, condition: 'sunny' },
            { day: 4, date: '2025-01-18', temp: 29, condition: 'sunny' },
          ]}
          onViewMap={handleViewMap}
          onLocationClick={handleLocationClick}
        />
      </div>
    </div>
  );
};

export default ItineraryPage;
