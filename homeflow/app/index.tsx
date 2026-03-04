/**
 * Root Index
 *
 * Initial route that redirects based on onboarding and auth status.
 * Flow: Onboarding -> Auth -> Main App
 */

import React from 'react';
import { Redirect, Href } from 'expo-router';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useAuth } from '@/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function RootIndex() {
  const onboardingComplete = useOnboardingStatus();
  const { isAuthenticated, isLoading } = useAuth();

  if (onboardingComplete === null || isLoading) {
    return <LoadingScreen />;
  }

  if (!onboardingComplete) {
    return <Redirect href={'/(onboarding)' as Href} />;
  }

  // Auth is handled during onboarding (ACCOUNT step).
  // If onboarding is complete but user isn't authenticated (dev skip),
  // still allow access to tabs.
  if (!isAuthenticated) {
    // If the user somehow got past onboarding without auth and we're in prod,
    // send them to the auth flow as a fallback
    if (!__DEV__) {
      return <Redirect href={'/(auth)/login' as Href} />;
    }
  }

  return <Redirect href="/(tabs)" />;
}
