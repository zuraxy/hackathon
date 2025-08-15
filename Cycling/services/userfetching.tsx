import { Location, Hazard } from './routing';

// If you plan to add user authentication later
interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserPreferences {
  defaultBikeType: 'road' | 'mountain' | 'regular' | 'electric';
  defaultRadius: number;
  favoriteRoutes: Array<{
    name: string;
    source: Location;
    destination: Location;
  }>;
  reportedHazards: Hazard[];
}

// Mock function for now, but you can expand this when you add a backend
export const getUserPreferences = async (): Promise<UserPreferences> => {
  // This would typically fetch from your backend
  return {
    defaultBikeType: 'regular',
    defaultRadius: 3000,
    favoriteRoutes: [],
    reportedHazards: []
  };
};

// Function to report a new hazard (would connect to backend)
export const reportHazard = async (hazard: Hazard): Promise<boolean> => {
  try {
    // This would send data to your backend
    console.log('Reporting hazard:', hazard);
    
    // Mock successful response
    return true;
  } catch (error) {
    console.error('Error reporting hazard:', error);
    return false;
  }
};

// Get all reported hazards near a location
export const getHazardsNearLocation = async (
  location: Location,
  radius: number = 5000
): Promise<Hazard[]> => {
  try {
    // This would fetch from your backend
    // For now, we return mock data
    return [
      {
        lat: location.lat + 0.002,
        lon: location.lon + 0.001,
        type: 'Pothole',
        description: 'Large pothole in bike lane'
      },
      {
        lat: location.lat - 0.001,
        lon: location.lon + 0.003,
        type: 'Construction',
        description: 'Road work blocking the bike path'
      }
    ];
  } catch (error) {
    console.error('Error fetching hazards:', error);
    return [];
  }
};

// Save a favorite route (would connect to backend)
export const saveFavoriteRoute = async (
  name: string,
  source: Location,
  destination: Location
): Promise<boolean> => {
  try {
    // This would send data to your backend
    console.log('Saving favorite route:', { name, source, destination });
    
    // Mock successful response
    return true;
  } catch (error) {
    console.error('Error saving favorite route:', error);
    return false;
  }
};