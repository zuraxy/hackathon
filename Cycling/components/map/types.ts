export type BikeType = 'road' | 'mountain' | 'regular' | 'electric';

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

export interface POI {
  name: string;
  address?: string;
  category?: string;
  lat: number;
  lon: number;
}

export interface RouteData {
  distance: number;
  time: number;
  routeCoordinates: number[][];
  properties: any;
}