import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
// Global CSS for web (theming for alert dialogs, etc.) - only processed on web
import '@/assets/styles/global.css';

import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useAuth } from '@/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ErrorBoundary } from '@/components/error-boundary';
import { StandardProvider, useStandard } from '@/lib/services/standard-context';
import { AppThemeProvider, useAppTheme } from '@/lib/theme/ThemeContext';

export const unstable_settings = {
  // Initial route while loading
  initialRouteName: 'index',
};

/**
 * Navigation stack with onboarding, auth, and main app routes
 */
function RootLayoutNav() {
  const onboardingComplete = useOnboardingStatus();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // While checking onboarding/auth status, show loading
  if (onboardingComplete === null || authLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Onboarding flow - shown when not complete */}
      <Stack.Screen
        name="(onboarding)"
        options={{
          animation: 'fade',
        }}
        redirect={onboardingComplete}
      />

      {/* Auth flow - shown when onboarding complete but not signed in */}
      <Stack.Screen
        name="(auth)"
        options={{
          animation: 'fade',
        }}
        redirect={!onboardingComplete || isAuthenticated}
      />

      {/* Main app - shown when onboarding complete AND signed in */}
      <Stack.Screen
        name="(tabs)"
        redirect={!onboardingComplete || !isAuthenticated}
      />

      {/* Modal screens */}
      <Stack.Screen
        name="questionnaire"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="modal"
        options={{ presentation: 'modal', title: 'Modal', headerShown: true }}
      />
      <Stack.Screen
        name="consent-viewer"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="throne-session"
        options={{ headerShown: false }}
      />

      {/* Index route for initial redirect */}
      <Stack.Screen
        name="index"
        options={{ animation: 'none' }}
      />
    </Stack>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { isLoading } = useStandard();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

/**
 * Inner shell — has access to AppThemeProvider so it can read the resolved theme
 * and pass it to React Navigation's ThemeProvider + StatusBar.
 */
function ThemedApp() {
  const { theme } = useAppTheme();

  return (
    <ThemeProvider value={theme.isDark ? DarkTheme : DefaultTheme}>
      <StandardProvider>
        <AppContent>
          <RootLayoutNav />
          <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        </AppContent>
      </StandardProvider>
    </ThemeProvider>
  );
}

/**
 * Root Layout
 *
 * Handles onboarding, authentication, and main app navigation.
 * Flow: Onboarding -> Auth -> Main App
 */
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <ThemedApp />
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
