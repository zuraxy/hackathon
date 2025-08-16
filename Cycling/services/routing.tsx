import { BikeType } from '../components/map/types';

// API key
const GEOAPIFY_ROUTING_API_KEY = '2caa374bd15543d18ca2a37f1f36c9c4';

export interface Location {
  lat: number;
  lon: number;
}

export interface Hazard {
  lat: number;
  lon: number;
  type: string;
  description: string;
}

export interface RouteOptions {
  source: Location;
  destination: Location;
  bikeType: BikeType;
  hazards?: Hazard[];
}

export const fetchRoute = async (options: RouteOptions) => {
  const { source, destination, bikeType } = options;
  
  try {
    // Format coordinates properly
    const fromLon = parseFloat(source.lon.toString()).toFixed(6);
    const fromLat = parseFloat(source.lat.toString()).toFixed(6);
    const toLon = parseFloat(destination.lon.toString()).toFixed(6);
    const toLat = parseFloat(destination.lat.toString()).toFixed(6);
    
    // Map bike type to API parameter (Geoapify currently only supports 'bicycle')
    const profile = 'bicycle';
    
    const url = `https://api.geoapify.com/v1/routing?waypoints=${fromLat},${fromLon}|${toLat},${toLon}&mode=${profile}&apiKey=${GEOAPIFY_ROUTING_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Routing API request failed with status:', response.status);
      
      // Try to get more details from the error response
      try {
        const errorText = await response.text();
        console.error('Error details:', errorText);
      } catch (textError) {
        console.error('Could not read error details:', textError);
      }
      
      throw new Error(`Routing API failed. Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
};

// Helper function to extract route information from API response
export const extractRouteInfo = (routeData: any) => {
  // Handle different API response formats
  let properties: any = {};
  let routeCoordinates = null;
  
  if (routeData.features && routeData.features.length > 0) {
    // FeatureCollection format
    properties = routeData.features[0].properties || {};
    
    // Handle both SingleLineString and MultiLineString geometries
    const geometry = routeData.features[0].geometry;
    if (geometry.type === 'LineString') {
      routeCoordinates = geometry.coordinates;
    } else if (geometry.type === 'MultiLineString') {
      // Flatten the MultiLineString to a single array of coordinates
      routeCoordinates = geometry.coordinates.flat();
    }
  } else if (routeData.results && routeData.results.length > 0) {
    // Results format
    properties = routeData.results[0].properties || {};
    
    const geometry = routeData.results[0].geometry;
    if (typeof geometry.coordinates !== 'undefined') {
      routeCoordinates = geometry.coordinates;
    } else {
      routeCoordinates = geometry; // Some APIs return the coordinates directly
    }
  }
  
  // Extract distance - check all possible locations where it might be stored
  let distanceMeters = 0;
  if (properties.distance) {
    distanceMeters = properties.distance;
  } else if (properties.legs && properties.legs.length > 0) {
    distanceMeters = properties.legs[0].distance || 0;
  } else if (properties.length) {
    distanceMeters = properties.length;
  }
  
  // Extract time from seconds
  let timeSeconds = 0;
  if (properties.legs && properties.legs.length > 0 && properties.legs[0].time) {
    timeSeconds = properties.legs[0].time;
  } else {
    timeSeconds = properties.time || properties.duration || 0;
  }
  
  return {
    routeCoordinates,
    properties,
    distance: distanceMeters,
    time: timeSeconds,
    // Return the original data as well for other components
    originalData: routeData
  };
};