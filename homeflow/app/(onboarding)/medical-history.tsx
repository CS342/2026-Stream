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
  type ClassifiedMedication,
  type MappedProcedure,
} from '@/lib/services/fhir';
import { getMockClinicalRecords, getMockDemographics } from '@/lib/services/healthkit/mock-health-data';

// ── Types ─────────────────────────────────────────────────────────────

type MedicalHistoryPhase = 'loading' | 'reviewing' | 'complete';

const STEP_TITLES = ['Demographics', 'Current Medications', 'Surgical History'] as const;

const STEP_DESCRIPTIONS = [
  'Your basic information from Apple Health.',
  'Medications found in your health records.',
  'Past procedures found in your health records.',
] as const;

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

  const stepFade = useRef(new Animated.Value(1)).current;
  const confirmFade = useRef(new Animated.Value(0)).current;

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
      setReviewStep(0);
      setCorrectionsNeeded(new Set());
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

  // ── Save and navigate ─────────────────────────────────────────────

  const handleContinue = async () => {
    const medications: string[] = [];
    const conditions: string[] = [];
    const surgicalHistory: string[] = [];
    const bphTreatmentHistory: string[] = [];

    if (prefillData) {
      const medEntries = [
        prefillData.medications.alphaBlockers,
        prefillData.medications.fiveARIs,
        prefillData.medications.anticholinergics,
        prefillData.medications.beta3Agonists,
        prefillData.medications.otherBPH,
      ];
      for (const entry of medEntries) {
        if (entry.value) {
          for (const med of entry.value) {
            medications.push(med.name);
            if (med.drugClass !== 'unrelated') bphTreatmentHistory.push(med.name);
          }
        }
      }

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

      if (prefillData.surgicalHistory.bphProcedures.value) {
        for (const proc of prefillData.surgicalHistory.bphProcedures.value) {
          surgicalHistory.push(proc.name);
          bphTreatmentHistory.push(proc.name);
        }
      }
      if (prefillData.surgicalHistory.otherProcedures.value) {
        for (const proc of prefillData.surgicalHistory.otherProcedures.value) {
          surgicalHistory.push(proc.name);
        }
      }
    }

    await OnboardingService.updateData({
      medicalHistory: {
        medications,
        conditions,
        allergies: [],
        surgicalHistory,
        bphTreatmentHistory,
        rawTranscript: 'reviewed from health records',
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
  }: {
    label: string;
    value: string | null | undefined;
    found: boolean;
    placeholder?: string;
  }) {
    return (
      <View style={[reviewStyles.dataRow, { borderBottomColor: borderColor }]}>
        <Text style={[reviewStyles.dataLabel, { color: colors.icon }]}>{label}</Text>
        <View style={reviewStyles.dataRight}>
          {found && value ? (
            <>
              <Text style={[reviewStyles.dataValue, { color: colors.text }]}>{value}</Text>
              <View style={reviewStyles.sourceBadge}>
                <Text style={reviewStyles.sourceBadgeText}>Apple Health</Text>
              </View>
            </>
          ) : (
            <Text style={[reviewStyles.willAskText, { color: colors.icon }]}>
              {placeholder}
            </Text>
          )}
        </View>
      </View>
    );
  }

  function MedGroupSection({
    label,
    meds,
  }: {
    label: string;
    meds: ClassifiedMedication[] | null | undefined;
  }) {
    return (
      <View style={reviewStyles.medGroup}>
        <Text style={[reviewStyles.medGroupLabel, { color: colors.icon }]}>{label}</Text>
        {meds && meds.length > 0 ? (
          meds.map((med, i) => (
            <View key={i} style={reviewStyles.medItem}>
              <Text style={[reviewStyles.medBullet, { color: StanfordColors.cardinal }]}>•</Text>
              <Text style={[reviewStyles.medName, { color: colors.text }]}>{med.name}</Text>
              <View style={reviewStyles.sourceBadge}>
                <Text style={reviewStyles.sourceBadgeText}>Health Records</Text>
              </View>
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

  function ProcedureSection({
    label,
    procedures,
  }: {
    label: string;
    procedures: MappedProcedure[] | null | undefined;
  }) {
    return (
      <View style={reviewStyles.medGroup}>
        <Text style={[reviewStyles.medGroupLabel, { color: colors.icon }]}>{label}</Text>
        {procedures && procedures.length > 0 ? (
          procedures.map((proc, i) => (
            <View key={i} style={reviewStyles.medItem}>
              <Text style={[reviewStyles.medBullet, { color: StanfordColors.cardinal }]}>•</Text>
              <View style={reviewStyles.procNameRow}>
                <Text style={[reviewStyles.medName, { color: colors.text }]}>{proc.name}</Text>
                {proc.date && (
                  <Text style={[reviewStyles.procDate, { color: colors.icon }]}>
                    {formatShortDate(proc.date)}
                  </Text>
                )}
              </View>
              <View style={reviewStyles.sourceBadge}>
                <Text style={reviewStyles.sourceBadgeText}>Health Records</Text>
              </View>
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
          <>
            <View style={[reviewStyles.card, { backgroundColor: sectionBg }]}>
              <Text style={[reviewStyles.cardSectionTitle, { color: colors.icon }]}>
                FROM APPLE HEALTH
              </Text>
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
            </View>

            <View style={[reviewStyles.card, { backgroundColor: sectionBg, marginTop: 12 }]}>
              <Text style={[reviewStyles.cardSectionTitle, { color: colors.icon }]}>
                NOT IN HEALTH RECORDS — WILL ASK
              </Text>
              <DataRow label="Full Name" value={null} found={false} />
              <DataRow label="Ethnicity" value={null} found={false} />
              <DataRow label="Race" value={null} found={false} />
            </View>
          </>
        );

      case 1: {
        const meds = prefillData.medications;
        return (
          <View style={[reviewStyles.card, { backgroundColor: sectionBg }]}>
            <MedGroupSection
              label="ALPHA BLOCKERS"
              meds={meds.alphaBlockers.value}
            />
            <View style={[reviewStyles.divider, { backgroundColor: borderColor }]} />
            <MedGroupSection
              label="5-ALPHA REDUCTASE INHIBITORS"
              meds={meds.fiveARIs.value}
            />
            <View style={[reviewStyles.divider, { backgroundColor: borderColor }]} />
            <MedGroupSection
              label="ANTICHOLINERGICS"
              meds={meds.anticholinergics.value}
            />
            <View style={[reviewStyles.divider, { backgroundColor: borderColor }]} />
            <MedGroupSection
              label="BETA-3 AGONISTS"
              meds={meds.beta3Agonists.value}
            />
            {meds.otherBPH.value && meds.otherBPH.value.length > 0 && (
              <>
                <View style={[reviewStyles.divider, { backgroundColor: borderColor }]} />
                <MedGroupSection label="OTHER BPH MEDICATIONS" meds={meds.otherBPH.value} />
              </>
            )}
          </View>
        );
      }

      case 2: {
        const surg = prefillData.surgicalHistory;
        return (
          <View style={[reviewStyles.card, { backgroundColor: sectionBg }]}>
            <ProcedureSection
              label="BPH / PROSTATE PROCEDURES"
              procedures={surg.bphProcedures.value}
            />
            <View style={[reviewStyles.divider, { backgroundColor: borderColor }]} />
            <ProcedureSection
              label="OTHER SURGERIES"
              procedures={surg.otherProcedures.value}
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
