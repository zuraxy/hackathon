import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { geocodeLocation, reverseGeocode } from '@/services/map-fetching';

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
  const [sourceQuery, setSourceQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingFor, setIsSearchingFor] = useState<'source' | 'destination'>('destination');
  
  const buttonColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  // backgroundColor removed (no inline search UI)

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
      handleReverseGeocode(defaultSource.lat, defaultSource.lon);
    }
  }, [defaultSource]);

  const handleReverseGeocode = async (lat: number, lon: number) => {
    try {
      setIsLoadingAddress(true);
      const address = await reverseGeocode(lat, lon);
      
      if (address) {
        setSource({
          name: address || 'Current Location',
          coords: defaultSource
        });
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }, [defaultSource]);

  // Effect to reverse geocode current location whenever defaultSource changes
  useEffect(() => {
    if (defaultSource && defaultSource.lat && defaultSource.lon && 
        (defaultSource.lat !== 14.5995 || defaultSource.lon !== 120.9842)) {
      reverseGeocode(defaultSource.lat, defaultSource.lon);
    }
  }, [defaultSource, reverseGeocode]);

  const handleSubmit = () => {
    if (destination.coords.lat !== 0 && destination.coords.lon !== 0) {
      onSearch(source.coords, destination.coords, bikeType);
      setModalVisible(false);
    }
  };

  const searchLocation = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const features = await geocodeLocation(query);
      
      if (features && features.length > 0) {
        setSearchResults(features.slice(0, 5));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchResults([]);
    }
  };

  // debounce scheduler for searchLocation
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSearch = (query: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current as any);
    }
    searchDebounceRef.current = setTimeout(() => {
      searchLocation(query);
    }, 300);
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

    // clear the correct query and results
    if (isSearchingFor === 'source') setSourceQuery('');
    else setDestQuery('');
    setSearchResults([]);
    // clear any pending debounced search
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current as any);
      searchDebounceRef.current = null;
    }
  };

  // clear debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current as any);
        searchDebounceRef.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.searchButton, { backgroundColor: '#00c853' }]}
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
            <TextInput
              style={[styles.locationInput, isSearchingFor === 'source' ? styles.activeInput : {}]}
              value={isSearchingFor === 'source' ? sourceQuery : (source.name !== 'Current Location' ? source.name : '')}
              onFocus={() => {
                setIsSearchingFor('source');
                const initial = source.name !== 'Current Location' ? source.name : '';
                setSourceQuery(initial);
                if (initial.length >= 3) scheduleSearch(initial);
              }}
              onChangeText={(text) => {
                setSourceQuery(text);
                setIsSearchingFor('source');
                scheduleSearch(text);
              }}
              placeholder={source.name === 'Current Location' ? 'Current Location' : 'Enter starting point'}
              placeholderTextColor="#999"
            />

            {/* Search results under Starting Point when searching source */}
      {isSearchingFor === 'source' && searchResults.length > 0 && (
              <ScrollView style={styles.searchResults}>
        {searchResults.map((feature: any, index: number) => (
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
            
            {/* Destination */}
            <ThemedText>Destination:</ThemedText>
            <TextInput
              style={[styles.locationInput, isSearchingFor === 'destination' ? styles.activeInput : {}]}
              value={isSearchingFor === 'destination' ? destQuery : (destination.name || '')}
              onFocus={() => {
                setIsSearchingFor('destination');
                const initial = destination.name || '';
                setDestQuery(initial);
                if (initial.length >= 3) scheduleSearch(initial);
              }}
              onChangeText={(text) => {
                setDestQuery(text);
                setIsSearchingFor('destination');
                scheduleSearch(text);
              }}
              placeholder={destination.name ? destination.name : 'Enter destination'}
              placeholderTextColor="#999"
            />
            {/* Search results under Destination when searching destination */}
      {isSearchingFor === 'destination' && searchResults.length > 0 && (
              <ScrollView style={styles.searchResults}>
        {searchResults.map((feature: any, index: number) => (
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

            {/* removed search field below bike type choices as requested */}
            
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
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 900,
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
    color: '#FFF',
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
