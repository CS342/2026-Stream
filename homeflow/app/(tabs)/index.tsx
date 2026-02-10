import { Image } from 'expo-image';
import { StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { notifyOnboardingComplete } from '@/hooks/use-onboarding-status';

export default function HomeScreen() {
  const router = useRouter();

  // TEMPORARY: Development-only function to reset onboarding
  // TODO: Remove this before production release
  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding?',
      'This will clear all onboarding progress and restart from the beginning. This feature is for development only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all onboarding data and notify the root layout
              await OnboardingService.reset();
              notifyOnboardingComplete();
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert('Error', 'Failed to reset onboarding');
            }
          },
        },
      ]
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#8C1515', dark: '#2d2d2d' }}
      headerImage={
        <Image
          source={require('@/assets/images/spezivibe-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome to HomeFlow!</ThemedText>
        <HelloWave />
      </ThemedView>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Study Dashboard</ThemedText>
        <ThemedText>
          Track your BPH symptoms, medications, and progress throughout the study.
        </ThemedText>
      </ThemedView>

      {/* TEMPORARY: Development-only reset button */}
      {/* TODO: Remove this entire section before production release */}
      <ThemedView style={styles.devSection}>
        <ThemedText type="subtitle" style={{ color: '#FF9500' }}>
          ⚠️ Developer Tools
        </ThemedText>
        <ThemedText style={{ fontSize: 13, marginBottom: 12, opacity: 0.7 }}>
          Temporary features for testing - remove before production
        </ThemedText>
        <Pressable
          style={styles.devButton}
          onPress={handleResetOnboarding}>
          <ThemedText style={styles.devButtonText}>
            🔄 Reset Onboarding (Dev Only)
          </ThemedText>
        </Pressable>
        <ThemedText style={{ fontSize: 11, marginTop: 8, opacity: 0.6 }}>
          This will clear all onboarding data and restart the flow
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 16,
  },
  logo: {
    height: 200,
    width: 200,
    position: 'absolute',
    bottom: -20,
    left: -20,
  },
  // TEMPORARY: Dev section styles - remove before production
  devSection: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9500',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  devButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  devButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
