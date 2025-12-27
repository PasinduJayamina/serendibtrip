import { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  Filter,
  MapPin,
  Star,
  Clock,
  DollarSign,
  Plus,
  Minus,
  Navigation,
  Locate,
  X,
  Route,
} from 'lucide-react';

// Import Leaflet CSS directly
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Category colors and icons
const CATEGORY_CONFIG = {
  culture: { color: '#8B5CF6', emoji: '🏛️', label: 'Culture' },
  nature: { color: '#10B981', emoji: '🌿', label: 'Nature' },
  beach: { color: '#0EA5E9', emoji: '🏖️', label: 'Beach' },
  adventure: { color: '#F59E0B', emoji: '🏔️', label: 'Adventure' },
  wildlife: { color: '#84CC16', emoji: '🐘', label: 'Wildlife' },
  history: { color: '#A855F7', emoji: '📜', label: 'History' },
  food: { color: '#EF4444', emoji: '🍛', label: 'Food' },
  religious: { color: '#EC4899', emoji: '🛕', label: 'Religious' },
};

// Sri Lanka center coordinates
const SRI_LANKA_CENTER = [7.8731, 80.7718];
const DEFAULT_ZOOM = 8;

/**
 * Create custom marker icon
 */
const createCustomIcon = (category, isSelected = false) => {
  const config = CATEGORY_CONFIG[category] || { color: '#6B7280', emoji: '📍' };
  const size = isSelected ? 40 : 32;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${config.color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
        ${isSelected ? 'animation: pulse 1s infinite;' : ''}
      ">
        <span style="transform: rotate(45deg); font-size: ${
          isSelected ? '18px' : '14px'
        };">
          ${config.emoji}
        </span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Star rating component
 */
const StarRating = ({ rating, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
};

/**
 * Map controller for programmatic map interactions
 */
const MapController = ({ center, zoom, userLocation }) => {
  const map = useMap();

  // Invalidate map size on mount and when container changes
  useEffect(() => {
    // Small delay to ensure container is fully rendered
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Also invalidate on window resize
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1 });
    }
  }, [center, zoom, map]);

  return null;
};

/**
 * Custom zoom controls component - renders inside MapContainer
 */
