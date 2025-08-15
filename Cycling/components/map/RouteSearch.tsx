import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import LocationDisplay from './LocationDisplay';

interface RouteSearchProps {
  onSearch: (source: { lat: number; lon: number }, destination: { lat: number; lon: number }, bikeType: string) => void;
  defaultSource?: { lat: number; lon: number };
}

const RouteSearch: React.FC<RouteSearchProps> = ({ 
  onSearch,
  defaultSource = { lat: 14.5995, lon: 120.9842 } // Default to Manila
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [source, setSource] = useState({
    name: 'Current Location',
    coords: defaultSource
  });
  const [destination, setDestination] = useState({
    name: '',
    coords: { lat: 0, lon: 0 }
  });
  const [bikeType, setBikeType] = useState('regular');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingFor, setIsSearchingFor] = useState<'source' | 'destination'>('destination');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  
  const buttonColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const accentColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');

  const bikeTypes = [
    { id: 'regular', name: 'Regular Bike' },
    { id: 'road', name: 'Road Bike' },
    { id: 'mountain', name: 'Mountain Bike' },
    { id: 'electric', name: 'Electric Bike' }
  ];

  // Effect to reverse geocode current location whenever defaultSource changes
  useEffect(() => {
    if (defaultSource && defaultSource.lat && defaultSource.lon && 
        (defaultSource.lat !== 14.5995 || defaultSource.lon !== 120.9842)) {
      reverseGeocode(defaultSource.lat, defaultSource.lon);
    }
  }, [defaultSource]);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      setIsLoadingAddress(true);
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=a324d4a77fbc42d0833e1f790c02db81`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const address = data.features[0].properties.formatted;
        setSource({
          name: address || 'Current Location',
          coords: defaultSource
        });
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleSubmit = () => {
    if (destination.coords.lat !== 0 && destination.coords.lon !== 0) {
      onSearch(source.coords, destination.coords, bikeType);
      setModalVisible(false);
    }
  };

  const searchLocation = async (query: string) => {
    if (query.length < 3) return;

    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=a324d4a77fbc42d0833e1f790c02db81`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setSearchResults(data.features.slice(0, 5));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchResults([]);
    }
  };

  const selectLocation = (feature: any) => {
    const name = feature.properties.formatted;
    const coords = {
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0]
    };

    if (isSearchingFor === 'source') {
      setSource({ name, coords });
    } else {
      setDestination({ name, coords });
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.searchButton, { backgroundColor: buttonColor }]}
        onPress={() => setModalVisible(true)}
      >
        <ThemedText style={styles.searchButtonText}>Plan Route</ThemedText>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalView}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Plan Your Cycling Route</ThemedText>
            
            {/* Source */}
            <ThemedText>Starting Point:</ThemedText>
            <TouchableOpacity 
              style={[styles.locationInput, isSearchingFor === 'source' ? styles.activeInput : {}]}
              onPress={() => {
                setIsSearchingFor('source');
                setSearchQuery(source.name !== 'Current Location' ? source.name : '');
              }}
            >
              <LocationDisplay 
                locationName={source.name !== 'Current Location' ? source.name : undefined} 
                isLoading={isLoadingAddress}
                showFullAddress={true}
              />
            </TouchableOpacity>
            
            {/* Destination */}
            <ThemedText>Destination:</ThemedText>
            <TouchableOpacity 
              style={[styles.locationInput, isSearchingFor === 'destination' ? styles.activeInput : {}]}
              onPress={() => {
                setIsSearchingFor('destination');
                setSearchQuery(destination.name);
              }}
            >
              <ThemedText>{destination.name || 'Select destination'}</ThemedText>
            </TouchableOpacity>
            
            {/* Bike Type Selection */}
            <ThemedText>Bike Type:</ThemedText>
            <View style={styles.bikeTypeContainer}>
              {bikeTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.bikeTypeButton,
                    bikeType === type.id && { backgroundColor: buttonColor }
                  ]}
                  onPress={() => setBikeType(type.id)}
                >
                  <ThemedText 
                    style={[
                      styles.bikeTypeText, 
                      bikeType === type.id && { color: '#FFFFFF' }
                    ]}
                  >
                    {type.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search Input - Always Visible */}
            <View style={styles.searchContainer}>
              <ThemedText style={styles.searchLabel}>
                Search for {isSearchingFor === 'source' ? 'starting point' : 'destination'}:
              </ThemedText>
              
              <TextInput
                style={[styles.searchInput, { backgroundColor }]}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  searchLocation(text);
                }}
                placeholder={`Enter location name...`}
                placeholderTextColor="#999"
                autoFocus={true}
              />
              
              {searchResults.length > 0 && (
                <ScrollView style={styles.searchResults}>
                  {searchResults.map((feature, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => selectLocation(feature)}
                    >
                      <ThemedText>{feature.properties.formatted}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.submitButton, { backgroundColor: buttonColor }]}
                onPress={handleSubmit}
                disabled={!destination.name}
              >
                <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  Get Route
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  activeInput: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalView: {
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  bikeTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  bikeTypeButton: {
    backgroundColor: '#EEEEEE',
    padding: 8,
    margin: 4,
    borderRadius: 20,
  },
  bikeTypeText: {
    fontSize: 14,
  },
  searchContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  searchLabel: {
    marginBottom: 5,
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 5,
    padding: 10,
  },
  searchResults: {
    maxHeight: 200,
    marginTop: 10,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 0.48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#EEEEEE',
  },
  submitButton: {},
  buttonText: {
    fontWeight: 'bold',
  },
});

export default RouteSearch;
