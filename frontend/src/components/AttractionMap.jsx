import { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Plus,
  Minus,
  CalendarDays,
  MapPinOff,
} from 'lucide-react';
import { useItineraryStore } from '../store/itineraryStore';

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

// Sri Lanka center coordinates
const SRI_LANKA_CENTER = [7.8731, 80.7718];
const DEFAULT_ZOOM = 8;

// Day colors palette — distinct, colorblind-friendly
const DAY_COLORS = [
  '#3B82F6', // Day 1 — Blue
  '#10B981', // Day 2 — Emerald
  '#F59E0B', // Day 3 — Amber
  '#8B5CF6', // Day 4 — Violet
  '#EC4899', // Day 5 — Pink
  '#06B6D4', // Day 6 — Cyan
  '#EF4444', // Day 7 — Red
  '#84CC16', // Day 8 — Lime
  '#F97316', // Day 9 — Orange
  '#6366F1', // Day 10 — Indigo
];

/**
 * Create a day-colored circle marker icon
 */
function createDayIcon(dayNumber, isAccommodation = false) {
  const color = DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];
  const size = isAccommodation ? 32 : 26;
  const emoji = isAccommodation ? '🏨' : '';
  const label = isAccommodation ? '' : dayNumber;

  return L.divIcon({
    className: 'trip-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: ${isAccommodation ? '14px' : '11px'};
        line-height: 1;
      ">${emoji || label}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

/**
 * Map controller — auto-fits bounds to all markers
 */
function MapFitter({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 13);
    } else {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [positions, map]);

  // Invalidate size on mount to fix grey tiles
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  return null;
}

/**
 * Custom zoom controls
 */
function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="w-8 h-8 bg-[var(--color-bg-secondary)] rounded-lg shadow-md flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors border border-[var(--color-border)]"
      >
        <Plus className="w-4 h-4 text-[var(--color-text-primary)]" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-8 h-8 bg-[var(--color-bg-secondary)] rounded-lg shadow-md flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors border border-[var(--color-border)]"
      >
        <Minus className="w-4 h-4 text-[var(--color-text-primary)]" />
      </button>
    </div>
  );
}

/**
 * TripMap Component
 * Shows the user's saved itinerary items as day-colored pins on a map.
 * Connects same-day items with polyline routes.
 */
