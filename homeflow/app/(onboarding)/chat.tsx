/**
 * Onboarding Chat Screen
 *
 * Eligibility screening through natural conversation with AI assistant.
 * Medical history collection happens later (after consent & permissions)
 * in the medical-history screen.
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
import { ChatView, ChatProvider } from '@spezivibe/chat';
import { getClientLLMProvider } from '@/lib/config/llm';
import { Colors, StanfordColors, Spacing } from '@/constants/theme';
import { OnboardingStep, STUDY_INFO } from '@/lib/constants';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { OnboardingProgressBar, ContinueButton, DevToolBar } from '@/components/onboarding';
import { IconSymbol } from '@/components/ui/icon-symbol';

/**
 * System prompt for eligibility screening only.
 *
 * ELIGIBILITY CRITERIA (Pending from PI)
 * The eligibility questions below are preliminary placeholders.
 * Final eligibility criteria will be provided by the Principal Investigator (PI).
 * Update this prompt once official criteria are received.
 */
const SYSTEM_PROMPT = `You are a friendly research assistant helping to screen participants for the HomeFlow BPH study. Your goal is to check eligibility through natural conversation.

## Study Information
- Name: ${STUDY_INFO.name}
- Institution: ${STUDY_INFO.institution}
- Purpose: Track voiding patterns and symptoms before/after bladder outlet surgery

## Eligibility (Required Criteria)
Check these naturally (don't read a checklist):
1. Has iPhone with iOS 15+ (required)
2. Has BPH or lower urinary tract symptoms suspected to be caused by BPH - such as frequent urination, weak stream, nighttime urination (required)
3. Planning to undergo a bladder outlet procedure such as TURP, HoLEP, GreenLight laser, UroLift, Rezum, Aquablation (required)

Note: Apple Watch and Throne uroflow devices will be provided to participants - do NOT ask about these.

## Conversation Guidelines
- Be warm, conversational, and empathetic
- Ask one criterion at a time naturally
- Acknowledge symptoms supportively when mentioned
- NEVER give medical advice or interpret their values
- If ineligible, be kind and explain why clearly

## Important Response Markers (include these exact phrases)
When eligibility is confirmed: [ELIGIBLE]
When ineligible: [INELIGIBLE]

## Conversation Flow
1. Start with eligibility (iPhone, BPH diagnosis/symptoms, surgery plans)
2. If eligible: "Great news! You're eligible for the HomeFlow study. [ELIGIBLE] Next, we'll walk you through the informed consent process. Tap Continue to proceed."
3. If ineligible: Explain kindly why they don't meet criteria. [INELIGIBLE]

## Start the Conversation
"Hi! I'm here to help you join the HomeFlow study. This is a research study that tracks urinary symptoms before and after bladder outlet surgery. Let me ask a few quick questions to make sure this study is right for you.

First - are you using an iPhone with iOS 15 or later?"`;

type ChatPhase = 'eligibility' | 'eligible' | 'ineligible';

export default function OnboardingChatScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [phase, setPhase] = useState<ChatPhase>('eligibility');
  const [canContinue, setCanContinue] = useState(false);

  // Animation for continue button
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  /**
   * TODO: Once Firebase backend is set up, move OpenAI calls to a Cloud
   * Function or Cloud Run endpoint and remove client-side API key usage.
   */
  const provider: ChatProvider = useMemo(
    () => getClientLLMProvider('gpt-4o-mini') ?? { type: 'openai', apiKey: '', model: 'gpt-4o-mini' },
    [],
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
      setPhase('eligible');
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
      case 'eligible':
        return 'Eligible! Ready to continue.';
      case 'ineligible':
        return 'Checking eligibility...';
      default:
        return '';
    }
  };

  // If no LLM provider, show a placeholder
  if (!provider.apiKey) {
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
                { backgroundColor: phase === 'eligible' ? '#34C759' : StanfordColors.cardinal },
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
