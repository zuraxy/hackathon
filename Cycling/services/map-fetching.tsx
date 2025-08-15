import { Location } from './routing';

// API key
const GEOAPIFY_PLACES_API_KEY = 'a324d4a77fbc42d0833e1f790c02db81';

export interface POI {
  name: string;
  address?: string;
  address_line1?: string;
  categories: string[];
  lat: number;
  lon: number;
}

export const searchNearbyPOIs = async (
  location: Location,
  radius: number = 3000,
  types: string[] = ['catering.restaurant', 'catering.fast_food', 'catering.cafe', 'commercial.supermarket', 'leisure.park']
) => {
  try {
    // Format coordinates properly
    const formattedLon = parseFloat(location.lon.toString()).toFixed(6);
    const formattedLat = parseFloat(location.lat.toString()).toFixed(6);
    
    // Use Geoapify Places API to find POIs
    const url = `https://api.geoapify.com/v2/places?categories=${types.join(',')}&filter=circle:${formattedLon},${formattedLat},${radius}&bias=proximity:${formattedLon},${formattedLat}&limit=20&apiKey=${GEOAPIFY_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`POI API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching POIs:', error);
    throw error;
  }
};

export const reverseGeocode = async (lat: number, lon: number) => {
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_PLACES_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0].properties.formatted;
    }
    
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw error;
  }
};

export const geocodeLocation = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_PLACES_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error geocoding location:', error);
    throw error;
  }
};

// Parse POI data from different sources
export const parsePOI = (properties: any): POI => {
  return {
    name: properties.name || 'Unnamed location',
    address: properties.address_line1 || '',
    categories: properties.categories || [],
    lat: properties.lat,
    lon: properties.lon
  };
};

// Determine the POI icon based on category
export const getPOIIcon = (poi: POI): string => {
  const categories = poi.categories || [];
  
  if (categories.includes('commercial.supermarket')) {
    return '🛒';
  } else if (categories.includes('leisure.park')) {
    return '🌳';
  } else if (categories.includes('catering.cafe')) {
    return '☕';
  } else if (categories.includes('catering.fast_food')) {
    return '🍔';
  } else {
    return '🍴'; // Default restaurant icon
  }
};