const AttractionMap = ({ destination = '', className = '' }) => {
  const { savedItems, tripDetails } = useItineraryStore();
  const currentTripId = tripDetails?.tripId;

  // Sri Lanka bounding box — reject coordinates outside the island
  const isInSriLanka = (lat, lng) => {
    return lat >= 5.8 && lat <= 10.0 && lng >= 79.3 && lng <= 82.1;
  };

  // Filter items for the current trip that have valid coordinates within Sri Lanka
  const tripItems = useMemo(() => {
    if (!currentTripId) return [];
    return savedItems
      .filter((item) => item.tripId === currentTripId)
      .filter((item) => {
        const coords = item.coordinates || item.location?.coordinates;
        return coords && coords.lat && coords.lng && isInSriLanka(coords.lat, coords.lng);
      });
  }, [savedItems, currentTripId]);

  // Group by day for polylines and legend
  const itemsByDay = useMemo(() => {
    const grouped = {};
    tripItems.forEach((item) => {
      const day = item.showOnAllDays ? 'all' : (item.assignedDay || 1);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(item);
    });
    return grouped;
  }, [tripItems]);

  // All marker positions for auto-fit
  const allPositions = useMemo(() => {
    return tripItems.map((item) => {
      const coords = item.coordinates || item.location?.coordinates;
      return [coords.lat, coords.lng];
    });
  }, [tripItems]);

  // Polylines for each day (connect items on the same day)
  const dayPolylines = useMemo(() => {
    const lines = [];
    Object.entries(itemsByDay).forEach(([day, items]) => {
      if (day === 'all' || items.length < 2) return;
      const dayNum = parseInt(day);
      const color = DAY_COLORS[(dayNum - 1) % DAY_COLORS.length];
      const coords = items.map((item) => {
        const c = item.coordinates || item.location?.coordinates;
        return [c.lat, c.lng];
      });
      lines.push({ day: dayNum, color, positions: coords });
    });
    return lines;
  }, [itemsByDay]);

  // Unique days for the legend
  const activeDays = useMemo(() => {
    const days = new Set();
    tripItems.forEach((item) => {
      if (!item.showOnAllDays) days.add(item.assignedDay || 1);
    });
    return [...days].sort((a, b) => a - b);
  }, [tripItems]);

  const duration = tripDetails?.duration || 1;
  const startDateStr = tripDetails?.startDate;

  const getDayLabel = (dayNum) => {
    if (startDateStr) {
      const d = new Date(startDateStr);
      d.setDate(d.getDate() + dayNum - 1);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return `Day ${dayNum}`;
  };

  // Empty state
  if (tripItems.length === 0) {
    return (
      <div className={`relative flex flex-col h-full ${className}`}>
        {/* Still show the map but with an overlay prompt */}
        <div className="relative flex-1 min-h-[400px]">
          <MapContainer
            center={SRI_LANKA_CENTER}
            zoom={DEFAULT_ZOOM}
            className="absolute inset-0"
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            attributionControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <ZoomControls />
          </MapContainer>
          {/* Empty state overlay */}
          <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
            <div className="bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm rounded-2xl p-8 max-w-xs text-center shadow-xl border border-[var(--color-border)] pointer-events-auto">
              <div className="w-14 h-14 rounded-full bg-[var(--color-bg-sunken)] flex items-center justify-center mx-auto mb-4">
                <MapPinOff className="w-7 h-7 text-[var(--color-text-muted)]" />
              </div>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
                No Pins Yet
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Add activities and places from the AI recommendations to see them pinned on your trip map.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col h-full ${className}`}>
      {/* Trip context bar */}
      <div className="px-3 py-2 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border)] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-[var(--color-brand-primary)]" />
          <span className="font-medium text-[var(--color-text-primary)]">
            {destination || tripDetails?.destination || 'Your Trip'}
          </span>
          <span className="text-[var(--color-text-muted)]">
            · {tripItems.length} place{tripItems.length !== 1 ? 's' : ''} pinned
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-[350px]">
        <MapContainer
          center={SRI_LANKA_CENTER}
          zoom={DEFAULT_ZOOM}
          className="absolute inset-0"
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ZoomControls />
          <MapFitter positions={allPositions} />

          {/* Day route polylines */}
          {dayPolylines.map((line) => (
            <Polyline
              key={`route-${line.day}`}
              positions={line.positions}
              pathOptions={{
                color: line.color,
                weight: 3,
                opacity: 0.6,
                dashArray: '8, 6',
              }}
            />
          ))}

          {/* Item markers */}
          {tripItems.map((item) => {
            const coords = item.coordinates || item.location?.coordinates;
            const dayNum = item.showOnAllDays ? 1 : (item.assignedDay || 1);
            const isAccom = (item.category === 'accommodation' || item.showOnAllDays);
            const icon = createDayIcon(dayNum, isAccom);
            const cost = item.cost || item.entryFee || 0;

            return (
              <Marker
                key={item.id}
                position={[coords.lat, coords.lng]}
                icon={icon}
              >
                <Popup className="trip-map-popup" maxWidth={240}>
                  <div style={{ fontFamily: 'inherit' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: 'var(--color-text-primary, #1a1a1a)' }}>
                      {item.name}
                    </div>
                    {item.location && typeof item.location === 'string' && (
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📍</span> {item.location}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#888' }}>
                      <span style={{ 
                        background: DAY_COLORS[(dayNum - 1) % DAY_COLORS.length] + '20',
                        color: DAY_COLORS[(dayNum - 1) % DAY_COLORS.length],
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}>
                        {item.showOnAllDays ? 'All Days' : `Day ${dayNum}`}
                      </span>
                      {cost > 0 && (
                        <span style={{ color: '#16a34a', fontWeight: 500 }}>
                          LKR {cost.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Day legend */}
      {activeDays.length > 0 && (
        <div className="px-3 py-2 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] flex items-center gap-3 overflow-x-auto flex-shrink-0">
          <CalendarDays className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
          {activeDays.map((day) => {
            const color = DAY_COLORS[(day - 1) % DAY_COLORS.length];
            const itemCount = (itemsByDay[day] || []).length;
            return (
              <div
                key={day}
                className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                title={getDayLabel(day)}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
                  style={{ background: color }}
                />
                <span className="text-[var(--color-text-secondary)] font-medium">
                  Day {day}
                </span>
                <span className="text-[var(--color-text-muted)]">
                  ({itemCount})
                </span>
              </div>
            );
          })}
          {/* Show accommodation indicator if any */}
          {tripItems.some(i => i.showOnAllDays) && (
            <div className="flex items-center gap-1.5 text-xs whitespace-nowrap border-l border-[var(--color-border)] pl-3">
              <span className="text-sm">🏨</span>
              <span className="text-[var(--color-text-secondary)] font-medium">Stay</span>
            </div>
          )}
        </div>
      )}

      {/* Popup overrides */}
      <style>{`
        .trip-map-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .trip-map-popup .leaflet-popup-content {
          margin: 8px 12px;
          font-size: 13px;
          line-height: 1.4;
        }
        .trip-map-popup .leaflet-popup-tip {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .trip-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default AttractionMap;
