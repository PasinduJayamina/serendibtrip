/**
 * Blacklist of establishments that are permanently closed or should not be recommended.
 * This list is checked before showing AI recommendations to filter out invalid suggestions.
 * 
 * Add new entries in lowercase for case-insensitive matching.
 * 
 * Last updated: 2026-01-07
 */

const closedEstablishments = [
  // Hotels/Accommodations
  'ozo kandy sri lanka',
  'ozo kandy',
  
  // Add more closed places here as they are discovered
  // Format: 'establishment name in lowercase'
];

/**
 * Check if an establishment is blacklisted (closed/invalid)
 * @param {string} name - The name of the establishment
 * @returns {boolean} - True if blacklisted, false otherwise
 */
export const isBlacklisted = (name) => {
  if (!name) return false;
  const lowerName = name.toLowerCase().trim();
  return closedEstablishments.some(closed => 
    lowerName.includes(closed) || closed.includes(lowerName)
  );
};

/**
 * Filter out blacklisted items from recommendations
 * @param {Array} items - Array of recommendation items
 * @returns {Array} - Filtered array with blacklisted items removed
 */
export const filterBlacklisted = (items) => {
  if (!Array.isArray(items)) return items;
  return items.filter(item => !isBlacklisted(item.name));
};

export default closedEstablishments;
