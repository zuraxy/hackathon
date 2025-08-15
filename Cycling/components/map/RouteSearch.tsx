import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { autocompleteLocation, geocodeLocation, reverseGeocode } from '@/services/map-fetching';

interface RouteSearchProps {
  onSearch: (source: { lat: number; lon: number }, destination: { lat: number; lon: number }, bikeType: string) => void;
  defaultSource?: { lat: number; lon: number };
  // When true, the floating button that opens the modal will not be rendered
  hideFloatingButton?: boolean;
}

const RouteSearch = forwardRef<any, RouteSearchProps>(function RouteSearch({ 
  onSearch,
  defaultSource = { lat: 14.5995, lon: 120.9842 }, // Default to Manila
  hideFloatingButton = false,
}, ref) {
  
  // Expose an imperative handle so parent can open/close the modal
  const [modalVisible, setModalVisible] = useState(false);
  useImperativeHandle(ref, () => ({
    open: () => setModalVisible(true),
    close: () => setModalVisible(false),
  }));
  const [source, setSource] = useState({
    name: 'Current Location',
    coords: defaultSource
  });
  const [destination, setDestination] = useState({
    name: '',
    coords: { lat: 0, lon: 0 }
  });
  const [bikeType, setBikeType] = useState('road');
  const [sourceQuery, setSourceQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingFor, setIsSearchingFor] = useState<'source' | 'destination'>('destination');
  const [isSearching, setIsSearching] = useState(false);
  
  // Using explicit brand palette colors for modal UI

  const bikeTypes = [
    { id: 'road', name: 'Road Bike (paved only)' },
    { id: 'gravel', name: 'Gravel Bike (any surface)' },
    { id: 'mountain', name: 'Mountain Bike (any surface)' }
  ];

  // Define state for address loading
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const handleReverseGeocode = async (lat: number, lon: number) => {
    try {
      setIsLoadingAddress(true);
      const address = await reverseGeocode(lat, lon);
      
      if (address) {
        setSource({
          name: address || 'Current Location',
          coords: { lat, lon }
        });
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Effect to reverse geocode current location whenever defaultSource changes
  useEffect(() => {
    if (defaultSource && defaultSource.lat && defaultSource.lon && 
        (defaultSource.lat !== 14.5995 || defaultSource.lon !== 120.9842)) {
      handleReverseGeocode(defaultSource.lat, defaultSource.lon);
    }
  }, [defaultSource]);

  const handleSubmit = () => {
    if (destination.coords.lat !== 0 && destination.coords.lon !== 0) {
      onSearch(source.coords, destination.coords, bikeType);
      setModalVisible(false);
    }
  };

  const searchLocation = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      
      // Create focus point from current source location to get more relevant nearby results
      const focusPoint = source.coords.lat !== 0 && source.coords.lon !== 0 
        ? source.coords 
        : defaultSource;
      
      // Use autocomplete for real-time suggestions with focus point to improve relevance
      const results = await autocompleteLocation(query, {
        focusPoint,
        limit: 5
      });
      
      if (results && results.length > 0) {
        // Transform autocomplete results to match the format expected by the UI
        const formattedResults = results.map((result: any) => ({
          properties: {
            formatted: result.formatted || result.address_line1 || result.name || 'Unknown location',
            place_id: result.place_id
          },
          geometry: {
            coordinates: [result.lon, result.lat]
          }
        }));
        setSearchResults(formattedResults);
      } else {
        // Fall back to regular geocoding if autocomplete returns no results
        const features = await geocodeLocation(query);
        
        if (features && features.length > 0) {
          setSearchResults(features.slice(0, 5));
        } else {
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
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
    }, 250); // Reduced debounce time for better responsiveness
  };

  const selectLocation = (feature: any) => {
    const name = feature.properties.formatted;
    const coords = {
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0]
    };

    if (isSearchingFor === 'source') {
      setSource({ name, coords });
      // Add a slight delay before clearing to improve UX
      setTimeout(() => setSourceQuery(''), 100);
    } else {
      setDestination({ name, coords });
      setTimeout(() => setDestQuery(''), 100);
    }

    // Clear results immediately
    setSearchResults([]);
    
    // Clear any pending debounced search
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
      {!hideFloatingButton && (
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: '#00c853' }]}
          onPress={() => setModalVisible(true)}
        >
          <ThemedText style={styles.searchButtonText}>Plan Route</ThemedText>
        </TouchableOpacity>
      )}

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
            <ThemedText style={styles.modalText}>Starting Point:</ThemedText>
            <TextInput
              style={[styles.locationInput, isSearchingFor === 'source' ? styles.activeInput : {}]}
              value={isSearchingFor === 'source' ? sourceQuery : (source.name !== 'Current Location' ? source.name : '')}
              onFocus={() => {
                setIsSearchingFor('source');
                const initial = source.name !== 'Current Location' ? source.name : '';
                setSourceQuery(initial);
                if (initial.length >= 2) scheduleSearch(initial);
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
            {isSearchingFor === 'source' && (
              <View style={styles.searchResultsContainer}>
                {isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#00c853" />
                    <ThemedText style={styles.loadingText}>Searching locations...</ThemedText>
                  </View>
                ) : searchResults.length > 0 ? (
                  <ScrollView style={styles.searchResults}>
                    {searchResults.map((feature: any, index: number) => (
                      <TouchableOpacity
                        key={`source-${index}`}
                        style={styles.searchResultItem}
                        onPress={() => selectLocation(feature)}
                      >
                        <ThemedText style={styles.searchResultName}>{feature.properties.formatted}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : sourceQuery.length > 1 ? (
                  <View style={styles.noResultsContainer}>
                    <ThemedText style={styles.noResultsText}>No locations found</ThemedText>
                  </View>
                ) : null}
              </View>
            )}
            
            {/* Destination */}
            <ThemedText style={styles.modalText}>Destination:</ThemedText>
            <TextInput
              style={[styles.locationInput, isSearchingFor === 'destination' ? styles.activeInput : {}]}
              value={isSearchingFor === 'destination' ? destQuery : (destination.name || '')}
              onFocus={() => {
                setIsSearchingFor('destination');
                const initial = destination.name || '';
                setDestQuery(initial);
                if (initial.length >= 2) scheduleSearch(initial);
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
            {isSearchingFor === 'destination' && (
              <View style={styles.searchResultsContainer}>
                {isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#00c853" />
                    <ThemedText style={styles.loadingText}>Searching locations...</ThemedText>
                  </View>
                ) : searchResults.length > 0 ? (
                  <ScrollView style={styles.searchResults}>
                    {searchResults.map((feature: any, index: number) => (
                      <TouchableOpacity
                        key={`dest-${index}`}
                        style={styles.searchResultItem}
                        onPress={() => selectLocation(feature)}
                      >
                        <ThemedText style={styles.searchResultName}>{feature.properties.formatted}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : destQuery.length > 1 ? (
                  <View style={styles.noResultsContainer}>
                    <ThemedText style={styles.noResultsText}>No locations found</ThemedText>
                  </View>
                ) : null}
              </View>
            )}
            
            {/* Bike Type Selection */}
            <ThemedText style={styles.modalText}>Bike Type:</ThemedText>
            <View style={styles.bikeTypeContainer}>
              {bikeTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.bikeTypeButton,
                    bikeType === type.id && { backgroundColor: '#4caf50' }
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
                style={[styles.button, styles.submitButton, { backgroundColor: '#00c853' }]}
                onPress={handleSubmit}
                disabled={!destination.name}
              >
                <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>Start Cycling</ThemedText>
              </TouchableOpacity>
             </View>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
});

// Named function used for forwardRef provides display name to satisfy linters

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
    borderColor: '#00c853',
    borderWidth: 2,
    backgroundColor: 'rgba(0, 200, 83, 0.06)',
  },
  searchResultsContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    padding: 10,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#666',
    fontStyle: 'italic',
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
    borderRadius: 12,
    padding: 22,
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    color: '#1565c0',
    },
  modalText: {
    color: '#212121',
    fontSize: 15,
    marginBottom: 6,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    backgroundColor: '#FFFFFF',
    color: '#333',
  },
  bikeTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  bikeTypeButton: {
  backgroundColor: '#FFFFFF',
  padding: 8,
  margin: 4,
  borderRadius: 20,
  borderColor: '#4caf50',
  borderWidth: 1,
  },
  bikeTypeText: {
  fontSize: 14,
  color: '#4caf50',
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
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 5,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9',
  },
  searchResultName: {
    fontSize: 14,
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
    backgroundColor: '#F5F5F5',
  },
   submitButton: {},
   buttonText: {
     fontWeight: 'bold',
     color: '#212121',
   },
 });

export default RouteSearch;
