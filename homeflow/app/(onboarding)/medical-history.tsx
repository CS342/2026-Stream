/**
 * Medical History Chat Screen
 *
 * Collects medical history through natural conversation with AI assistant.
 * This screen appears after consent and permissions (Apple Health / Throne).
 *
 * Flow:
 *   1. Loading phase: Fetch clinical records + HealthKit demographics in parallel
 *   2. Build prefill data from health records (FHIR normalization)
 *   3. If all medical data is prefilled → show summary, skip chatbot
 *   4. Otherwise → launch chatbot with modified prompt that skips known fields
 *   5. If no records available → fall back to full chatbot (original behavior)
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ChatView, ChatProvider } from '@spezivibe/chat';
import { Colors, StanfordColors, Spacing } from '@/constants/theme';
import { OnboardingStep, STUDY_INFO } from '@/lib/constants';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { OnboardingProgressBar, ContinueButton, DevToolBar } from '@/components/onboarding';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getAllClinicalRecords } from '@/lib/services/healthkit';
import { getDemographics } from '@/lib/services/healthkit/HealthKitClient';
import {
  buildMedicalHistoryPrefill,
  isFullyPrefilled,
  getKnownFieldsSummary,
  buildModifiedSystemPrompt,
  type MedicalHistoryPrefill,
} from '@/lib/services/fhir';

/**
 * Fallback system prompt used when no clinical records are available.
 */
const FALLBACK_SYSTEM_PROMPT = `You are a friendly research assistant collecting medical history for the HomeFlow BPH study. The participant has already been confirmed eligible and has given informed consent. Now you need to collect their medical history.

## Study Information
- Name: ${STUDY_INFO.name}
- Institution: ${STUDY_INFO.institution}
- Purpose: Track voiding patterns and symptoms before/after bladder outlet surgery

## Context
The participant has already:
- Passed eligibility screening (has iPhone, has BPH/LUTS, planning bladder outlet surgery)
- Signed informed consent
- Granted permissions for Apple Health and Throne uroflow

## What to Collect

### Data We Get Automatically from Apple Health (DO NOT ASK):
- Age / Date of Birth
- Biological Sex
- Height
- Weight / BMI

### Data You MUST Collect (not available from Apple Health):

#### 1. Demographics
- Full name (for study records)
- Ethnicity: Hispanic/Latino or Not Hispanic/Latino
- Race

#### 2. BPH/LUTS Medications (BE THOROUGH - ask about each category)
Go through each medication class:
1. Alpha blockers: "Are you taking tamsulosin (Flomax), alfuzosin (Uroxatral), silodosin (Rapaflo), doxazosin, or terazosin?"
2. 5-alpha reductase inhibitors: "Are you taking finasteride (Proscar) or dutasteride (Avodart)?"
3. Anticholinergics: "Are you taking oxybutynin (Ditropan), tolterodine (Detrol), solifenacin (Vesicare), or trospium (Sanctura)?"
4. Beta-3 agonists: "Are you taking mirabegron (Myrbetriq) or vibegron (Gemtesa)?"
5. Any other bladder or prostate medications

#### 3. Surgical History
- Prior BPH/prostate surgeries: Ask about TURP, HoLEP, GreenLight, UroLift, Rezum, Aquablation, or any other prostate procedures. Get type AND approximate date.
- General surgical history: Any other past surgeries (type and approximate year)

#### 4. Lab Values (ask if they know these)
- PSA (Prostate Specific Antigen): Most recent value and when it was done. Explain: "This is a blood test often done for prostate screening."
- Urinalysis: Any recent urine test results, especially if anything abnormal was found

#### 5. Key Medical Conditions (CRITICAL - must ask about these specifically)
- **Diabetes**: Ask directly! If yes, ask about HbA1c level (explain: "This is a blood sugar control number, usually between 5-10%")
- **Hypertension**: High blood pressure - are they diagnosed? Is it controlled with medication?
- Other significant conditions

#### 6. Clinical Measurements (if they've had these tests)
- PVR (Post-Void Residual) or bladder scan: "Have you had a bladder scan after urinating? If so, what was the residual volume in mL?"
- Clinic uroflow: "Have you done a urine flow test at your doctor's office? If so, what was your Qmax (maximum flow rate)?"
- Mobility status: How active are they? Any limitations?

#### 7. Upcoming Surgery
- Date of scheduled BPH surgery (if known)
- Type of surgery planned (TURP, HoLEP, UroLift, Rezum, etc.)

## Conversation Guidelines
- Be warm, conversational, and empathetic
- Ask 2-3 related items at a time, don't overwhelm
- Group questions logically (all medications together, then conditions, etc.)
- Acknowledge symptoms supportively when mentioned
- If they don't know a value (like PSA or HbA1c), that's OK - just note "unknown" and continue
- NEVER give medical advice or interpret their values

## Important Response Markers (include these exact phrases)
When ALL medical history sections are complete: [HISTORY_COMPLETE]

## Conversation Flow
1. Start with a brief introduction: "Now let's collect some medical history. We'll automatically get things like your age and weight from Apple Health, but I need to ask you about medications, conditions, and a few other things."
2. Work through sections in order: Demographics → Medications → Surgeries → Labs → Conditions → Clinical data → Planned surgery
3. Before finishing, summarize: "Let me confirm what I have..." then list key points
4. End with: "I have everything I need. [HISTORY_COMPLETE] You can tap Continue to proceed."

## Start the Conversation
"Thanks for completing the consent process! Now I need to collect some medical history. We'll pull basic info like your age and weight from Apple Health, so I just need to ask about a few other things.

Let's start with some basic demographics - could you tell me your full name?"`;

