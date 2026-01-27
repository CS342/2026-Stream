/**
 * Root Index
 *
 * Initial route that redirects to either onboarding or main app
 * based on the user's onboarding status.
 */

import React from 'react';
import { Redirect, Href } from 'expo-router';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function RootIndex() {
  const onboardingComplete = useOnboardingStatus();

  // While loading, show loading screen
  if (onboardingComplete === null) {
    return <LoadingScreen />;
  }

  // Redirect based on onboarding status
  if (onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href={'/(onboarding)' as Href} />;
}
