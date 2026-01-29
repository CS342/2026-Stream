/**
 * Onboarding Chat Screen
 *
 * Combined eligibility screening and medical history collection
 * through natural conversation with AI assistant.
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
 * Combined system prompt for eligibility + medical history
 *
 * DATA SOURCE NOTES:
 * - From Apple HealthKit (automatic): Age/DOB, biological sex, height, weight, BMI
 * - From Chatbot (this prompt): Everything else - medications, conditions, labs, surgeries
 *
 * =============================================================================
 * TODO / DEVELOPMENT NOTES:
 * =============================================================================
 *
 * 1. CLINICAL RECORDS ACCESS (Future Enhancement)
 *    We are actively working to obtain Apple's Clinical Health Records entitlement
 *    approval. Once approved, we can pull medications, lab results, conditions,
 *    and procedures directly from connected health systems (MyChart, Epic, etc.).
 *
 *    Current chatbot-based medical history collection is:
 *    - A temporary solution while we await Clinical Records approval
 *    - A fallback for users who haven't connected their health records to Apple Health
 *
 *    When Clinical Records access is available, update flow to:
 *    - First attempt to pull data from Clinical Records
 *    - Use chatbot only to fill gaps where data is missing
 *
 * 2. ELIGIBILITY CRITERIA (Pending from PI)
 *    The eligibility questions below are preliminary placeholders.
 *    Final eligibility criteria will be provided by the Principal Investigator (PI).
 *    Update the Phase 1 section of this prompt once official criteria are received.
 *
 * =============================================================================
 */
const SYSTEM_PROMPT = `You are a friendly research assistant helping to screen and enroll participants in the HomeFlow BPH study. Your goal is to:
1. First, check eligibility through natural conversation
2. Then, if eligible, collect comprehensive medical history

## Study Information
- Name: ${STUDY_INFO.name}
- Institution: ${STUDY_INFO.institution}
- Purpose: Track voiding patterns and symptoms before/after bladder outlet surgery

## Phase 1: Eligibility (Required Criteria)
Check these naturally (don't read a checklist):
1. Has iPhone with iOS 15+ (required)
2. Has BPH or lower urinary tract symptoms suspected to be caused by BPH - such as frequent urination, weak stream, nighttime urination (required)
3. Planning to undergo a bladder outlet procedure such as TURP, HoLEP, GreenLight laser, UroLift, Rezum, Aquablation (required)

Note: Apple Watch and Throne uroflow devices will be provided to participants - do NOT ask about these.

## Phase 2: Medical History (if eligible)

### Data We Get Automatically from Apple Health (DO NOT ASK):
- Age / Date of Birth
- Biological Sex
- Height
- Weight / BMI

### Data You MUST Collect (not available from Apple Health):

#### 2.1 Demographics
- Full name (for study records)
- Ethnicity: Hispanic/Latino or Not Hispanic/Latino
- Race

#### 2.2 BPH/LUTS Medications (BE THOROUGH - ask about each category)
Go through each medication class:
1. Alpha blockers: "Are you taking tamsulosin (Flomax), alfuzosin (Uroxatral), silodosin (Rapaflo), doxazosin, or terazosin?"
2. 5-alpha reductase inhibitors: "Are you taking finasteride (Proscar) or dutasteride (Avodart)?"
3. Anticholinergics: "Are you taking oxybutynin (Ditropan), tolterodine (Detrol), solifenacin (Vesicare), or trospium (Sanctura)?"
4. Beta-3 agonists: "Are you taking mirabegron (Myrbetriq) or vibegron (Gemtesa)?"
5. Any other bladder or prostate medications

#### 2.3 Surgical History
- Prior BPH/prostate surgeries: Ask about TURP, HoLEP, GreenLight, UroLift, Rezum, Aquablation, or any other prostate procedures. Get type AND approximate date.
- General surgical history: Any other past surgeries (type and approximate year)

#### 2.4 Lab Values (ask if they know these)
- PSA (Prostate Specific Antigen): Most recent value and when it was done. Explain: "This is a blood test often done for prostate screening."
- Urinalysis: Any recent urine test results, especially if anything abnormal was found

#### 2.5 Key Medical Conditions (CRITICAL - must ask about these specifically)
- **Diabetes**: Ask directly! If yes, ask about HbA1c level (explain: "This is a blood sugar control number, usually between 5-10%")
- **Hypertension**: High blood pressure - are they diagnosed? Is it controlled with medication?
- Other significant conditions

#### 2.6 Clinical Measurements (if they've had these tests)
- PVR (Post-Void Residual) or bladder scan: "Have you had a bladder scan after urinating? If so, what was the residual volume in mL?"
- Clinic uroflow: "Have you done a urine flow test at your doctor's office? If so, what was your Qmax (maximum flow rate)?"
- Mobility status: How active are they? Any limitations?

#### 2.7 Upcoming Surgery
- Date of scheduled BPH surgery (if known)
- Type of surgery planned (TURP, HoLEP, UroLift, Rezum, etc.)

## Conversation Guidelines
- Be warm, conversational, and empathetic
- Ask 2-3 related items at a time, don't overwhelm
- Group questions logically (all medications together, then conditions, etc.)
- Acknowledge symptoms supportively when mentioned
- If they don't know a value (like PSA or HbA1c), that's OK - just note "unknown" and continue
- NEVER give medical advice or interpret their values
- If ineligible, be kind and explain why clearly

## Important Response Markers (include these exact phrases)
When eligibility is confirmed: [ELIGIBLE]
When ineligible: [INELIGIBLE]
When ALL medical history sections are complete: [HISTORY_COMPLETE]

## Conversation Flow Example
1. Start with eligibility (iPhone, BPH diagnosis/symptoms, surgery plans)
2. Transition after eligible: "Great news! You're eligible for the study. [ELIGIBLE] Now I need to collect some medical history. We'll automatically get things like your age and weight from Apple Health, but I need to ask you about medications, conditions, and a few other things..."
3. Work through sections in order: Demographics → Medications → Surgeries → Labs → Conditions → Clinical data → Planned surgery
4. Before finishing, summarize: "Let me confirm what I have..." then list key points
5. End with: "I have everything I need. [HISTORY_COMPLETE] You can tap Continue to proceed."

## Start the Conversation
"Hi! I'm here to help you join the HomeFlow study. This is a research study that tracks urinary symptoms before and after bladder outlet surgery. Let me ask a few quick questions to make sure this study is right for you.

First - are you using an iPhone with iOS 15 or later?"`;