type MedicalHistoryPhase = 'loading' | 'collecting' | 'all_prefilled' | 'complete';

export default function MedicalHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [phase, setPhase] = useState<MedicalHistoryPhase>('loading');
  const [canContinue, setCanContinue] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(FALLBACK_SYSTEM_PROMPT);
  const [prefillData, setPrefillData] = useState<MedicalHistoryPrefill | null>(null);
  const [knownSummary, setKnownSummary] = useState<string[]>([]);

  // Animation for continue button
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Get API key from environment
  const apiKey = Constants.expoConfig?.extra?.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

  // Chat provider config
  const provider: ChatProvider = useMemo(
    () => ({
      type: 'openai',
      apiKey,
      model: 'gpt-4o-mini',
    }),
    [apiKey]
  );

  // ── Load clinical records + demographics on mount ─────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadPrefillData() {
      try {
        // Fetch clinical records and demographics in parallel
        const [clinicalRecords, demographics] = await Promise.all([
          getAllClinicalRecords().catch(() => null),
          getDemographics().catch(() => ({ age: null, dateOfBirth: null, biologicalSex: null })),
        ]);

        if (cancelled) return;

        // Build prefill from whatever data we got
        const prefill = buildMedicalHistoryPrefill(clinicalRecords, demographics);
        const known = getKnownFieldsSummary(prefill);

        setPrefillData(prefill);
        setKnownSummary(known);

        if (isFullyPrefilled(prefill)) {
          // All medical data sections are covered
          setPhase('all_prefilled');
          setCanContinue(true);
        } else if (known.length > 0) {
          // Some data found — use modified prompt
          const modifiedPrompt = buildModifiedSystemPrompt(prefill);
          setSystemPrompt(modifiedPrompt);
          setPhase('collecting');
        } else {
          // No records — fall back to full chatbot
          setPhase('collecting');
        }
      } catch {
        // On any error, fall back to full chatbot
        if (!cancelled) {
          setPhase('collecting');
        }
      }
    }

    loadPrefillData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (canContinue) {
      Animated.spring(buttonOpacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [canContinue, buttonOpacity]);

  // Watch for completion marker in chat messages
  const checkForMarkers = useCallback((message: string) => {
    const lowerMessage = message.toLowerCase();

    if (message.includes('[HISTORY_COMPLETE]') || (lowerMessage.includes("all set") && lowerMessage.includes("continue"))) {
      setPhase('complete');
      setCanContinue(true);
    }
  }, []);

  const handleContinue = async () => {
    // Build medication/condition lists from prefill data if available
    const medications: string[] = [];
    const conditions: string[] = [];
    const surgicalHistory: string[] = [];
    const bphTreatmentHistory: string[] = [];

    if (prefillData) {
      // Collect medication names
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
            if (med.drugClass !== 'unrelated') {
              bphTreatmentHistory.push(med.name);
            }
          }
        }
      }

      // Collect conditions
      const condEntries = [
        prefillData.conditions.diabetes,
        prefillData.conditions.hypertension,
        prefillData.conditions.bph,
        prefillData.conditions.other,
      ];
      for (const entry of condEntries) {
        if (entry.value) {
          for (const cond of entry.value) {
            conditions.push(cond.name);
          }
        }
      }

      // Collect procedures
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
        rawTranscript: phase === 'all_prefilled'
          ? 'prefilled from health records'
          : 'collected via chatbot + health records',
      },
    });

    await OnboardingService.goToStep(OnboardingStep.BASELINE_SURVEY);
    router.push('/(onboarding)/baseline-survey' as Href);
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'loading':
        return 'Checking your health records...';
      case 'collecting':
        return 'Collecting medical history...';
      case 'all_prefilled':
      case 'complete':
        return 'Ready to continue!';
      default:
        return '';
    }
  };

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
            Looking for medications, conditions, and lab results
          </Text>
        </View>
        <DevToolBar currentStep={OnboardingStep.MEDICAL_HISTORY} onContinue={handleContinue} />
      </SafeAreaView>
    );
  }

  // ── All prefilled phase ───────────────────────────────────────────
  if (phase === 'all_prefilled') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <OnboardingProgressBar currentStep={OnboardingStep.MEDICAL_HISTORY} />
        </View>
        <ScrollView contentContainerStyle={styles.prefilledContainer}>
          <IconSymbol name="checkmark.circle.fill" size={56} color="#34C759" />
          <Text style={[styles.prefilledTitle, { color: colors.text }]}>
            Health Records Found
          </Text>
          <Text style={[styles.prefilledSubtitle, { color: colors.icon }]}>
            We found the following from your Apple Health records:
          </Text>

          <View style={[styles.summaryCard, { backgroundColor: colorScheme === 'dark' ? '#1E2022' : '#F5F5F5' }]}>
            {knownSummary.map((item, index) => (
              <View key={index} style={styles.summaryRow}>
                <IconSymbol name="checkmark" size={16} color="#34C759" />
                <Text style={[styles.summaryText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.prefilledNote, { color: colors.icon }]}>
            We still need a few details that aren't in your health records.
            The chatbot will ask only about what's missing.
          </Text>

          <ContinueButton
            title="Continue to Chatbot"
            onPress={() => {
              setPhase('collecting');
              setCanContinue(false);
            }}
            style={{ marginTop: Spacing.md }}
          />
        </ScrollView>
        <DevToolBar currentStep={OnboardingStep.MEDICAL_HISTORY} onContinue={handleContinue} />
      </SafeAreaView>
    );
  }

  // ── No API key fallback ───────────────────────────────────────────
  if (!apiKey) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <OnboardingProgressBar currentStep={OnboardingStep.MEDICAL_HISTORY} />
        </View>
        <View style={styles.noApiKey}>
          <IconSymbol name={'info.circle.fill' as any} size={48} color={colors.icon} />
          <Text style={[styles.noApiKeyTitle, { color: colors.text }]}>
            Medical History Chat Not Available
          </Text>
          <Text style={[styles.noApiKeyText, { color: colors.icon }]}>
            OpenAI API key not configured. For demo purposes, tap Continue to proceed.
          </Text>
          <ContinueButton title="Continue (Demo)" onPress={handleContinue} style={{ marginTop: Spacing.lg }} />
        </View>

        <DevToolBar currentStep={OnboardingStep.MEDICAL_HISTORY} onContinue={handleContinue} />
      </SafeAreaView>
    );
  }

  // ── Chatbot phase (collecting / complete) ─────────────────────────
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <OnboardingProgressBar currentStep={OnboardingStep.MEDICAL_HISTORY} />
          <View style={styles.phaseIndicator}>
            <View
              style={[
                styles.phaseDot,
                { backgroundColor: phase === 'complete' ? '#34C759' : StanfordColors.cardinal },
              ]}
            />
            <Text style={[styles.phaseText, { color: colors.icon }]}>{getPhaseText()}</Text>
          </View>
        </View>

        <ChatView
          provider={provider}
          systemPrompt={systemPrompt}
          placeholder="Type your response..."
          onResponse={checkForMarkers}
          emptyState={
            <View style={styles.emptyState}>
              <IconSymbol name="message.fill" size={48} color={colors.icon} />
              <Text style={[styles.emptyStateText, { color: colors.icon }]}>
                Starting conversation...
              </Text>
            </View>
          }
        />

        {canContinue && (
          <Animated.View
            style={[
              styles.continueContainer,
              {
                backgroundColor: colors.background,
                opacity: buttonOpacity,
              },
            ]}
          >
            <Text style={[styles.continueHint, { color: colors.icon }]}>
              Medical history collected. Ready for the next step.
            </Text>
            <ContinueButton title="Continue to Baseline Survey" onPress={handleContinue} />
          </Animated.View>
        )}

        <DevToolBar currentStep={OnboardingStep.MEDICAL_HISTORY} onContinue={handleContinue} />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.sm,
  },
  phaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 15,
  },
  continueContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: Spacing.sm,
  },
  continueHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  noApiKey: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
  },
  noApiKeyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  noApiKeyText: {
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
  prefilledContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  prefilledTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  prefilledSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  summaryCard: {
    width: '100%',
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryText: {
    fontSize: 15,
    flex: 1,
  },
  prefilledNote: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
});