const ZoomControls = () => {
  const map = useMap();

  return (
    <div
      className="leaflet-top leaflet-left"
      style={{ marginTop: '60px', marginLeft: '10px' }}
    >
      <div className="leaflet-control">
        <div className="flex flex-col bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md overflow-hidden">
          <button
            onClick={() => map.zoomIn()}
            className="p-2 hover:bg-gray-100 transition-colors border-b border-gray-200"
            title="Zoom in"
          >
            <Plus className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={() => map.zoomOut()}
            className="p-2 hover:bg-gray-100 transition-colors"
            title="Zoom out"
          >
            <Minus className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Locate user button component
 */
const LocateButton = ({ onLocate, isLocating }) => {
  const map = useMap();

  const handleLocate = () => {
    if (navigator.geolocation) {
      onLocate(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 14);
          onLocate(false, { lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Geolocation error:', error);
          onLocate(false, null);
        }
      );
    }
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-24 right-3 z-[1000] p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
      title="Find my location"
    >
      <Locate
        className={`w-5 h-5 text-secondary-500 ${
          isLocating ? 'animate-pulse' : ''
        }`}
      />
    </button>
  );
};

/**
 * AttractionMap Component
 * Interactive map displaying attractions in Sri Lanka
 */
const AttractionMap = ({
  attractions = [],
  onSelectAttraction,
  onAddToItinerary,
  userLocation = null,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [mapCenter, setMapCenter] = useState(SRI_LANKA_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState(userLocation);
  const [showRoute, setShowRoute] = useState(false);
  const [routeAttractions, setRouteAttractions] = useState([]);

  // Filter attractions based on search and category
  const filteredAttractions = useMemo(() => {
    return attractions.filter((attraction) => {
      const matchesSearch =
        attraction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attraction.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || attraction.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [attractions, searchQuery, selectedCategory]);

  // Filter route attractions to only show visible ones
  const visibleRouteAttractions = useMemo(() => {
    return routeAttractions.filter((routeAttr) =>
      filteredAttractions.some((filtered) => filtered.id === routeAttr.id)
    );
  }, [routeAttractions, filteredAttractions]);

  // Calculate distances if user location is available
  const attractionsWithDistance = useMemo(() => {
    if (!currentUserLocation) return filteredAttractions;
    return filteredAttractions.map((attraction) => ({
      ...attraction,
      distance: calculateDistance(
        currentUserLocation.lat,
        currentUserLocation.lng,
        attraction.coordinates.lat,
        attraction.coordinates.lng
      ),
    }));
  }, [filteredAttractions, currentUserLocation]);

  // Handle marker click
  const handleMarkerClick = (attraction) => {
    setSelectedAttraction(attraction);
    onSelectAttraction?.(attraction);
  };

  // Handle add to itinerary
  const handleAddToItinerary = (attraction) => {
    onAddToItinerary?.(attraction);
    // Add to route
    if (!routeAttractions.find((a) => a.id === attraction.id)) {
      setRouteAttractions([...routeAttractions, attraction]);
    }
  };

  // Handle locate user
  const handleLocate = (locating, location) => {
    setIsLocating(locating);
    if (location) {
      setCurrentUserLocation(location);
    }
  };

  // Toggle route display
  const toggleRoute = () => {
    setShowRoute(!showRoute);
  };

  // Clear route
  const clearRoute = () => {
    setRouteAttractions([]);
    setShowRoute(false);
  };

  // Map tile layer
  const tileLayer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div
      className={`relative rounded-2xl shadow-lg overflow-hidden bg-white ${className}`}
    >
      {/* Search and Filter Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col sm:flex-row gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search attractions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none text-sm appearance-none cursor-pointer min-w-[140px] text-gray-900"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.emoji} {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Route Controls */}
      {routeAttractions.length > 1 && (
        <div className="absolute top-20 left-4 z-[1000] flex gap-2">
          <button
            onClick={toggleRoute}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md text-sm font-medium transition-colors ${
              showRoute
                ? 'bg-secondary-500 text-white'
                : 'bg-white/95 text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Route className="w-4 h-4" />
            {showRoute ? 'Hide Route' : 'Show Route'} ({routeAttractions.length}
            )
          </button>
          <button
            onClick={clearRoute}
            className="px-3 py-2 bg-white/95 text-red-500 rounded-lg shadow-md text-sm font-medium hover:bg-red-50 border border-gray-200 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Results Count */}
      <div className="absolute bottom-4 left-4 z-[1000] px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-md text-sm text-gray-600">
        {filteredAttractions.length} attraction
        {filteredAttractions.length !== 1 ? 's' : ''} found
      </div>

      {/* Map Container */}
      <div style={{ height: '500px', width: '100%' }}>
        <MapContainer
          center={SRI_LANKA_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer url={tileLayer} attribution={tileAttribution} />

          <MapController center={mapCenter} />

          {/* Custom Zoom Controls */}
          <ZoomControls />

          {/* Locate Button */}
          <LocateButton onLocate={handleLocate} isLocating={isLocating} />

          {/* User Location Marker */}
          {currentUserLocation && (
            <>
              <Circle
                center={[currentUserLocation.lat, currentUserLocation.lng]}
                radius={100}
                pathOptions={{
                  color: 'secondary-500',
                  fillColor: 'secondary-500',
                  fillOpacity: 0.2,
                }}
              />
              <Marker
                position={[currentUserLocation.lat, currentUserLocation.lng]}
                icon={L.divIcon({
                  className: 'user-location-marker',
                  html: `
                  <div style="
                    width: 20px;
                    height: 20px;
                    background-color: secondary-500;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  "></div>
                `,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
              >
                <Popup>
                  <div className="text-center p-1">
                    <p className="font-medium text-gray-800">Your Location</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Route Polyline - only show visible route attractions */}
          {showRoute && visibleRouteAttractions.length > 1 && (
            <Polyline
              positions={visibleRouteAttractions.map((a) => [
                a.coordinates.lat,
                a.coordinates.lng,
              ])}
              pathOptions={{
                color: 'secondary-500',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 10',
              }}
            />
          )}

          {/* Attraction Markers */}
          {attractionsWithDistance.map((attraction) => (
            <Marker
              key={attraction.id}
              position={[
                attraction.coordinates.lat,
                attraction.coordinates.lng,
              ]}
              icon={createCustomIcon(
                attraction.category,
                selectedAttraction?.id === attraction.id
              )}
              eventHandlers={{
                click: () => handleMarkerClick(attraction),
              }}
            >
              <Popup maxWidth={300} className="attraction-popup">
                <div className="p-1 min-w-[250px]">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">
                        {attraction.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{
                            backgroundColor:
                              CATEGORY_CONFIG[attraction.category]?.color ||
                              '#6B7280',
                          }}
                        >
                          {CATEGORY_CONFIG[attraction.category]?.emoji}{' '}
                          {CATEGORY_CONFIG[attraction.category]?.label ||
                            attraction.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mb-2">
                    <StarRating rating={attraction.rating} />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {attraction.description}
                  </p>

                  {/* Details */}
                  <div className="space-y-1.5 text-sm text-gray-600 mb-3">
                    {attraction.estimatedCost > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span>
                          LKR {attraction.estimatedCost.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {attraction.estimatedCost === 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">
                          Free Entry
                        </span>
                      </div>
                    )}
                    {attraction.openingHours && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span>{attraction.openingHours}</span>
                      </div>
                    )}
                    {attraction.distance !== undefined &&
                      attraction.distance > 0 && (
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-secondary-500" />
                          <span>{attraction.distance.toFixed(1)} km away</span>
                        </div>
                      )}
                  </div>

                  {/* Add to Itinerary Button */}
                  <button
                    onClick={() => handleAddToItinerary(attraction)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-[#1a6f7a] transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Itinerary
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Custom CSS for markers */}
      <style>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .user-location-marker {
          background: transparent !important;
          border: none !important;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 8px;
        }
        .attraction-popup .leaflet-popup-content-wrapper {
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
};

export default AttractionMap;
