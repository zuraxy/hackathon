import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import LocationDisplay from './LocationDisplay';

interface HazardInputProps {
  onAddHazard: (hazard: { lat: number; lon: number; type: string; description: string }) => void;
  currentLocation: { lat: number; lon: number };
  locationName?: string;
}

const HazardInput: React.FC<HazardInputProps> = ({ onAddHazard, currentLocation, locationName }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [hazardType, setHazardType] = useState('');
  const [hazardDescription, setHazardDescription] = useState('');
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string | undefined>(locationName);
  
  const buttonColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  
  useEffect(() => {
    if (locationName) {
      setCurrentLocationAddress(locationName);
    } else {
      // Reverse geocode if no location name provided
      reverseGeocode(currentLocation.lat, currentLocation.lon);
    }
  }, [locationName, currentLocation]);
  
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=1393d8eed4394d73b1d5557754d1c824`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const address = data.features[0].properties.formatted;
        setCurrentLocationAddress(address);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };
  
  const hazardTypes = [
    'Pothole',
    'Construction',
    'Accident',
    'Flooding',
    'Glass/Debris',
    'Heavy Traffic',
    'Other'
  ];

  const handleSubmit = () => {
    if (hazardType) {
      onAddHazard({
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        type: hazardType,
        description: hazardDescription || `${hazardType} reported by a cyclist`
      });
      
      // Reset form
      setHazardType('');
      setHazardDescription('');
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.reportButton, { backgroundColor: buttonColor }]}
        onPress={() => setModalVisible(true)}
      >
        <ThemedText style={styles.reportButtonText}>⚠️</ThemedText>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalView}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Report Hazard</ThemedText>
            
            {/* Current Location */}
            <View style={styles.locationContainer}>
              <ThemedText style={styles.locationLabel}>Location:</ThemedText>
              <LocationDisplay 
                locationName={currentLocationAddress}
                showFullAddress={true}
              />
            </View>
            
            <ThemedText style={styles.sectionHeader}>Select hazard type:</ThemedText>
            <View style={styles.hazardTypeContainer}>
              {hazardTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.hazardTypeButton,
                    hazardType === type && { backgroundColor: buttonColor }
                  ]}
                  onPress={() => setHazardType(type)}
                >
                  <ThemedText 
                    style={[
                      styles.hazardTypeText, 
                      hazardType === type && { color: '#FFFFFF' }
                    ]}
                  >
                    {type}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            
            <ThemedText>Description (optional):</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor }]}
              value={hazardDescription}
              onChangeText={setHazardDescription}
              placeholder="Describe the hazard..."
              placeholderTextColor="#999"
              multiline
            />
            
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
                disabled={!hazardType}
              >
                <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>Submit</ThemedText>
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
  bottom: 76,
  left: 20,
  right: 20,
  zIndex: 950,
  },
  reportButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    justifyContent: ''
  },
  reportButtonText: {
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
    maxHeight: '80%',
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
  hazardTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  hazardTypeButton: {
    backgroundColor: '#EEEEEE',
    padding: 8,
    margin: 4,
    borderRadius: 20,
  },
  hazardTypeText: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
    minHeight: 80,
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
  locationContainer: {
    marginVertical: 12,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  locationLabel: {
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionHeader: {
    fontWeight: '600',
    marginTop: 10,
  },
});

export default HazardInput;
