import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

interface LocationDisplayProps {
  locationName?: string;
  isLoading?: boolean;
  showFullAddress?: boolean;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({
  locationName,
  isLoading = false,
  showFullAddress = false,
}) => {
  // If no location name and not loading, don't render anything
  if (!locationName && !isLoading) {
    return null;
  }

  // Format the address for display - shorten it if showFullAddress is false
  const formatAddress = (address: string): string => {
    if (showFullAddress) {
      return address;
    }
    
    // Try to extract just the area name, city, or first part of address
    const parts = address.split(',');
    if (parts.length >= 2) {
      // Return first two meaningful parts
      return parts.slice(0, 2).join(', ').trim();
    }
    return address;
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Finding location...</ThemedText>
        </View>
      ) : (
        <ThemedText style={styles.locationText}>
          📍 {formatAddress(locationName || '')}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    maxWidth: '80%',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  locationText: {
    fontSize: 14,
    textAlign: 'center',
  }
});

export default LocationDisplay;
