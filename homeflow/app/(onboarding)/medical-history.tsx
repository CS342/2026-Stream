/**
 * Medical History Chat Screen
 *
 * Collects medical history through natural conversation with AI assistant.
 * This screen appears after consent and permissions (Apple Health / Throne).
 *
 * =============================================================================
 * FUTURE APPLE HEALTH INTEGRATION NOTES:
 * =============================================================================
 *
 * This chatbot currently serves as the ONLY avenue for medical history
 * collection since we are not yet pulling health records from Apple Health.
 *
 * When Apple Health Clinical Records access is available, the intended flow is:
 *   1. Pull available health records from Apple Health (medications, labs,
 *      conditions, procedures) via connected health systems (MyChart, Epic, etc.)
 *   2. Determine which required fields are still missing after the pull
 *   3. Use THIS chatbot to ask the user ONLY about the gaps
 *   4. If Apple Health provides ALL required fields, the chatbot will simply
 *      display: "We got everything we need from your health records.
 *      You're all set!" and show the Continue button immediately.
 *
 * The chatbot acts as a fail-safe to ensure we always collect complete
 * medical history, regardless of what Apple Health can provide.
 *
 * =============================================================================
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

/**
 * System prompt for medical history collection.
 *
 * NOTE: Currently this chatbot asks about ALL medical history fields because
 * we are not yet pulling records from Apple Health. When health records
 * integration is implemented, this prompt should be dynamically modified to
 * only ask about fields NOT already filled by health records.
 */
const SYSTEM_PROMPT = `You are a friendly research assistant collecting medical history for the HomeFlow BPH study. The participant has already been confirmed eligible and has given informed consent. Now you need to collect their medical history.

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

type MedicalHistoryPhase = 'collecting' | 'complete';

export default function MedicalHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [phase, setPhase] = useState<MedicalHistoryPhase>('collecting');
  const [canContinue, setCanContinue] = useState(false);

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
    // Save collected data (in a real app, you'd parse the chat transcript)
    await OnboardingService.updateData({
      medicalHistory: {
        medications: [],
        conditions: [],
        allergies: [],
        surgicalHistory: [],
        bphTreatmentHistory: [],
        rawTranscript: 'collected via chatbot',
      },
    });

    await OnboardingService.goToStep(OnboardingStep.BASELINE_SURVEY);
    router.push('/(onboarding)/baseline-survey' as Href);
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'collecting':
        return 'Collecting medical history...';
      case 'complete':
        return 'Ready to continue!';
      default:
        return '';
    }
  };

  // If no API key, show a placeholder
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
          systemPrompt={SYSTEM_PROMPT}
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
});
