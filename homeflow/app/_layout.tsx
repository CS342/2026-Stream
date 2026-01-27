import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
// Global CSS for web (theming for alert dialogs, etc.) - only processed on web
import '@/assets/styles/global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ErrorBoundary } from '@/components/error-boundary';
import { StandardProvider, useStandard } from '@/lib/services/standard-context';

export const unstable_settings = {
  // Initial route while loading
  initialRouteName: 'index',
};

/**
 * Navigation stack with onboarding and main app routes
 */
function RootLayoutNav() {
  const onboardingComplete = useOnboardingStatus();

  // While checking onboarding status, show loading
  if (onboardingComplete === null) {
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

      {/* Main app - shown when onboarding complete */}
      <Stack.Screen
        name="(tabs)"
        redirect={!onboardingComplete}
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
 * Root Layout
 *
 * Handles onboarding flow and main app navigation.
 * Users must complete onboarding before accessing the main app.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StandardProvider>
          <AppContent>
            <RootLayoutNav />
            <StatusBar style="auto" />
          </AppContent>
        </StandardProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
