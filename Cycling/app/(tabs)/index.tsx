import { ThemedText } from '@/components/ThemedText';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import MapView from '@/components/map/MapView';
import RouteInfo from '@/components/map/RouteInfo';
import RouteSearch from '@/components/map/RouteSearch';

// Example hazards - in a real app, these would come from a server
const exampleHazards = [
  {
    lat: 14.6015,
    lon: 120.9802,
    type: 'Construction',
    description: 'Road work in progress, narrow lane'
  },
  {
    lat: 14.5975,
    lon: 120.9822,
    type: 'Pothole',
    description: 'Large pothole on right side of road'
  },
  {
    lat: 14.6035,
    lon: 120.9842,
    type: 'Glass/Debris',
    description: 'Broken glass on bike lane'
  },
  {
    lat: 14.5955,
    lon: 120.9872,
    type: 'Flooding',
    description: 'Road partially flooded after rain'
  }
];

export default function HomeScreen() {
  const routeSearchRef = useRef<any>(null);
  // Default to Manila, but will try to get actual location
  const [currentLocation, setCurrentLocation] = useState({ lat: 14.5995, lon: 120.9842 });
  const [, setLocationPermission] = useState(false);
  const [isLocating, setIsLocating] = useState(true);
  const [currentLocationName, setCurrentLocationName] = useState<string | undefined>(undefined);
  
  // Remove the default destination to avoid route errors initially
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lon: number } | undefined>(undefined);
  const [destinationName, setDestinationName] = useState<string | undefined>(undefined);
  const [bikeType, setBikeType] = useState('regular');
  const [selectedPoi, setSelectedPoi] = useState<any>(null);
  const [hazards, setHazards] = useState<{
    lat: number;
    lon: number;
    type: string;
    description: string;
  }[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  

  // Request permission and get location
  useEffect(() => {
    (async () => {
      try {
        // Request permission to access location
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === 'granted');
        
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Denied',
            'CycleWaze needs your location to provide navigation. You can enable location services in your device settings.',
            [{ text: 'OK' }]
          );
          setIsLocating(false);
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        
        console.log('Got actual location:', location.coords);
        
        // Update location
        setCurrentLocation({
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        });
        
        // Get address from coordinates
        try {
          const response = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${location.coords.latitude}&lon=${location.coords.longitude}&apiKey=a324d4a77fbc42d0833e1f790c02db81`
          );
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const address = data.features[0].properties.formatted;
            setCurrentLocationName(address);
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert(
          'Location Error',
          'Failed to get your current location. Using default location instead.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLocating(false);
      }
    })();
  }, []);

  // Load example hazards
  useEffect(() => {
    // In a real app, would fetch real hazards near the user's location
    const timer = setTimeout(() => {
      // Adjust hazards to be near the user's actual location
      const adjustedHazards = exampleHazards.map(hazard => ({
        ...hazard,
        lat: currentLocation.lat + (hazard.lat - 14.5995),
        lon: currentLocation.lon + (hazard.lon - 120.9842)
      }));
      setHazards(adjustedHazards);
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentLocation]);

  // placeholder for adding hazards - currently unused in this build

  const handleRouteSearch = (
    source: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    biketype: string
  ) => {
    setCurrentLocation(source);
    setDestinationLocation(destination);
    setBikeType(biketype);
    setSelectedPoi(null); // Clear any selected POI when manually searching
  };

  const handleRouteChange = (route: any) => {
    setRouteInfo(route);
  };
  
  const handlePoiSelected = (poi: any) => {
    console.log('POI selected in main app:', poi);
    setSelectedPoi(poi);
    setDestinationName(poi.name);
    setDestinationLocation({
      lat: poi.lat,
      lon: poi.lon
    });
    
    // Show route info when POI is selected
    if (routeInfo) {
      // Leave the current route info visible if it exists
      // It will be updated when the route is calculated
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <MapView
        sourceLocation={currentLocation}
        destinationLocation={destinationLocation}
        bikeType={bikeType as 'road' | 'mountain' | 'regular' | 'electric'}
        hazards={hazards}
        onRouteChange={handleRouteChange}
        isLoadingLocation={isLocating}
        locationName={currentLocationName}
        onPoiSelected={handlePoiSelected}
      />
      {/* Current Location pill at the top */}
      {/* <View style={styles.topInfo}>
        <LocationDisplay locationName={currentLocationName} isLoading={isLocating} />
      </View> */}
      
      <View>
        {/* RouteSearch exposes open/close via ref */}
        <RouteSearch 
          ref={routeSearchRef}
          onSearch={handleRouteSearch}
          defaultSource={currentLocation}
          hideFloatingButton={!!routeInfo}
        />
      
        {/* Hide hazard reporting UI while a route is active */}
        {/* {!routeInfo && (
          <HazardInput
            onAddHazard={handleAddHazard}
            currentLocation={currentLocation}
            locationName={currentLocationName}
          />
        )} */}
      </View>
      
      {routeInfo && (
        <>
          <RouteInfo 
            routeInfo={routeInfo} 
            onClose={() => {
              setRouteInfo(null);
              if (selectedPoi) {
                setSelectedPoi(null);
              }
            }}
            destination={destinationName}
          />

          {/* Bottom action bar shown while route is active */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 20, paddingHorizontal: 20, zIndex: 1200 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 0.48 }}>
                <TouchableOpacity style={{ backgroundColor: '#ffffff', padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' }} onPress={() => {
                  // reopen planner and clear route info so user can edit plan
                  setRouteInfo(null);
                  if (routeSearchRef && (routeSearchRef as any).current && (routeSearchRef as any).current.open) {
                    (routeSearchRef as any).current.open();
                  }
                }}>
                  <ThemedText style={{ color: '#212121', fontWeight: '700' }}>Back to Plan</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 0.48 }}>
                <TouchableOpacity style={{ backgroundColor: '#00c853', padding: 12, borderRadius: 8, alignItems: 'center' }} onPress={() => {
                  // Keep the route active — optionally could start navigation here
                }}>
                  <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Start Cycling</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}
      
      {selectedPoi && !routeInfo && (
        <View style={styles.poiToastContainer}>
          <ThemedText style={styles.poiToastText}>
            Routing to: {selectedPoi.name || 'Selected location'}
          </ThemedText>
          {selectedPoi.category && (
            <ThemedText style={styles.poiToastSubtext}>
              {selectedPoi.category.charAt(0).toUpperCase() + selectedPoi.category.slice(1)}
              {selectedPoi.address ? ` • ${selectedPoi.address}` : ''}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
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
  poiToastSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
  },
});
