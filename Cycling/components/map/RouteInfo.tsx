import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

interface RouteInfoProps {
  routeInfo: any;
  onClose: () => void;
  destination?: string;
}

const RouteInfo: React.FC<RouteInfoProps> = ({ routeInfo, onClose, destination }) => {
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const buttonColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');

  // Check if we have valid route info - works with both v1 and v2 API responses
  if (!routeInfo) {
    return null;
  }

  const { distance, time, difficulty } = extractRouteInfoUI(routeInfo);

  return (
    <View style={styles.container}>
      <ThemedView style={[styles.infoBox, { backgroundColor }]}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Route Information</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={{ color: buttonColor }}>Close</ThemedText>
          </TouchableOpacity>
        </View>
        
        {destination && (
          <View style={styles.destinationRow}>
            <ThemedText style={styles.destinationText}>To: {destination}</ThemedText>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <ThemedText style={styles.label}>Distance:</ThemedText>
          <ThemedText style={styles.value}>{distance}</ThemedText>
        </View>
        
        <View style={styles.infoRow}>
          <ThemedText style={styles.label}>Estimated Time:</ThemedText>
          <ThemedText style={styles.value}>{time}</ThemedText>
        </View>
        
        <View style={styles.infoRow}>
          <ThemedText style={styles.label}>Difficulty Level:</ThemedText>
          <ThemedText style={styles.value}>{difficulty}</ThemedText>
        </View>
      </ThemedView>
    </View>
  );
};

function extractRouteInfoUI(routeInfo: any) {
  // Debug the route info structure
  console.log('RouteInfo structure:', routeInfo && typeof routeInfo === 'object' ? 
    Object.keys(routeInfo) : 'Invalid routeInfo');
  
  // Handle different API response formats
  let properties: any = {};
  
  if (routeInfo.properties) {
    // Direct properties object
    properties = routeInfo.properties;
  } else if (routeInfo.features && routeInfo.features.length > 0) {
    // FeatureCollection format
    properties = routeInfo.features[0].properties || {};
  }
  
  // Extract distance - check all possible locations where it might be stored
  let distanceMeters = 0;
  
  if (properties.distance) {
    // Direct distance property
    distanceMeters = properties.distance;
  } else if (properties.legs && properties.legs.length > 0) {
    // Distance might be in the legs array (as in your example)
    distanceMeters = properties.legs[0].distance || 0;
  } else if (properties.length) {
    // Some APIs use "length" instead
    distanceMeters = properties.length;
  }
  
  const distanceKm = (distanceMeters / 1000).toFixed(1);
  const distance = `${distanceKm} km`;
  
  // Extract time from seconds to minutes/hours
  // V1 API uses properties.time, V2 API might use properties.time, properties.duration, or properties.legs[0].time
  let timeSeconds = 0;
  if (properties.legs && properties.legs.length > 0 && properties.legs[0].time) {
    // Get time from legs array (preferred for newer API format)
    timeSeconds = properties.legs[0].time;
  } else {
    // Fallback to direct properties
    timeSeconds = properties.time || properties.duration || 0;
  }
  
  let time;
  if (timeSeconds < 60) {
    time = `${timeSeconds} seconds`;
  } else if (timeSeconds < 3600) {
    time = `${Math.floor(timeSeconds / 60)} minutes`;
  } else {
    const hours = Math.floor(timeSeconds / 3600);
    const minutes = Math.floor((timeSeconds % 3600) / 60);
    time = `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  // Calculate difficulty based on distance and potentially elevation data
  let difficulty;
  
  // Check for elevation data in the legs if available
  let hasSignificantElevation = false;
  if (properties.legs && properties.legs.length > 0 && properties.legs[0].steps) {
    // Check if any steps have significant elevation change
    hasSignificantElevation = properties.legs[0].steps.some((step: any) => 
      step.elevation_gain > 30 || step.elevation_loss > 30);
  }
  
  if (distanceMeters < 3000) {
    difficulty = hasSignificantElevation ? 'Moderate' : 'Easy';
  } else if (distanceMeters < 8000) {
    difficulty = hasSignificantElevation ? 'Challenging' : 'Moderate';
  } else {
    difficulty = 'Challenging';
  }
  
  return { distance, time, difficulty };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
  },
  infoBox: {
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  label: {
    fontWeight: '600',
  },
  value: {
    textAlign: 'right',
  },
  destinationRow: {
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  destinationText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  }
});

export default RouteInfo;
