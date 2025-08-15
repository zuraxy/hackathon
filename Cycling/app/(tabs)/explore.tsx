import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function ExploreScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#4CAF50', dark: '#1B5E20' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#2E7D32"
          name="bicycle"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">About CycleWaze</ThemedText>
      </ThemedView>
      <ThemedText>Your intelligent cycling route planner for safer and more enjoyable rides</ThemedText>
      
      <Collapsible title="How It Works">
        <ThemedText>
          CycleWaze provides real-time cycling routes optimized for different bike types while
          helping you avoid hazards reported by other cyclists.
        </ThemedText>
        <ThemedText style={styles.spaced}>
          Key features:
        </ThemedText>
        <ThemedText>• Bike-specific routing (road, mountain, regular, electric)</ThemedText>
        <ThemedText>• Real-time hazard reports from the cycling community</ThemedText>
        <ThemedText>• Automatic route adjustment to avoid hazards</ThemedText>
      </Collapsible>
      
      <Collapsible title="Routing Technology">
        <ThemedText>
          CycleWaze uses the Geoapify Routing API to generate optimal cycling routes
          that are tailored to your specific bike type.
        </ThemedText>
        <ThemedText style={styles.spaced}>
          Different bikes have different needs:
        </ThemedText>
        <ThemedText>• Road bikes prefer smooth, paved surfaces</ThemedText>
        <ThemedText>• Mountain bikes can handle rougher terrain</ThemedText>
        <ThemedText>• Electric bikes may prioritize different elevation profiles</ThemedText>
        <ExternalLink href="https://www.geoapify.com/routing-api">
          <ThemedText type="link">Learn more about Geoapify</ThemedText>
        </ExternalLink>
      </Collapsible>
      
      <Collapsible title="Hazard Reporting">
        <ThemedText>
          The strength of CycleWaze comes from our community. Cyclists can report hazards in real-time,
          helping others avoid dangerous situations.
        </ThemedText>
        <ThemedText style={styles.spaced}>
          Reportable hazards include:
        </ThemedText>
        <ThemedText>• Potholes and road damage</ThemedText>
        <ThemedText>• Construction zones</ThemedText>
        <ThemedText>• Accidents or traffic incidents</ThemedText>
        <ThemedText>• Glass or debris on the road</ThemedText>
        <ThemedText>• Flooding or weather-related issues</ThemedText>
      </Collapsible>
      
      <Collapsible title="Real-Time Route Adjustments">
        <ThemedText>
          When a new hazard is reported along your route, CycleWaze can automatically
          suggest alternate paths to keep you safe and moving.
        </ThemedText>
        <ThemedText>
          This demo simulates hazard reports to show how routes can be dynamically updated
          to avoid dangerous areas.
        </ThemedText>
      </Collapsible>
      
      <Collapsible title="For HackerCup">
        <ThemedText>
          This app was created by DLSU students for the HackerCup hackathon. We believe that
          cycling deserves the same level of navigation intelligence that drivers enjoy.
        </ThemedText>
        <ThemedText style={styles.spaced}>
          Our vision is to create a platform that Strava might want to incorporate into their
          ecosystem, improving safety and route optimization for cyclists worldwide.
        </ThemedText>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#2E7D32',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  spaced: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: 'bold',
  },
});