type ChatPhase = 'eligibility' | 'medical_history' | 'complete' | 'ineligible';

export default function OnboardingChatScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [phase, setPhase] = useState<ChatPhase>('eligibility');
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

  // Watch for phase markers in chat messages
  // This is a simplified approach - in production you'd use function calling
  const checkForMarkers = useCallback((message: string) => {
    const lowerMessage = message.toLowerCase();

    if (message.includes('[INELIGIBLE]') || lowerMessage.includes("unfortunately") && lowerMessage.includes("not eligible")) {
      setPhase('ineligible');
      // Navigate to ineligible screen after a brief delay
      setTimeout(() => {
        router.replace('/(onboarding)/ineligible' as Href);
      }, 2000);
    } else if (message.includes('[ELIGIBLE]') || (lowerMessage.includes("eligible") && lowerMessage.includes("great news"))) {
      setPhase('medical_history');
    } else if (message.includes('[HISTORY_COMPLETE]') || (lowerMessage.includes("all set") && lowerMessage.includes("continue"))) {
      setPhase('complete');
      setCanContinue(true);
    }
  }, [router]);

  const handleContinue = async () => {
    // Save collected data (in a real app, you'd parse the chat transcript)
    await OnboardingService.updateData({
      eligibility: {
        hasIPhone: true,
        hasBPHDiagnosis: true,
        consideringSurgery: true,
        isEligible: true,
      },
    });

    await OnboardingService.goToStep(OnboardingStep.CONSENT);
    router.push('/(onboarding)/consent' as Href);
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'eligibility':
        return 'Checking eligibility...';
      case 'medical_history':
        return 'Collecting medical history...';
      case 'complete':
        return 'Ready to continue!';
      case 'ineligible':
        return 'Checking eligibility...';
      default:
        return '';
    }
  };

  // If no API key, show a placeholder
  if (!apiKey) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <OnboardingProgressBar currentStep={OnboardingStep.CHAT} />
        </View>
        <View style={styles.noApiKey}>
          <IconSymbol name={'info.circle.fill' as any} size={48} color={colors.icon} />
          <Text style={[styles.noApiKeyTitle, { color: colors.text }]}>
            Chat Not Available
          </Text>
          <Text style={[styles.noApiKeyText, { color: colors.icon }]}>
            OpenAI API key not configured. For demo purposes, tap Continue to proceed.
          </Text>
          <ContinueButton title="Continue (Demo)" onPress={handleContinue} style={{ marginTop: Spacing.lg }} />
        </View>

        <DevToolBar currentStep={OnboardingStep.CHAT} onContinue={handleContinue} />
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <OnboardingProgressBar currentStep={OnboardingStep.CHAT} />
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
              Great! You&apos;re ready for the next step.
            </Text>
            <ContinueButton title="Continue to Consent" onPress={handleContinue} />
          </Animated.View>
        )}

        <DevToolBar currentStep={OnboardingStep.CHAT} onContinue={handleContinue} />
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
