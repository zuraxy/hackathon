# API Service Integration Documentation

This document explains how the service files are integrated with the frontend components in the CycleWaze app.

## Service Files

### 1. map-fetching.tsx
Contains functions for working with the Geoapify Places API:
- `searchNearbyPOIs`: Search for points of interest near a location
- `reverseGeocode`: Convert coordinates to a human-readable address
- `geocodeLocation`: Convert a text query to coordinates
- Helper functions for parsing POI data

### 2. routing.tsx
Contains functions for working with the Geoapify Routing API:
- `fetchRoute`: Get a cycling route between two points
- `extractRouteInfo`: Parse the route data from the API response
- Type definitions for Location, Hazard, etc.

### 3. userfetching.tsx
Contains functions for managing user data:
- `getUserPreferences`: Get user settings like bike type and search radius
- `reportHazard`: Send hazard reports
- `getHazardsNearLocation`: Get hazards near a location
- `saveFavoriteRoute`: Save favorite routes

## Component Integration

### MapView.tsx
- Uses `reverseGeocode` from map-fetching.tsx via a wrapper function called `handleReverseGeocode`
- WebView HTML still contains direct API calls for rendering the map, POIs, and routes
- API keys are now only declared once (in their respective service files) except for the map tiles API key

### RouteSearch.tsx
- Uses `geocodeLocation` from map-fetching.tsx for address search
- Uses `reverseGeocode` via a wrapper function called `handleReverseGeocode`
- No more hardcoded API keys in this component

### RouteInfo.tsx
- Uses local `extractRouteInfoUI` function that could be replaced with `extractRouteInfo` from routing.tsx in the future
- Function was renamed to avoid conflicts with the imported service

## Current Challenges

- The WebView environment can't directly use the React Native service functions
- We need a communication bridge between React Native and WebView to fully utilize our services

## Future Improvements

1. **API Call Delegation**: 
   - Move all API calls from WebView to React Native services
   - Use message passing to request data from React Native and receive results in WebView

2. **Enhanced Error Handling**:
   - Add proper error boundaries and fallbacks
   - Implement retry mechanisms for failed API calls

3. **Performance Optimizations**:
   - Implement caching for frequently used data like POIs and routes
   - Add request batching to reduce API calls

4. **Offline Support**:
   - Cache map tiles and route data for offline use
   - Implement queue system for operations done while offline

5. **User Experience**:
   - Add loading indicators for all API operations
   - Implement graceful fallbacks when services are unavailable
