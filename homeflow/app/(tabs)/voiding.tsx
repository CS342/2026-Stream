import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VoidingScreen() {
  const isDark = useColorScheme() === 'dark';

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      <View style={styles.centered}>
        <Text style={[styles.title, isDark && styles.titleDark]}>Voiding</Text>
        <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
          Uroflow tracking will appear here once your Throne device is connected.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F8',
  },
  containerDark: {
    backgroundColor: '#0A0E1A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Georgia',
    marginBottom: 12,
  },
  titleDark: {
    color: '#C8D6E5',
  },
  subtitle: {
    fontSize: 16,
    color: '#7A7F8E',
    textAlign: 'center',
    lineHeight: 24,
  },
  subtitleDark: {
    color: '#8B92A8',
  },
});
