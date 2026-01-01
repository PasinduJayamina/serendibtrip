/**
 * Pricing Service for Sri Lankan attractions
 * Uses LOCAL prices (not tourist/foreigner prices)
 * Provides both exact prices and estimated ranges
 */

// Known local entry fees for major Sri Lankan attractions
// These are LOCAL citizen prices in LKR
export const KNOWN_PRICES = {
  // Cultural Sites
  'sigiriya': { exact: 50, name: 'Sigiriya Rock Fortress' },
  'sigiriya rock': { exact: 50, name: 'Sigiriya Rock Fortress' },
  'sigiriya rock fortress': { exact: 50, name: 'Sigiriya Rock Fortress' },
  'temple of the tooth': { exact: 500, name: 'Temple of the Sacred Tooth Relic' },
  'temple of the sacred tooth': { exact: 500, name: 'Temple of the Sacred Tooth Relic' },
  'dalada maligawa': { exact: 500, name: 'Temple of the Sacred Tooth Relic' },
  'dambulla cave temple': { exact: 50, name: 'Dambulla Cave Temple' },
  'dambulla': { exact: 50, name: 'Dambulla Cave Temple' },
  'polonnaruwa': { exact: 50, name: 'Ancient City of Polonnaruwa' },
  'anuradhapura': { exact: 50, name: 'Sacred City of Anuradhapura' },
  'galle fort': { exact: 0, name: 'Galle Fort' }, // Free
  'nine arches bridge': { exact: 0, name: 'Nine Arches Bridge' }, // Free
  
  // Gardens & Parks
  'peradeniya botanical garden': { exact: 100, name: 'Royal Botanical Gardens Peradeniya' },
  'royal botanical gardens': { exact: 100, name: 'Royal Botanical Gardens Peradeniya' },
  'peradeniya': { exact: 100, name: 'Royal Botanical Gardens Peradeniya' },
  'hakgala botanical garden': { exact: 100, name: 'Hakgala Botanical Gardens' },
  'victoria park': { exact: 50, name: 'Victoria Park Nuwara Eliya' },
  'horton plains': { exact: 100, name: 'Horton Plains National Park' },
  
  // Wildlife
  'pinnawala elephant orphanage': { exact: 500, name: 'Pinnawala Elephant Orphanage' },
  'pinnawala': { exact: 500, name: 'Pinnawala Elephant Orphanage' },
  'yala national park': { exact: 500, name: 'Yala National Park' },
  'yala': { exact: 500, name: 'Yala National Park' },
  'udawalawe national park': { exact: 500, name: 'Udawalawe National Park' },
  'udawalawe': { exact: 500, name: 'Udawalawe National Park' },
  'minneriya national park': { exact: 500, name: 'Minneriya National Park' },
  'minneriya': { exact: 500, name: 'Minneriya National Park' },
  'wilpattu national park': { exact: 500, name: 'Wilpattu National Park' },
  'wilpattu': { exact: 500, name: 'Wilpattu National Park' },
  'sinharaja': { exact: 800, name: 'Sinharaja Forest Reserve' },
  'sinharaja forest': { exact: 800, name: 'Sinharaja Forest Reserve' },
  
  // Tea & Factories
  'tea factory': { range: { min: 100, max: 300 }, isEstimate: true },
  'tea plantation': { range: { min: 0, max: 200 }, isEstimate: true },
  
  // Beaches
  'beach': { exact: 0, name: 'Beach' }, // Free
  'mirissa beach': { exact: 0 },
  'unawatuna beach': { exact: 0 },
  'arugam bay': { exact: 0 },
  'nilaveli beach': { exact: 0 },
};

// Price ranges by category (for estimates when exact not known)
export const CATEGORY_PRICE_RANGES = {
  attraction: { min: 50, max: 500 },
  temple: { min: 0, max: 500 },
  museum: { min: 100, max: 500 },
  park: { min: 50, max: 500 },
  wildlife: { min: 300, max: 800 },
  beach: { min: 0, max: 0 },
  waterfall: { min: 0, max: 100 },
  viewpoint: { min: 0, max: 200 },
  garden: { min: 50, max: 200 },
  restaurant: { min: 500, max: 3000 },
  cafe: { min: 200, max: 1000 },
  hotel: { min: 3000, max: 15000 },
  activity: { min: 500, max: 5000 },
  tour: { min: 2000, max: 10000 },
  transport: { min: 500, max: 3000 },
};

/**
 * Get price for an item - returns exact or range
 * @param {Object} item - The recommendation item
 * @returns {Object} { exact?: number, range?: {min, max}, isEstimate: boolean, isFree: boolean }
 */
export const getItemPrice = (item) => {
  const { name, category, type, cost, entryFee, estimatedCost, priceRange } = item;
  
  // If item has explicit cost, use it
  if (cost !== undefined && cost !== null) {
    return { exact: cost, isEstimate: false, isFree: cost === 0 };
  }
  
  if (entryFee !== undefined && entryFee !== null) {
    return { exact: entryFee, isEstimate: false, isFree: entryFee === 0 };
  }
  
  // Check known prices by name
  const nameLower = (name || '').toLowerCase().trim();
  for (const [key, value] of Object.entries(KNOWN_PRICES)) {
    if (nameLower.includes(key)) {
      if (value.exact !== undefined) {
        return { exact: value.exact, isEstimate: false, isFree: value.exact === 0 };
      }
      if (value.range) {
        return { range: value.range, isEstimate: true, isFree: false };
      }
    }
  }
  
  // If estimatedCost provided, create a range around it
  if (estimatedCost) {
    const variance = Math.round(estimatedCost * 0.2); // ±20%
    return {
      range: {
        min: Math.max(0, estimatedCost - variance),
        max: estimatedCost + variance,
      },
      isEstimate: true,
      isFree: false,
    };
  }
  
  // Use category-based range
  const itemCategory = category || type || 'attraction';
  const categoryRange = CATEGORY_PRICE_RANGES[itemCategory.toLowerCase()] || CATEGORY_PRICE_RANGES.attraction;
  
  return {
    range: categoryRange,
    isEstimate: true,
    isFree: categoryRange.max === 0,
  };
};

/**
 * Format price for display
 * @param {Object} priceInfo - Result from getItemPrice
 * @returns {string} Formatted price string
 */
export const formatPrice = (priceInfo) => {
  if (priceInfo.isFree) {
    return 'Free';
  }
  
  if (priceInfo.exact !== undefined) {
    return `LKR ${priceInfo.exact.toLocaleString()}`;
  }
  
  if (priceInfo.range) {
    const { min, max } = priceInfo.range;
    if (min === max) {
      return `LKR ${min.toLocaleString()}`;
    }
    return `LKR ${min.toLocaleString()} - ${max.toLocaleString()}`;
  }
  
  return 'Price varies';
};

/**
 * Get display info for a price (includes label for estimates)
 * @param {Object} item - The recommendation item
 * @returns {Object} { text: string, isEstimate: boolean, isFree: boolean }
 */
export const getPriceDisplay = (item) => {
  const priceInfo = getItemPrice(item);
  return {
    text: formatPrice(priceInfo),
    isEstimate: priceInfo.isEstimate,
    isFree: priceInfo.isFree,
    priceInfo,
  };
};

export default {
  getItemPrice,
  formatPrice,
  getPriceDisplay,
  KNOWN_PRICES,
  CATEGORY_PRICE_RANGES,
};
