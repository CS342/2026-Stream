/**
 * Consent Viewer (Read-Only)
 *
 * Displays the full consent document without signature/agreement controls.
 * Opened from the Profile screen's "View full consent" action.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CONSENT_DOCUMENT } from '@/lib/consent/consent-document';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ConsentViewerScreen() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, isDark && styles.titleDark]}>
            {CONSENT_DOCUMENT.title}
          </Text>
          <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
            {CONSENT_DOCUMENT.studyName} — Version {CONSENT_DOCUMENT.version}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconSymbol name="xmark" size={18} color={isDark ? '#8B92A8' : '#7A7F8E'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        {CONSENT_DOCUMENT.sections.map((section) => (
          <View key={section.id} style={[styles.section, isDark && styles.sectionDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
              {section.content}
            </Text>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D8DAE2',
  },
  headerDark: {
    borderBottomColor: '#1A1E2E',
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Georgia',
  },
  titleDark: {
    color: '#C8D6E5',
  },
  subtitle: {
    fontSize: 13,
    color: '#7A7F8E',
    marginTop: 2,
  },
  subtitleDark: {
    color: '#6B7394',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  sectionDark: {
    backgroundColor: '#141828',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  sectionTitleDark: {
    color: '#C8D6E5',
  },
  sectionContent: {
    fontSize: 15,
    color: '#5E6B7A',
    lineHeight: 22,
  },
  sectionContentDark: {
    color: '#8B92A8',
  },
});
