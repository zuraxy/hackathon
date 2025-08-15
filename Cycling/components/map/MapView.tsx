import { ThemedText } from '@/components/ThemedText';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import LocationDisplay from './LocationDisplay';
import { searchNearbyPOIs, reverseGeocode } from '@/services/map-fetching';
import { fetchRoute, extractRouteInfo, Hazard, Location } from '@/services/routing';
import { getHazardsNearLocation } from '@/services/userfetching';
import * as ExpoLocation from 'expo-location';

// Geoapify API key for map tiles only
const GEOAPIFY_API_KEY = '1393d8eed4394d73b1d5557754d1c824'; // For map tiles

interface MapViewProps {
  sourceLocation?: { lat: number; lon: number };
  destinationLocation?: { lat: number; lon: number };
  bikeType?: 'road' | 'mountain' | 'regular' | 'electric';
  hazards?: {
    lat: number;
    lon: number;
    type: string;
    description: string;
  }[];
  onRouteChange?: (newRoute: any) => void;
  isLoadingLocation?: boolean;
  locationName?: string;
  onPoiSelected?: (poi: any) => void;
}

const MapView: React.FC<MapViewProps> = ({
  sourceLocation = { lat: 14.5995, lon: 120.9842 }, // Default to Manila
  destinationLocation,
  bikeType = 'regular',
  hazards = [],
  onRouteChange,
  isLoadingLocation = false,
  locationName,
  onPoiSelected,
}) => {
  const [currentLocationName, setCurrentLocationName] = useState<string | undefined>(locationName);
  const [selectedPoi, setSelectedPoi] = useState<any>(null);
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locationWatchRef = useRef<ExpoLocation.LocationSubscription | null>(null);
  const lastRouteUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (webViewRef.current && sourceLocation) {
      // Update center of map when source location changes, even if we don't have a destination yet
      const message = JSON.stringify({
        type: 'updateCenter',
        center: sourceLocation,
      });
      webViewRef.current.postMessage(message);
      
      // If no location name is provided, try to fetch it
      if (!locationName) {
        handleReverseGeocode(sourceLocation.lat, sourceLocation.lon);
      } else if (locationName !== currentLocationName) {
        setCurrentLocationName(locationName);
      }
    }
  }, [sourceLocation, locationName]);
  
  const handleReverseGeocode = async (lat: number, lon: number) => {
    try {
      const address = await reverseGeocode(lat, lon);
      if (address) {
        setCurrentLocationName(address);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  useEffect(() => {
    if (webViewRef.current && sourceLocation && destinationLocation) {
      // When source or destination changes, update the route
      const message = JSON.stringify({
        type: 'updateRoute',
        source: sourceLocation,
        destination: destinationLocation,
        bikeType,
        hazards,
      });
      webViewRef.current.postMessage(message);
    }
  }, [sourceLocation, destinationLocation, bikeType, hazards]);

  // When destination is cleared, instruct WebView to clear the current route
  useEffect(() => {
    if (webViewRef.current && !destinationLocation) {
      const message = JSON.stringify({ type: 'clearRoute' });
      webViewRef.current.postMessage(message);
    }
  }, [destinationLocation]);

  // Push hazard updates to the WebView even when no route is active
  useEffect(() => {
    if (webViewRef.current) {
      const message = JSON.stringify({ type: 'updateHazards', hazards });
      webViewRef.current.postMessage(message);
    }
  }, [hazards]);

  const handleMessage = (event: any) => {
    try {
      console.log('Received message from WebView:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'routeUpdated' && onRouteChange) {
        console.log('Route updated, notifying parent component');
        onRouteChange(data.route);
      } else if (data.type === 'mapLoaded') {
        console.log('Map loaded successfully');
        setLoading(false);
      } else if (data.type === 'error') {
        console.error('Error from WebView:', data.message);
        setError(data.message);
        setLoading(false);
      } else if (data.type === 'debug') {
        console.log('Debug from WebView:', data.message);
      } else if (data.type === 'poiSelected') {
        console.log('POI selected:', data.poi);
        setSelectedPoi(data.poi);
        
        // Notify parent component if handler is provided
        if (onPoiSelected) {
          onPoiSelected(data.poi);
        }
        
        // Automatically route to this POI
        if (webViewRef.current && sourceLocation) {
          const message = JSON.stringify({
            type: 'updateRoute',
            source: sourceLocation,
            destination: { lat: data.poi.lat, lon: data.poi.lon },
            bikeType,
            hazards,
          });
          webViewRef.current.postMessage(message);
        }
      }
    } catch (e) {
      console.error('Failed to parse WebView message:', e);
    }
  };

  // Subscribe to foreground location updates and push them to the WebView every few seconds
  useEffect(() => {
    let isMounted = true;

    async function startLocationWatch() {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setError('Location permission not granted');
          return;
        }

        // Start watching position with a modest interval/distance to save battery
        locationWatchRef.current = await ExpoLocation.watchPositionAsync(
          {
            // Balanced accuracy is usually enough for cycling; use High for tighter tracking
            accuracy: ExpoLocation.Accuracy.Balanced,
            timeInterval: 3000, // every ~3 seconds
            distanceInterval: 5, // or every 5 meters, whichever comes first
          },
          (position) => {
            if (!isMounted) return;
            const { latitude, longitude } = position.coords;

            // Update map center and source marker
            if (webViewRef.current) {
              webViewRef.current.postMessage(
                JSON.stringify({
                  type: 'updateCenter',
                  center: { lat: latitude, lon: longitude },
                })
              );
            }

            // If we have a destination, refresh the route occasionally
            const now = Date.now();
            const minRouteUpdateMs = 5000; // avoid spamming route requests
            if (
              destinationLocation &&
              webViewRef.current &&
              now - lastRouteUpdateRef.current > minRouteUpdateMs
            ) {
              lastRouteUpdateRef.current = now;
              webViewRef.current.postMessage(
                JSON.stringify({
                  type: 'updateRoute',
                  source: { lat: latitude, lon: longitude },
                  destination: destinationLocation,
                  bikeType,
                  hazards,
                })
              );
            }
          }
        );
      } catch (e: any) {
        console.error('Failed to start location watcher:', e);
        if (isMounted) setError(e?.message || 'Failed to start location watcher');
      }
    }

    startLocationWatch();

    return () => {
      isMounted = false;
      try {
        locationWatchRef.current?.remove();
      } catch {}
      locationWatchRef.current = null;
    };
  }, [destinationLocation, bikeType, hazards]);

  // HTML content for the WebView with Leaflet map
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
      <!-- Add Polyline Decorator for route arrows -->
      <script src="https://unpkg.com/leaflet-polylinedecorator/dist/leaflet.polylineDecorator.js"></script>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        /* Enhanced route styling */
        .leaflet-interactive {
          transition: stroke-width 0.2s ease;
        }
        
        /* Hover effect for routes */
        .leaflet-interactive:hover {
          stroke-width: 10px !important;
        }
        #map {
          width: 100%;
          height: 100%;
          background-color: #f0f0f0;
        }
        .hazard-marker {
          width: 24px !important;
          height: 24px !important;
          margin-left: -12px !important;
          margin-top: -12px !important;
          background-color: transparent !important;
        }
        .hazard-icon {
          background-color: rgba(255, 0, 0, 0.8);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          border: 2px solid white;
          animation: pulse 1.5s infinite;
        }
        .poi-marker {
          width: 32px !important;
          height: 32px !important;
          margin-left: -16px !important;
          margin-top: -32px !important;
          background-color: transparent !important;
        }
        .poi-icon {
          color: #1976D2;
          font-size: 32px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
          cursor: pointer;
        }
        .poi-popup-button {
          display: block;
          width: 100%;
          padding: 8px;
          margin-top: 8px;
          background-color: #1976D2;
          color: white;
          border: none;
          border-radius: 4px;
          text-align: center;
          cursor: pointer;
          font-weight: bold;
        }
        .poi-popup-button:hover {
          background-color: #1565C0;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
          }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Debug function to help troubleshoot
        function debugLog(message) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'debug',
              message: message
            }));
          } catch (e) {
            console.error('Failed to send debug message:', e);
          }
        }
        
        debugLog('Initializing map...');
        
        // Initialize map
        let map;
        try {
          map = L.map('map', {
            // hide built-in zoom controls because the map is draggable; we'll provide a compass instead
            zoomControl: false,
            attributionControl: true,
            center: [${sourceLocation.lat}, ${sourceLocation.lon}],
            zoom: 16
          });
          debugLog('Map object created');
        } catch (e) {
          debugLog('Error creating map: ' + e.message);
          throw e;
        }
        
        // Use OpenStreetMap tiles as a fallback - these are free and widely accessible
        const osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Try to add Geoapify map tiles for cycling
        
        
        // Always add a marker for the current location to ensure something is visible
        try {
          debugLog('Adding current location marker');
          L.marker([${sourceLocation.lat}, ${sourceLocation.lon}])
            .addTo(map)
            .bindPopup('Your location')
            .openPopup();
        } catch (e) {
          debugLog('Error adding marker: ' + e.message);
        }        // Add legend for bike routes and hazards
        // Position it on the top-left and push it down so it doesn't overlap the RN location pill
        const legend = L.control({position: 'topleft'});
        legend.onAdd = function(map) {
          const div = L.DomUtil.create('div', 'info legend');
          div.style.backgroundColor = 'white';
          div.style.padding = '10px';
          div.style.borderRadius = '5px';
          div.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
          // Push the legend below the RN overlay (location pill). RN pill is at ~60px; use 80px for safe spacing.
          div.style.marginTop = '120px';
          div.style.zIndex = '1000';
          
          div.innerHTML = '<h4 style="margin: 0 0 5px 0; font-size: 14px;">CycleWaze Legend</h4>';
          
          // Bike route types
          div.innerHTML += '<div style="margin-top: 5px; font-size: 12px;"><b>Route Types:</b></div>';
          div.innerHTML += '<div><span style="display:inline-block; width:12px; height:4px; background-color:#673AB7; margin-right:5px;"></span> Regular Bike</div>';
          div.innerHTML += '<div><span style="display:inline-block; width:12px; height:4px; background-color:#FF5722; margin-right:5px;"></span> Road Bike</div>';
          div.innerHTML += '<div><span style="display:inline-block; width:12px; height:4px; background-color:#8BC34A; margin-right:5px;"></span> Mountain Bike</div>';
          div.innerHTML += '<div><span style="display:inline-block; width:12px; height:4px; background-color:#2196F3; margin-right:5px;"></span> Electric Bike</div>';
          
          // Hazard types
          div.innerHTML += '<div style="margin-top: 8px; font-size: 12px;"><b>Hazards:</b></div>';
          div.innerHTML += '<div><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:red; margin-right:5px;"></span> Reported Hazards</div>';
          
          return div;
        };
        legend.addTo(map);

        // Markers for source, destination
        let sourceMarker = null;
        let destinationMarker = null;
  let routeLayer = null;
  let routeBackgroundLayer = null;
  let routeArrowDecorator = null;
        let hazardMarkers = [];
        let poiMarkers = [];

        // Function to add hazard markers
        const GEOAPIFY_ICON_API_KEY = '6b263d869c104fc3aa7bf8903cb2c074';

        function addHazardMarkers(hazards) {
          // Remove old hazard markers
          hazardMarkers.forEach(marker => map.removeLayer(marker));
          hazardMarkers = [];
          
          // Add new hazard markers
          hazards.forEach(hazard => {
            // Map hazard type to icon and color for Geoapify icon API
            let iconName = 'warning';
            let colorHex = '#e53935'; // red default
            if (hazard.type === 'Flooding') { iconName = 'waves'; colorHex = '#1e88e5'; }
            else if (hazard.type === 'Construction') { iconName = 'construction'; colorHex = '#fb8c00'; }
            else if (hazard.type === 'Accident') { iconName = 'car_crash'; colorHex = '#e53935'; }

            // Build Geoapify icon URL (Material icon set)
            const colorParam = encodeURIComponent(colorHex);
            const iconUrl = 'https://api.geoapify.com/v1/icon/?type=material&size=large&color=' + colorParam + '&icon=' + encodeURIComponent(iconName) + '&apiKey=' + GEOAPIFY_ICON_API_KEY;

            let marker;
            try {
              const leafletIcon = L.icon({
                iconUrl,
                iconSize: [34, 34],
                iconAnchor: [17, 34],
                popupAnchor: [0, -28],
              });
              marker = L.marker([hazard.lat, hazard.lon], { icon: leafletIcon })
                .addTo(map)
                .bindPopup('<b>' + (hazard.type || 'Hazard') + '</b><br>' + (hazard.description || ''));
            } catch (e) {
              // Fallback to emoji-based marker if icon fails for any reason
              const fallbackIcon = L.divIcon({
                className: 'hazard-marker',
                html: '<div class="hazard-icon">⚠</div>',
                iconSize: [24, 24]
              });
              marker = L.marker([hazard.lat, hazard.lon], { icon: fallbackIcon })
                .addTo(map)
                .bindPopup('<b>' + (hazard.type || 'Hazard') + '</b><br>' + (hazard.description || ''));
            }
              
            hazardMarkers.push(marker);
          });
        }
        
        // Function to animate the route when it's first loaded
        function animateRoute(routeLine) {
          if (!routeLine) return;
          
          // Get the path element and apply a "drawing" animation
          const path = routeLine._path;
          if (path) {
            // Get the total length of the path
            const length = path.getTotalLength();
            
            // Set up the animation using CSS
            path.style.transition = 'none'; // Temporarily disable transitions
            path.style.strokeDasharray = length + ' ' + length;
            path.style.strokeDashoffset = length;
            
            // Force a layout calculation
            path.getBoundingClientRect();
            
            // Define the animation
            path.style.transition = 'stroke-dashoffset 1.5s ease-in-out';
            path.style.strokeDashoffset = '0';
            
            // Reset the dash array after animation completes
            setTimeout(() => {
              path.style.transition = '';
              path.style.strokeDasharray = 'none';
            }, 1500);
          }
        }
        
        // Function to search and add Points of Interest (POIs)
        // Note: We're keeping the WebView implementation for now since we need to directly interact with the map
        // In the future, we could pass the data from the React Native side through the WebView bridge
        async function searchNearbyPOIs(lat, lon, radius = 3000, types = ['catering.restaurant', 'catering.fast_food', 'catering.cafe', 'commercial.supermarket', 'leisure.park']) {
          try {
            debugLog('Searching for POIs near: ' + lat + ', ' + lon);
            
            // Clear existing POI markers
            poiMarkers.forEach(marker => map.removeLayer(marker));
            poiMarkers = [];
            
            // This would ideally use the service from React Native side
            // For now we still use the direct API call inside WebView
            // Format coordinates properly
            const formattedLon = parseFloat(lon).toFixed(6);
            const formattedLat = parseFloat(lat).toFixed(6);
            
            // Use Geoapify Places API to find POIs
            const url = \`https://api.geoapify.com/v2/places?categories=\${types.join(',')}&filter=circle:\${formattedLon},\${formattedLat},\${radius}&bias=proximity:\${formattedLon},\${formattedLat}&limit=20&apiKey=${'a324d4a77fbc42d0833e1f790c02db81'}\`;
            
            debugLog('Fetching POIs with URL: ' + url.replace(/apiKey=([^&]*)/, 'apiKey=API_KEY_HIDDEN'));
            
            const response = await fetch(url);
            
            if (!response.ok) {
              debugLog('POI API error: ' + response.status + ' - ' + response.statusText);
              throw new Error('POI API returned status: ' + response.status);
            }
            
            const data = await response.json();
            debugLog('POI data received: ' + JSON.stringify(data).substring(0, 100) + '...');
            
            if (data.features && data.features.length > 0) {
              debugLog('Found ' + data.features.length + ' POIs');
              
              data.features.forEach(poi => {
                // Use our helper function to add each POI marker
                addPOIMarker(poi.properties);
              });
            } else {
              debugLog('No POIs found in the response. Response body: ' + JSON.stringify(data).substring(0, 200));
              
              // Fallback to add at least one test POI if none are found
              const testPOI = {
                properties: {
                  name: "Test Restaurant",
                  address_line1: "Near your location",
                  categories: ["catering.restaurant"],
                  lat: parseFloat(lat) + 0.001,  // Slightly offset from current location
                  lon: parseFloat(lon) + 0.001
                }
              };
              
              // Add test marker
              addPOIMarker(testPOI.properties);
              debugLog('Added test POI marker as fallback');
            }
          } catch (error) {
            debugLog('Error searching POIs: ' + error.message);
            console.error(error);
          }
        }
        
        // Helper function to add a POI marker
  function addPOIMarker(properties) {
          try {
            const { lat, lon, name, address_line1, categories } = properties;
            const displayName = name || 'POI';
            const address = address_line1 || '';
            const category = Array.isArray(categories) && categories.length ? categories[0] : 'poi';

            const poiIcon = L.divIcon({
              className: 'poi-marker',
              html: '<div class="poi-icon">📍</div>',
              iconSize: [32, 32]
            });

            const marker = L.marker([lat, lon], { icon: poiIcon }).addTo(map);
            // Build popup using normal string concatenation to avoid nested template-literal issues
            var popupHtml = '';
            popupHtml += '<div>';
            popupHtml += '<div style="font-weight:600; margin-bottom:4px;">' + (displayName || 'POI') + '</div>';
            if (address) {
              popupHtml += '<div style="font-size:12px; color:#555; margin-bottom:8px;">' + address + '</div>';
            }
            var btnId = 'poi-go-btn-' + Math.random().toString(36).slice(2);
            popupHtml += '<button id="' + btnId + '" class="poi-popup-button">Go</button>';
            popupHtml += '</div>';
            marker.bindPopup(popupHtml);
            marker.on('popupopen', () => {
              // Attach click handler to send selection back to RN
              const btn = document.getElementById(btnId);
              if (btn) {
                btn.onclick = function() {
                  try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'poiSelected',
                      poi: {
                        name: displayName,
                        address: address,
                        category: category,
                        lat: lat,
                        lon: lon
                      }
                    }));
                  } catch (e) {
                    console.error('Failed to send poiSelected:', e);
                  }
                };
              }
            });

            poiMarkers.push(marker);
          } catch (e) {
            debugLog('Failed to add POI marker: ' + e.message);
          }
        }

        // Function to fetch and display route
        async function fetchRoute(source, destination, bikeType, hazards = []) {
          try {
            // Set up source and destination markers
            if (sourceMarker) map.removeLayer(sourceMarker);
            if (destinationMarker) map.removeLayer(destinationMarker);
            
            sourceMarker = L.marker([source.lat, source.lon], {
              icon: L.divIcon({
                className: 'source-marker',
                html: '<div style="background-color:#3498db; width:14px; height:14px; border-radius:50%; border:3px solid white;"></div>',
                iconSize: [20, 20]
              })
            })
              .addTo(map)
              .bindPopup('Start');
              
            destinationMarker = L.marker([destination.lat, destination.lon], {
              icon: L.divIcon({
                className: 'destination-marker',
                html: '<div style="background-color:#e74c3c; width:14px; height:14px; border-radius:50%; border:3px solid white;"></div>',
                iconSize: [20, 20]
              })
            })
              .addTo(map)
              .bindPopup('Destination');
            
            // Add hazard markers  
            addHazardMarkers(hazards);
            
            // Since we can't use the React Native service directly from WebView,
            // we'll still need to implement the API call here
            // In an ideal implementation, this would pass a message to React Native
            // which would use the service and return the result
            
            // Define bike profile based on bike type - FIXED to use Geoapify's supported values
            let profile;
            switch(bikeType) {
              case 'road':
                profile = 'bicycle';  // Use standard bicycle for road
                break;
              case 'mountain':
                profile = 'bicycle';  // Use standard bicycle for mountain
                break;
              case 'electric':
                profile = 'bicycle';  // Use standard bicycle for electric
                break;
              default:
                profile = 'bicycle';  // Default to bicycle (the supported Geoapify mode)
            }
            
            // Fetch route from Geoapify Routing API
            let data;
            try {
              debugLog('Preparing to fetch route...');
              // Format coordinates properly and ensure correct API format
              // NOTE: Geoapify expects longitude first, then latitude!
              const fromLon = parseFloat(source.lon).toFixed(6);
              const fromLat = parseFloat(source.lat).toFixed(6);
              const toLon = parseFloat(destination.lon).toFixed(6);
              const toLat = parseFloat(destination.lat).toFixed(6);
              
              // FIXED: Using correct coordinate order (lon,lat) and endpoint
              const url = 'https://api.geoapify.com/v1/routing?waypoints=' + fromLat + ',' + fromLon + '|' + toLat + ',' + toLon + '&mode=' + profile + '&apiKey=2caa374bd15543d18ca2a37f1f36c9c4';
              
              // Detailed debugging information
              debugLog('Coordinate details:');
              debugLog('Source: lon=' + fromLon + ', lat=' + fromLat + ' (original: lon=' + source.lon + ', lat=' + source.lat + ')');
              debugLog('Destination: lon=' + toLon + ', lat=' + toLat + ' (original: lon=' + destination.lon + ', lat=' + destination.lat + ')');
              debugLog('Using mode: ' + profile);
              debugLog('Full routing URL: ' + url.replace(/apiKey=([^&]*)/, 'apiKey=API_KEY_HIDDEN'));
              
              // Make the request to the routing API
              let response = await fetch(url);
              
              // Check if request was successful
              if (!response.ok) {
                debugLog('Routing API request failed with status: ' + response.status);
                
                // Try to get more details from the error response
                try {
                  const errorText = await response.text();
                  debugLog('Error details: ' + errorText);
                } catch (textError) {
                  debugLog('Could not read error details: ' + textError);
                }
                
                throw new Error('Routing API failed. Status: ' + response.status);
              }
              
              data = await response.json();
              debugLog('Route data received: ' + JSON.stringify(data).substring(0, 100) + '...');
            } catch (e) {
              debugLog('Error fetching route: ' + e.message);
              throw e;
            }
            
            // Clear previous route if exists
            if (routeLayer) {
              map.removeLayer(routeLayer);
            }
            
            // Check if route was found - handle various API response formats
            let routeCoordinates = null;
            
            // Debug the received data structure to understand its format
            debugLog('Route data structure: ' + (data ? Object.keys(data).join(',') : 'undefined'));
            
            // Check for v1 API format (FeatureCollection with features array)
            if (data && data.features && data.features.length > 0) {
              debugLog('Using FeatureCollection API response format');
              
              // Handle both SingleLineString and MultiLineString geometries
              const geometry = data.features[0].geometry;
              if (geometry.type === 'LineString') {
                routeCoordinates = geometry.coordinates;
              } else if (geometry.type === 'MultiLineString') {
                // Flatten the MultiLineString to a single array of coordinates
                routeCoordinates = geometry.coordinates.flat();
                debugLog('Flattened MultiLineString coordinates: ' + routeCoordinates.length);
              }
            } 
            // Check for v2 API format
            else if (data && data.results && data.results.length > 0 && data.results[0].geometry) {
              debugLog('Using results API response format');
              const geometry = data.results[0].geometry;
              if (typeof geometry.coordinates !== 'undefined') {
                routeCoordinates = geometry.coordinates;
              } else {
                routeCoordinates = geometry; // Some APIs return the coordinates directly
              }
            }
            
            if (routeCoordinates) {
              
              // Convert GeoJSON coordinates (lon, lat) to Leaflet coordinates (lat, lon)
              const latLngs = routeCoordinates.map(coord => [coord[1], coord[0]]);
              
              // Get route color based on bike type
              let routeColor;
              switch(bikeType) {
                case 'road':
                  routeColor = '#FF5722'; // Orange-red for road bikes
                  break;
                case 'mountain':
                  routeColor = '#8BC34A'; // Green for mountain bikes
                  break;
                case 'electric':
                  routeColor = '#2196F3'; // Blue for electric bikes
                  break;
                default:
                  routeColor = '#673AB7'; // Purple for regular bikes
              }
              
              // Draw route on map with bike-specific styling and enhanced visibility
              
              // First add a wider background line for a "glow" effect
              // store background layer so we can clear it later
              routeBackgroundLayer = L.polyline(latLngs, {
                color: 'white',
                weight: 10, // Wider background for glow effect
                opacity: 0.5,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);
              
              // Then add the main route line on top
              routeLayer = L.polyline(latLngs, {
                color: routeColor,
                weight: 8,  // Increased from 6 to 8 for more visibility
                opacity: 1.0, // Increased from 0.8 to 1.0 for better visibility
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: bikeType === 'electric' ? '10, 5' : null
              }).addTo(map);
              
              // Add enhanced animated arrow decorators to show direction
              // store arrow decorator so we can clear it later
              routeArrowDecorator = L.polylineDecorator(routeLayer, {
                patterns: [
                  {
                    offset: '5%',
                    repeat: '8%',  // More frequent arrows (was 10%)
                    symbol: L.Symbol.arrowHead({
                      pixelSize: 18,  // Larger arrows (was 15)
                      pathOptions: {
                        fillOpacity: 1.0,  // More visible (was 0.8)
                        weight: 1,         // Add outline to arrows
                        color: routeColor,
                        fillColor: '#FFFFFF'  // White fill for contrast
                      }
                    })
                  }
                ]
              }).addTo(map);
              
              // Add enhanced start and end markers with larger, more visible icons
              const startIcon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background-color: green; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                iconSize: [22, 22]  // Larger icon size (was 16x16)
              });
              
              const endIcon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background-color: red; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                iconSize: [22, 22]  // Larger icon size (was 16x16)
              });
              
              // Replace basic markers with custom ones
              if (sourceMarker) map.removeLayer(sourceMarker);
              if (destinationMarker) map.removeLayer(destinationMarker);
              
              sourceMarker = L.marker([source.lat, source.lon], {icon: startIcon})
                .addTo(map)
                .bindPopup('Start');
                
              destinationMarker = L.marker([destination.lat, destination.lon], {icon: endIcon})
                .addTo(map)
                .bindPopup('Destination');
              
              // Fit the map to the route bounds with improved padding for better visibility
              map.fitBounds(routeLayer.getBounds(), { 
                padding: [80, 80],  // Increased padding from 50 to 80 pixels on each side
                maxZoom: 16,        // Limit maximum zoom level for better context
                animate: true       // Smooth animation when fitting bounds
              });
              
              // Add route animation to highlight it when first displayed
              animateRoute(routeLayer);
              
              // Determine which data structure to send based on the API version
              let routeData;
              if (data.features && data.features.length > 0) {
                routeData = data.features[0];
              } else if (data.results && data.results.length > 0) {
                routeData = data.results[0];
              }
              
              // Send route data back to React Native
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'routeUpdated',
                route: routeData
              }));
            } else {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'No route found. Please try again with a different destination.'
              }));
            }
          } catch (error) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
        }

        // Handle messages from React Native
        window.addEventListener('message', function(event) {
          const data = JSON.parse(event.data);
          
          if (data.type === 'updateRoute') {
            fetchRoute(data.source, data.destination, data.bikeType, data.hazards);
          } else if (data.type === 'updateCenter') {
            map.setView([data.center.lat, data.center.lon], 15);
            
            // Update the source marker's position
            if (sourceMarker) {
              sourceMarker.setLatLng([data.center.lat, data.center.lon]);
            } else {
              // Create a source marker if it doesn't exist yet
              sourceMarker = L.marker([data.center.lat, data.center.lon], {
                icon: L.divIcon({
                  className: 'source-marker',
                  html: '<div style="background-color:#3498db; width:14px; height:14px; border-radius:50%; border:3px solid white;"></div>',
                  iconSize: [20, 20]
                })
              }).addTo(map);
            }
            
            // Search for POIs around the new center
            searchNearbyPOIs(data.center.lat, data.center.lon, 3000);
          } else if (data.type === 'searchPOIs') {
            searchNearbyPOIs(data.lat, data.lon, data.radius || 3000, data.types);
          } else if (data.type === 'clearRoute') {
            try {
              if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
              if (routeBackgroundLayer) { map.removeLayer(routeBackgroundLayer); routeBackgroundLayer = null; }
              if (routeArrowDecorator) { map.removeLayer(routeArrowDecorator); routeArrowDecorator = null; }
              if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null; }
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: 'Route cleared' }));
            } catch (e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Failed to clear route: ' + e.message }));
            }
          } else if (data.type === 'updateHazards') {
            try {
              addHazardMarkers(data.hazards || []);
            } catch (e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Failed to update hazards: ' + e.message }));
            }
          }
        });

        // Add map event listeners for debugging
        map.on('load', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'debug',
            message: 'Map load event fired'
          }));
        });
        
        map.on('error', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'Map error: ' + e.message
          }));
        });
        
        // Listen for recenter message from React Native
        window.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data && data.type === 'recenter') {
              const center = [${sourceLocation.lat}, ${sourceLocation.lon}];
              map.setView(center, map.getZoom());
            }
          } catch (e) {
            console.error('Failed to handle message:', e);
          }
        });
        
        // Add welcome message anchored to the source marker (your location)
        // The control is positioned absolutely based on the marker's container point
        const welcomeControl = L.control({position: 'topright'});
        welcomeControl.onAdd = function(map) {
          const div = L.DomUtil.create('div', 'welcome-message');
          // Use absolute positioning so we can anchor to the marker's pixel position
          div.style.position = 'absolute';
          div.style.backgroundColor = 'white';
          div.style.padding = '10px 15px';
          div.style.borderRadius = '5px';
          div.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
          div.style.maxWidth = '260px';
          div.style.fontSize = '13px';
          div.style.zIndex = '1000';
          div.style.pointerEvents = 'auto';

          div.innerHTML = '<h4 style="margin: 0 0 5px 0; text-align: left; color: #1565c0;">Welcome to CycleWaze!</h4>';
          div.innerHTML += '<p style="margin: 0 0 8px 0; text-align: left; color: #333;">Tap "Start Cycling" to set your starting point and destination.</p>';

          // Add close button
          const closeBtn = document.createElement('button');
          closeBtn.innerHTML = 'Got it!';
          closeBtn.style.width = '100%';
          closeBtn.style.marginTop = '8px';
          closeBtn.style.padding = '6px';
          closeBtn.style.border = 'none';
          closeBtn.style.backgroundColor = '#1565c0';
          closeBtn.style.color = 'white';
          closeBtn.style.borderRadius = '4px';
          closeBtn.style.cursor = 'pointer';

          div.appendChild(closeBtn);

          // Positioning helper: place div under the source marker
          function positionUnderMarker() {
            try {
              let latlng;
              if (typeof sourceMarker !== 'undefined' && sourceMarker && sourceMarker.getLatLng) {
                latlng = sourceMarker.getLatLng();
              } else {
                // Fallback to initial center
                latlng = map.getCenter();
              }
              const p = map.latLngToContainerPoint(latlng);
              // place the box slightly to the right and below the marker
              const left = Math.max(8, p.x + 12);
              const top = Math.max(8, p.y + 28);
              div.style.left = left + 'px';
              div.style.top = top + 'px';
            } catch (e) {
              console.error('Error positioning welcome box:', e);
            }
          }

          // Reposition on map interactions
          map.on('move zoom resize', positionUnderMarker);

          // Close handler should remove listeners and the control
          closeBtn.onclick = function() {
            map.off('move zoom resize', positionUnderMarker);
            map.removeControl(welcomeControl);
          };

          // Initial placement
          setTimeout(positionUnderMarker, 50);

          return div;
        };
        welcomeControl.addTo(map);
        
        // Notify React Native that the map is initialized
        setTimeout(function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapLoaded'
          }));
          
          // Initial POI search once map is loaded
          const center = map.getCenter();
          searchNearbyPOIs(center.lat, center.lng, 1000);
        }, 1000);
        
        // Initial route if source and destination are provided
        ${destinationLocation ? 
          "fetchRoute(" +
            "{ lat: " + sourceLocation.lat + ", lon: " + sourceLocation.lon + " }," +
            "{ lat: " + destinationLocation.lat + ", lon: " + destinationLocation.lon + " }," +
            "'" + bikeType + "'," +
            JSON.stringify(hazards) +
          ");" 
        : ''}
      </script>
    </body>
    </html>
  `;

  // Generate a key for the WebView to force re-renders when needed
  const webViewKey = `map-${sourceLocation.lat}-${sourceLocation.lon}-${bikeType}-${hazards.length}`;
  
  return (
    <View style={styles.container}>
      {(loading || isLoadingLocation) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066ff" />
          <ThemedText style={styles.loadingText}>
            {isLoadingLocation ? 'Getting your location...' : 'Loading map...'}
          </ThemedText>
          {isLoadingLocation && (
            <ThemedText style={styles.loadingSubText}>
              Please allow location permissions for the best experience
            </ThemedText>
          )}
        </View>
      )}
      
      {selectedPoi && (
        <View style={styles.poiToastContainer}>
          <ThemedText style={styles.poiToastText}>
            Routing to: {selectedPoi.name}
          </ThemedText>
        </View>
      )}
      
      {!loading && !isLoadingLocation && (
        <View style={styles.locationNameContainer}>
          <LocationDisplay 
            locationName={currentLocationName} 
            showFullAddress={false}
          />
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      )}
      
      <WebView
        key={webViewKey}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        cacheEnabled={false}
        scalesPageToFit={true}
        onShouldStartLoadWithRequest={(request) => {
          console.log("Loading URL:", request.url);
          return true;
        }}
        onLoadEnd={() => {
          console.log("WebView load ended");
          setLoading(false);
        }}
        onLoad={() => {
          console.log("WebView loaded");
        }}
        onError={(e) => {
          console.error('WebView error:', e);
          setError('Failed to load the map: ' + e.nativeEvent.description);
          setLoading(false);
        }}
        onHttpError={(e) => {
          console.error('WebView HTTP error:', e.nativeEvent);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 30,
    marginTop: 6,
  },
  errorContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 5,
    zIndex: 1000,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignSelf: 'center',
  },
  retryText: {
    color: '#ff0000',
    fontWeight: 'bold',
  },
  locationNameContainer: {
  position: 'absolute',
  top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    pointerEvents: 'none',
  },
  locationNameText: {
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    color: '#333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    fontWeight: '500',
    maxWidth: '80%',
    textAlign: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  poiToastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#1976D2',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  poiToastText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  compassButton: {
    position: 'absolute',
    top: 80,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  compassIcon: {
    fontSize: 20,
  },
});

export default MapView;
