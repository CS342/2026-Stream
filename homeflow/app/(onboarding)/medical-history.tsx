/**
 * Medical History Screen
 *
 * Displays health records pulled from Apple Health and asks the patient
 * to confirm their information section by section.
 *
 * Flow:
 *   1. Loading: fetch clinical records + HealthKit demographics in parallel
 *      (falls back to mock data in dev mode if no records are connected)
 *   2. Reviewing: 3-step confirmation UI
 *      Step 0 — Demographics (age, sex)
 *      Step 1 — Current Medications (grouped by drug class)
 *      Step 2 — Surgical History (BPH procedures + other surgeries)
 *   3. Complete: show confirmation screen and navigate to baseline survey
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Animated,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, StanfordColors, Spacing } from '@/constants/theme';
import { OnboardingStep } from '@/lib/constants';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { OnboardingProgressBar, ContinueButton, DevToolBar } from '@/components/onboarding';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getAllClinicalRecords } from '@/lib/services/healthkit';
import { getDemographics } from '@/lib/services/healthkit/HealthKitClient';
import {
  buildMedicalHistoryPrefill,
  type MedicalHistoryPrefill,
} from '@/lib/services/fhir';
import { BPH_DRUGS } from '@/lib/services/fhir/codes';
import { getMockClinicalRecords, getMockDemographics } from '@/lib/services/healthkit/mock-health-data';

// ── Types ─────────────────────────────────────────────────────────────

type MedicalHistoryPhase = 'loading' | 'reviewing' | 'complete';

const STEP_TITLES = ['Demographics', 'Current Medications', 'Surgical History'] as const;

const STEP_DESCRIPTIONS = [
  'Your basic information from Apple Health.',
  'Medications found in your health records.',
  'Past procedures found in your health records.',
] as const;

const ETHNICITY_OPTIONS = [
  'Hispanic or Latino',
  'Not Hispanic or Latino',
  'Prefer not to say',
] as const;

const RACE_OPTIONS = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Native Hawaiian or Other Pacific Islander',
  'White',
  'More than one race',
  'Prefer not to say',
] as const;

type DemoStage = 'name' | 'ethnicity' | 'race' | 'done';

type EditableMedItem = {
  id: string;
  name: string;        // scientific name + dosage (e.g., "tamsulosin 0.4 mg oral capsule")
  brandName?: string;  // capitalized brand name if found (e.g., "Flomax")
  groupKey: string;
};
type EditableProcItem = { id: string; name: string; date?: string; isBPH: boolean };

// ── Helpers ──────────────────────────────────────────────────────────

function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Screen ────────────────────────────────────────────────────────────

export default function MedicalHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [phase, setPhase] = useState<MedicalHistoryPhase>('loading');
  const [reviewStep, setReviewStep] = useState(0);
  const [correctionsNeeded, setCorrectionsNeeded] = useState<Set<number>>(new Set());
  const [prefillData, setPrefillData] = useState<MedicalHistoryPrefill | null>(null);

  // Demographics sequential input state
  const [demoName, setDemoName] = useState('');
  const [demoEthnicity, setDemoEthnicity] = useState('');
  const [demoRace, setDemoRace] = useState('');
  const [demoStage, setDemoStage] = useState<DemoStage>('name');
  const [demoEditingField, setDemoEditingField] = useState<'name' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<'ethnicity' | 'race'>('ethnicity');

  // Editable medication/procedure items (local copies initialized from prefill)
  const [editableMeds, setEditableMeds] = useState<EditableMedItem[]>([]);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editingMedValue, setEditingMedValue] = useState('');
  const [editableProcs, setEditableProcs] = useState<EditableProcItem[]>([]);
  const [editingProcId, setEditingProcId] = useState<string | null>(null);
  const [editingProcValue, setEditingProcValue] = useState('');

  const stepFade = useRef(new Animated.Value(1)).current;
  const confirmFade = useRef(new Animated.Value(0)).current;
  // Tracks last-tap timestamps per field for double-tap detection
  const lastTapTimes = useRef<Record<string, number>>({});

  // ── Load clinical records ─────────────────────────────────────────

  const loadPrefillData = useCallback(async (forceMock = false) => {
    setPhase('loading');

    try {
      let clinicalRecords = null;
      let demographics = { age: null, dateOfBirth: null, biologicalSex: null };

      if (forceMock) {
        clinicalRecords = getMockClinicalRecords();
        demographics = getMockDemographics();
      } else {
        [clinicalRecords, demographics] = await Promise.all([
          getAllClinicalRecords().catch(() => null),
          getDemographics().catch(() => ({ age: null, dateOfBirth: null, biologicalSex: null })),
        ]);

        // In dev mode, use mock data when no real records are available
        if (__DEV__ && !clinicalRecords?.medications?.length && !clinicalRecords?.conditions?.length) {
          clinicalRecords = getMockClinicalRecords();
          demographics = getMockDemographics();
        }
      }

      const prefill = buildMedicalHistoryPrefill(clinicalRecords, demographics);

      setPrefillData(prefill);

      // Build flat editable lists from the prefill (only BPH-relevant drug groups)
      const medGroupKeys = ['alphaBlockers', 'fiveARIs', 'anticholinergics', 'beta3Agonists', 'otherBPH'] as const;
      const medItems: EditableMedItem[] = [];
      for (const groupKey of medGroupKeys) {
        (prefill.medications[groupKey].value ?? []).forEach((m, i) => {
          const drugEntry = m.genericName
            ? BPH_DRUGS.find(d => d.generic === m.genericName!.toLowerCase())
            : undefined;
          const brandName = drugEntry?.brands[0] ? capitalize(drugEntry.brands[0]) : undefined;
          medItems.push({ id: `${groupKey}_${i}`, name: m.name, brandName, groupKey });
        });
      }
      setEditableMeds(medItems);
      setEditingMedId(null);
      setEditingMedValue('');

      const procItems: EditableProcItem[] = [];
      (prefill.surgicalHistory.bphProcedures.value ?? []).forEach((p, i) => {
        procItems.push({ id: `bph_${i}`, name: p.name, date: p.date, isBPH: true });
      });
      (prefill.surgicalHistory.otherProcedures.value ?? []).forEach((p, i) => {
        procItems.push({ id: `other_${i}`, name: p.name, date: p.date, isBPH: false });
      });
      setEditableProcs(procItems);
      setEditingProcId(null);
      setEditingProcValue('');

      setReviewStep(0);
      setCorrectionsNeeded(new Set());
      setDemoName('');
      setDemoEthnicity('');
      setDemoRace('');
      setDemoStage('name');
      setDemoEditingField(null);
      setPhase('reviewing');
    } catch {
      setPhase('reviewing');
    }
  }, []);

  useEffect(() => {
    loadPrefillData();
  }, [loadPrefillData]);

  // ── Review step navigation ────────────────────────────────────────

  const handleConfirmStep = useCallback((withCorrection = false) => {
    const updatedCorrections = withCorrection
      ? new Set([...correctionsNeeded, reviewStep])
      : correctionsNeeded;

    Animated.timing(stepFade, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      if (withCorrection) setCorrectionsNeeded(updatedCorrections);

      if (reviewStep < 2) {
        setReviewStep(prev => prev + 1);
      } else {
        // All sections reviewed — go directly to complete
        setPhase('complete');
        Animated.spring(confirmFade, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      }

      Animated.timing(stepFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [correctionsNeeded, reviewStep, stepFade, confirmFade]);

  // ── Picker handler ────────────────────────────────────────────────

  const handlePickerSelect = useCallback((value: string) => {
    setPickerVisible(false);
    if (pickerField === 'ethnicity') {
      setDemoEthnicity(value);
      setDemoStage('race');
    } else {
      setDemoRace(value);
      setDemoStage('done');
    }
  }, [pickerField]);

  const openPicker = useCallback((field: 'ethnicity' | 'race') => {
    setPickerField(field);
    setPickerVisible(true);
  }, []);

  // Double-tap detection: call action() if two taps arrive within 300 ms
  const handleFieldDoubleTap = useCallback((key: string, action: () => void) => {
    const now = Date.now();
    const last = lastTapTimes.current[key] ?? 0;
    if (now - last < 300) {
      lastTapTimes.current[key] = 0;
      action();
    } else {
      lastTapTimes.current[key] = now;
    }
  }, []);

  // ── Save and navigate ─────────────────────────────────────────────

  const handleContinue = async () => {
    const medications: string[] = [];
    const conditions: string[] = [];
    const surgicalHistory: string[] = [];
    const bphTreatmentHistory: string[] = [];

    // Use the user-edited lists (initialized from health records, may have been corrected)
    for (const med of editableMeds) {
      medications.push(med.name);
      bphTreatmentHistory.push(med.name);
    }

    for (const proc of editableProcs) {
      surgicalHistory.push(proc.name);
      if (proc.isBPH) bphTreatmentHistory.push(proc.name);
    }

    if (prefillData) {
      const condEntries = [
        prefillData.conditions.diabetes,
        prefillData.conditions.hypertension,
        prefillData.conditions.bph,
        prefillData.conditions.other,
      ];
      for (const entry of condEntries) {
        if (entry.value) {
          for (const cond of entry.value) conditions.push(cond.name);
        }
      }
    }

    const demoSummary = [
      demoName && `Name: ${demoName}`,
      demoEthnicity && `Ethnicity: ${demoEthnicity}`,
      demoRace && `Race: ${demoRace}`,
    ].filter(Boolean).join(', ');

    await OnboardingService.updateData({
      medicalHistory: {
        medications,
        conditions,
        allergies: [],
        surgicalHistory,
        bphTreatmentHistory,
        rawTranscript: `reviewed from health records${demoSummary ? ` | ${demoSummary}` : ''}`,
      },
    });

    await OnboardingService.goToStep(OnboardingStep.BASELINE_SURVEY);
    router.push('/(onboarding)/baseline-survey' as Href);
  };

  // ── Shared style values ───────────────────────────────────────────

  const cardBg = isDark ? '#1E2022' : '#F5F5F7';
  const sectionBg = isDark ? '#2A2D2F' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  // ── Sub-render helpers ────────────────────────────────────────────

  function DataRow({
    label,
    value,
    found,
    placeholder = 'will ask',
    showBadge = true,
    onPress,
  }: {
    label: string;
    value: string | null | undefined;
    found: boolean;
    placeholder?: string;
    showBadge?: boolean;
    onPress?: () => void;
  }) {
    const inner = (
      <>
        <Text style={[reviewStyles.dataLabel, { color: colors.icon }]}>{label}</Text>
        <View style={reviewStyles.dataRight}>
          {found && value ? (
            <>
              <Text style={[reviewStyles.dataValue, { color: colors.text }]}>{value}</Text>
              {showBadge && (
                <View style={reviewStyles.sourceBadge}>
                  <Text style={reviewStyles.sourceBadgeText}>Apple Health</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={[reviewStyles.willAskText, { color: colors.icon }]}>
              {placeholder}
            </Text>
          )}
        </View>
      </>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          style={[reviewStyles.dataRow, { borderBottomColor: borderColor }]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {inner}
        </TouchableOpacity>
      );
    }

    return (
      <View style={[reviewStyles.dataRow, { borderBottomColor: borderColor }]}>
        {inner}
      </View>
    );
  }

  function InlineInputRow({
    label,
    value,
    onChange,
    onSubmit,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
  }) {
    return (
      <View style={[reviewStyles.dataRow, { borderBottomColor: borderColor }]}>
        <Text style={[reviewStyles.dataLabel, { color: colors.icon }]}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          returnKeyType="done"
          autoFocus
          style={[reviewStyles.inlineInput, { color: colors.text }]}
          placeholderTextColor={colors.icon}
          placeholder="Type here…"
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>
    );
  }

  function SelectDataRow({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        style={[reviewStyles.dataRow, { borderBottomColor: borderColor }]}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <Text style={[reviewStyles.dataLabel, { color: colors.icon }]}>{label}</Text>
        <View style={reviewStyles.dataRight}>
          <Text style={[reviewStyles.selectHint, { color: StanfordColors.cardinal }]}>
            Tap to select
          </Text>
          <IconSymbol name="chevron.right" size={13} color={StanfordColors.cardinal} />
        </View>
      </TouchableOpacity>
    );
  }

  function ProcedureSection({ label, items }: { label: string; items: EditableProcItem[] }) {
    return (
      <View style={reviewStyles.medGroup}>
        <Text style={[reviewStyles.medGroupLabel, { color: colors.icon }]}>{label}</Text>
        {items.length > 0 ? (
          items.map(item => (
            <View key={item.id} style={reviewStyles.medItem}>
              <Text style={[reviewStyles.medBullet, { color: StanfordColors.cardinal }]}>•</Text>
              {editingProcId === item.id ? (
                <TextInput
                  value={editingProcValue}
                  onChangeText={setEditingProcValue}
                  onSubmitEditing={() => {
                    setEditableProcs(prev => prev.map(p =>
                      p.id === item.id ? { ...p, name: editingProcValue.trim() || p.name } : p
                    ));
                    setEditingProcId(null);
                  }}
                  returnKeyType="done"
                  autoFocus
                  style={[reviewStyles.medEditInput, { color: colors.text }]}
                />
              ) : (
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => handleFieldDoubleTap(`proc_${item.id}`, () => {
                    setEditingProcId(item.id);
                    setEditingProcValue(item.name);
                    setEditingMedId(null);
                  })}
                  activeOpacity={0.8}
                >
                  <View style={reviewStyles.procNameRow}>
                    <Text style={[reviewStyles.medName, { color: colors.text }]}>{item.name}</Text>
                    {item.date && (
                      <Text style={[reviewStyles.procDate, { color: colors.icon }]}>
                        {formatShortDate(item.date)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              {editingProcId !== item.id && (
                <View style={reviewStyles.sourceBadge}>
                  <Text style={reviewStyles.sourceBadgeText}>Health Records</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={[reviewStyles.noneFound, { color: colors.icon }]}>
            None found in health records
          </Text>
        )}
      </View>
    );
  }

  function renderStepContent() {
    if (!prefillData) return null;

    switch (reviewStep) {
      case 0:
        return (
          <View style={[reviewStyles.card, { backgroundColor: sectionBg }]}>
            {/* Apple Health fields — always static */}
            <DataRow
              label="Age"
              value={prefillData.demographics.age.value != null
                ? `${prefillData.demographics.age.value} years`
                : null}
              found={prefillData.demographics.age.confidence !== 'none'}
            />
            <DataRow
              label="Biological Sex"
              value={prefillData.demographics.biologicalSex.value
                ? capitalize(prefillData.demographics.biologicalSex.value)
                : null}
              found={prefillData.demographics.biologicalSex.confidence !== 'none'}
            />

            {/* Full Name — inline input on initial entry or when re-editing */}
            {(demoStage === 'name' || demoEditingField === 'name') ? (
              <InlineInputRow
                label="Full Name"
                value={demoName}
                onChange={setDemoName}
                onSubmit={() => {
                  if (demoStage === 'name') {
                    setDemoStage('ethnicity');
                  } else {
                    setDemoEditingField(null);
                  }
                }}
              />
            ) : (
              <DataRow
                label="Full Name"
                value={demoName || '—'}
                found
                showBadge={false}
                onPress={() => handleFieldDoubleTap('name', () => setDemoEditingField('name'))}
              />
            )}

            {/* Ethnicity — tap-to-select, then locks as static (double-tap to re-open) */}
            {(demoStage === 'ethnicity' || demoStage === 'race' || demoStage === 'done') && (
              demoEthnicity ? (
                <DataRow
                  label="Ethnicity"
                  value={demoEthnicity}
                  found
                  showBadge={false}
                  onPress={() => handleFieldDoubleTap('ethnicity', () => openPicker('ethnicity'))}
                />
              ) : (
                <SelectDataRow label="Ethnicity" onPress={() => openPicker('ethnicity')} />
              )
            )}

            {/* Race — tap-to-select, then locks as static (double-tap to re-open) */}
            {(demoStage === 'race' || demoStage === 'done') && (
              demoRace ? (
                <DataRow
                  label="Race"
                  value={demoRace}
                  found
                  showBadge={false}
                  onPress={() => handleFieldDoubleTap('race', () => openPicker('race'))}
                />
              ) : (
                <SelectDataRow label="Race" onPress={() => openPicker('race')} />
              )
            )}
          </View>
        );

      case 1: {
        return (
          <>
            {/* All health-record medications in a single flat list */}
            <View style={[reviewStyles.card, { backgroundColor: sectionBg }]}>
              <Text style={[reviewStyles.cardSectionTitle, { color: colors.icon }]}>
                MEDICATIONS FROM HEALTH RECORDS
              </Text>
              <View style={reviewStyles.medGroup}>
                {editableMeds.length > 0 ? (
                  editableMeds.map(item => (
                    <View key={item.id} style={reviewStyles.medItem}>
                      <Text style={[reviewStyles.medBullet, { color: StanfordColors.cardinal }]}>•</Text>
                      {editingMedId === item.id ? (
                        <TextInput
                          value={editingMedValue}
                          onChangeText={setEditingMedValue}
                          onSubmitEditing={() => {
                            setEditableMeds(prev => prev.map(m =>
                              m.id === item.id ? { ...m, name: editingMedValue.trim() || m.name } : m
                            ));
                            setEditingMedId(null);
                          }}
                          returnKeyType="done"
                          autoFocus
                          style={[reviewStyles.medEditInput, { color: colors.text }]}
                        />
                      ) : (
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() => handleFieldDoubleTap(`med_${item.id}`, () => {
                            setEditingMedId(item.id);
                            setEditingMedValue(item.name);
                            setEditingProcId(null);
                          })}
                          activeOpacity={0.8}
                        >
                          {item.brandName ? (
                            <Text style={[reviewStyles.medName, { color: colors.text }]}>
                              {item.brandName}{' '}
                              <Text style={reviewStyles.medNameSecondary}>({item.name})</Text>
                            </Text>
                          ) : (
                            <Text style={[reviewStyles.medName, { color: colors.text }]}>{item.name}</Text>
                          )}
                        </TouchableOpacity>
                      )}
                      {editingMedId !== item.id && (
                        <View style={reviewStyles.sourceBadge}>
                          <Text style={reviewStyles.sourceBadgeText}>Health Records</Text>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={[reviewStyles.noneFound, { color: colors.icon }]}>
                    None found in health records
                  </Text>
                )}
              </View>
            </View>

            {/* Other medications not captured from health records */}
            <View style={[reviewStyles.card, { backgroundColor: sectionBg, marginTop: 12 }]}>
              <Text style={[reviewStyles.cardSectionTitle, { color: colors.icon }]}>
                OTHER MEDICATIONS
              </Text>
              <View style={reviewStyles.medGroup}>
                <Text style={[reviewStyles.noneFound, { color: colors.icon }]}>
                  None
                </Text>
              </View>
            </View>
          </>
        );
      }

      case 2: {
        return (
          <View style={[reviewStyles.card, { backgroundColor: sectionBg }]}>
            <ProcedureSection
              label="BPH / PROSTATE PROCEDURES"
              items={editableProcs.filter(p => p.isBPH)}
            />
            <View style={[reviewStyles.divider, { backgroundColor: borderColor }]} />
            <ProcedureSection
              label="OTHER SURGERIES"
              items={editableProcs.filter(p => !p.isBPH)}
            />
          </View>
        );
      }

      default:
        return null;
    }
  }

  // ── Loading phase ─────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <OnboardingProgressBar currentStep={OnboardingStep.MEDICAL_HISTORY} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={StanfordColors.cardinal} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Checking your health records...
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.icon }]}>
            Looking for medications, conditions, and procedures
          </Text>
        </View>
        <DevToolBar currentStep={OnboardingStep.MEDICAL_HISTORY} onContinue={handleContinue} />
      </SafeAreaView>
    );
  }

  // ── Reviewing phase ───────────────────────────────────────────────

  if (phase === 'reviewing' || phase === 'complete') {
    const isLastStep = reviewStep === 2;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <OnboardingProgressBar currentStep={OnboardingStep.MEDICAL_HISTORY} />
        </View>

        {/* Step indicator and title — hidden on completion screen */}
        {phase !== 'complete' && (
          <>
            <View style={reviewStyles.stepHeader}>
              <View style={reviewStyles.stepDots}>
                {[0, 1, 2].map(i => (
                  <View
                    key={i}
                    style={[
                      reviewStyles.stepDot,
                      i < reviewStep
                        ? { backgroundColor: StanfordColors.cardinal, opacity: 0.5 }
                        : i === reviewStep
                        ? { backgroundColor: StanfordColors.cardinal }
                        : { backgroundColor: colors.border },
                    ]}
                  />
                ))}
              </View>
              <Text style={[reviewStyles.stepCounter, { color: colors.icon }]}>
                Step {reviewStep + 1} of 3
              </Text>
            </View>

            <View style={reviewStyles.titleRow}>
              <Text style={[reviewStyles.stepTitle, { color: colors.text }]}>
                {STEP_TITLES[reviewStep]}
              </Text>
              <Text style={[reviewStyles.stepDesc, { color: colors.icon }]}>
                {STEP_DESCRIPTIONS[reviewStep]}
              </Text>
            </View>
          </>
        )}

        {/* Step content or completion screen */}
        {phase === 'complete' ? (
          <Animated.View style={[styles.completeContainer, { opacity: confirmFade }]}>
            <IconSymbol name="checkmark.circle.fill" size={64} color="#34C759" />
            <Text style={[styles.completeTitle, { color: colors.text }]}>
              All Confirmed
            </Text>
            <Text style={[styles.completeSubtitle, { color: colors.icon }]}>
              Your health records have been reviewed. You're ready to continue.
            </Text>
            <ContinueButton
              title="Continue to Baseline Survey"
              onPress={handleContinue}
              style={{ marginTop: Spacing.lg }}
            />
          </Animated.View>
        ) : (
          <>
            <Animated.View style={[{ flex: 1 }, { opacity: stepFade }]}>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={reviewStyles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {renderStepContent()}
              </ScrollView>
            </Animated.View>

            <View style={[reviewStyles.actionContainer, { backgroundColor: colors.background, borderTopColor: borderColor }]}>
              <ContinueButton
                title={isLastStep ? 'Confirm All & Continue →' : 'Looks Correct →'}
                onPress={() => handleConfirmStep(false)}
              />
              <TouchableOpacity
                style={reviewStyles.correctionButton}
                onPress={() => handleConfirmStep(true)}
                activeOpacity={0.7}
              >
                <Text style={[reviewStyles.correctionText, { color: colors.icon }]}>
                  Something's missing or incorrect
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Bottom sheet picker for Ethnicity / Race */}
        <Modal
          visible={pickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerVisible(false)}
        >
          <Pressable style={reviewStyles.pickerBackdrop} onPress={() => setPickerVisible(false)}>
            <Pressable style={[reviewStyles.pickerSheet, { backgroundColor: sectionBg }]}>
              <View style={[reviewStyles.pickerHandle, { backgroundColor: borderColor }]} />
              <Text style={[reviewStyles.pickerTitle, { color: colors.icon }]}>
                {pickerField === 'ethnicity' ? 'ETHNICITY' : 'RACE'}
              </Text>
              {(pickerField === 'ethnicity' ? ETHNICITY_OPTIONS : RACE_OPTIONS).map(option => {
                const selected = pickerField === 'ethnicity'
                  ? demoEthnicity === option
                  : demoRace === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[reviewStyles.pickerOption, { borderBottomColor: borderColor }]}
                    onPress={() => handlePickerSelect(option)}
                    activeOpacity={0.7}
                  >
                    <Text style={[reviewStyles.pickerOptionText, { color: colors.text }]}>
                      {option}
                    </Text>
                    {selected && (
                      <IconSymbol name="checkmark" size={16} color={StanfordColors.cardinal} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>

        <DevToolBar
          currentStep={OnboardingStep.MEDICAL_HISTORY}
          onContinue={handleContinue}
          extraActions={__DEV__ ? [
            {
              label: 'Use Mock',
              color: '#5856D6',
              onPress: () => loadPrefillData(true),
            },
          ] : undefined}
        />
      </SafeAreaView>
    );
  }
}

// ── Review-specific styles ────────────────────────────────────────────

const reviewStyles = StyleSheet.create({
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: '500',
  },
  titleRow: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: 0,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 46,
  },
  dataLabel: {
    fontSize: 15,
    fontWeight: '400',
    flex: 1,
  },
  dataRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  dataValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  willAskText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  sourceBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.md,
  },
  medGroup: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  medGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  medBullet: {
    fontSize: 16,
    lineHeight: 20,
  },
  medName: {
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
  medNameSecondary: {
    fontSize: 13,
    fontWeight: '400',
    opacity: 0.6,
  },
  procNameRow: {
    flex: 1,
    gap: 2,
  },
  procDate: {
    fontSize: 12,
  },
  noneFound: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 2,
  },
  actionContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  correctionButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  correctionText: {
    fontSize: 14,
  },
  inlineInput: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 22,
  },
  selectHint: {
    fontSize: 15,
    fontWeight: '500',
  },
  medEditInput: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerOptionText: {
    fontSize: 17,
  },
});

// ── Shared styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.md,
  },
  completeTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  completeSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
