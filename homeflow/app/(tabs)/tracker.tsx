/**
 * Symptom Tracker Screen
 *
 * Lets the patient select current symptoms by category.
 * Selections are saved and can inform the study team.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

// ── Data ────────────────────────────────────────────────────────────

interface Symptom {
  id: string;
  name: string;
  icon: string;
}

interface SymptomCategory {
  id: string;
  label: string;
  color: string;
  symptoms: Symptom[];
}

const CATEGORIES: SymptomCategory[] = [
  {
    id: 'urinary',
    label: 'URINARY',
    color: '#5B9BD5',
    symptoms: [
      { id: 'urgency',    name: 'Urgency',    icon: 'exclamationmark.circle.fill' },
      { id: 'frequency',  name: 'Frequency',  icon: 'repeat.circle.fill' },
      { id: 'nocturia',   name: 'Nocturia',   icon: 'moon.stars.fill' },
      { id: 'weak_stream',name: 'Weak Stream',icon: 'drop.triangle.fill' },
      { id: 'straining',  name: 'Straining',  icon: 'bolt.circle.fill' },
      { id: 'incomplete', name: 'Incomplete\nEmptying', icon: 'arrow.clockwise.circle.fill' },
    ],
  },
  {
    id: 'pain',
    label: 'PAIN',
    color: '#E8805A',
    symptoms: [
      { id: 'pelvic',     name: 'Pelvic',     icon: 'staroflife.fill' },
      { id: 'lower_back', name: 'Lower Back', icon: 'figure.walk' },
      { id: 'bladder',    name: 'Bladder',    icon: 'drop.fill' },
      { id: 'burning',    name: 'Burning',    icon: 'flame.fill' },
      { id: 'groin',      name: 'Groin',      icon: 'cross.circle.fill' },
    ],
  },
  {
    id: 'sleep',
    label: 'SLEEP',
    color: '#8E74C8',
    symptoms: [
      { id: 'interrupted',   name: 'Interrupted',   icon: 'moon.zzz.fill' },
      { id: 'fatigue',       name: 'Fatigue',        icon: 'battery.25' },
      { id: 'drowsy',        name: 'Drowsiness',     icon: 'sun.haze.fill' },
      { id: 'insomnia',      name: 'Insomnia',       icon: 'eye.slash.fill' },
    ],
  },
  {
    id: 'mood',
    label: 'MOOD',
    color: '#E07CA0',
    symptoms: [
      { id: 'anxious',     name: 'Anxious',     icon: 'waveform.path' },
      { id: 'frustrated',  name: 'Frustrated',  icon: 'exclamationmark.triangle.fill' },
      { id: 'depressed',   name: 'Low Mood',    icon: 'cloud.rain.fill' },
      { id: 'stressed',    name: 'Stressed',    icon: 'tornado' },
      { id: 'irritable',   name: 'Irritable',   icon: 'bolt.fill' },
    ],
  },
  {
    id: 'general',
    label: 'GENERAL',
    color: '#4BAE8A',
    symptoms: [
      { id: 'low_energy',   name: 'Low Energy',   icon: 'battery.0' },
      { id: 'reduced_act',  name: 'Less Active',  icon: 'figure.walk.circle.fill' },
      { id: 'concentration',name: 'Brain Fog',    icon: 'brain.head.profile' },
      { id: 'appetite',     name: 'Poor Appetite',icon: 'fork.knife' },
      { id: 'dizzy',        name: 'Dizziness',    icon: 'circle.dashed' },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────

export default function TrackerScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleSave = () => {
    const count = selected.size;
    Alert.alert(
      'Symptoms Saved',
      count === 0
        ? 'No symptoms recorded for today.'
        : `${count} symptom${count !== 1 ? 's' : ''} recorded for today.`,
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>TRACKER</Text>
        <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear all</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.subtitle, { color: colors.icon }]}>
        Track your symptoms to monitor how you're feeling
      </Text>

      {/* Symptom categories */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map(category => {
          const selectedCount = category.symptoms.filter(s => selected.has(s.id)).length;
          return (
            <View key={category.id} style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                {category.label}{' '}
                <Text style={[styles.sectionCount, { color: colors.icon }]}>
                  {selectedCount}/{category.symptoms.length}
                </Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {category.symptoms.map(symptom => {
                  const isSelected = selected.has(symptom.id);
                  return (
                    <TouchableOpacity
                      key={symptom.id}
                      style={styles.pillWrapper}
                      onPress={() => toggle(symptom.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[
                        styles.circle,
                        { backgroundColor: category.color },
                        isSelected && styles.circleSelected,
                      ]}>
                        <IconSymbol
                          name={symptom.icon as any}
                          size={28}
                          color="#FFFFFF"
                        />
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <IconSymbol name="checkmark" size={10} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.pillLabel, { color: colors.text }]}
                        numberOfLines={2}
                        textBreakStrategy="simple"
                      >
                        {symptom.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}

        {/* Bottom padding so last section clears the save button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: {
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clearButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  clearText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E74C8',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  sectionCount: {
    fontWeight: '400',
  },
  pillRow: {
    flexDirection: 'row',
    paddingBottom: 4,
    gap: 16,
  },
  pillWrapper: {
    alignItems: 'center',
    width: 72,
  },
  circle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  circleSelected: {
    opacity: 0.95,
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pillLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  saveButton: {
    backgroundColor: '#8E74C8',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8E74C8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
