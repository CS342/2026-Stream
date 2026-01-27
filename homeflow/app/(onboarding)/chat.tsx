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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ChatView, ChatProvider } from '@spezivibe/chat';
import { Colors, StanfordColors, Spacing } from '@/constants/theme';
import { OnboardingStep, STUDY_INFO } from '@/lib/constants';
import { OnboardingService, OnboardingData } from '@/lib/services/onboarding-service';
import { OnboardingProgressBar, ContinueButton } from '@/components/onboarding';
import { IconSymbol } from '@/components/ui/icon-symbol';

/**
 * Combined system prompt for eligibility + medical history
 */
const SYSTEM_PROMPT = `You are a friendly research assistant helping to screen and enroll participants in the HomeFlow BPH study. Your goal is to:
1. First, check eligibility through natural conversation
2. Then, if eligible, collect medical history

## Study Information
- Name: ${STUDY_INFO.name}
- Institution: ${STUDY_INFO.institution}
- Purpose: Track voiding patterns and symptoms before/after bladder outlet surgery

## Phase 1: Eligibility (Required Criteria)
Check these naturally (don't read a checklist):
1. Has iPhone with iOS 15+ (required)
2. Has Apple Watch (required)
3. Has BPH diagnosis OR experiencing urinary symptoms like frequent urination, weak stream, nighttime urination (required)
4. Considering or scheduled for bladder outlet surgery like TURP, laser therapy, UroLift, Rezum (required)
5. Willing to use Throne uroflow device (optional - okay to skip)

## Phase 2: Medical History (if eligible)
Collect conversationally:
1. Current medications (especially for BPH/prostate)
2. Other medical conditions
3. Allergies
4. Previous surgeries
5. BPH treatment history

## Guidelines
- Be warm, conversational, and empathetic
- Ask one or two things at a time
- If they mention symptoms, acknowledge them
- If ineligible, be kind and explain why
- Don't give medical advice

## Important Responses
When eligibility is confirmed, include the exact phrase: [ELIGIBLE]
When ineligible, include: [INELIGIBLE]
When medical history is complete, include: [HISTORY_COMPLETE]

These markers help the app know when to enable the Continue button.

## Start the conversation
Open with something like: "Hi! I'm here to help you join the HomeFlow study. Let me ask a few questions to make sure this study is a good fit for you. First, are you using an iPhone?"`;

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
        hasAppleWatch: true,
        hasBPHDiagnosis: true,
        consideringSurgery: true,
        willingToUseThrone: true,
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
      </SafeAreaView>
    );
  }

  return (
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
            Great! You're ready for the next step.
          </Text>
          <ContinueButton title="Continue to Consent" onPress={handleContinue} />
        </Animated.View>
      )}

      {/* TEMPORARY: Development-only continue button to test other screens */}
      {/* TODO: Remove this once eligibility questions are properly set up */}
      {!canContinue && (
        <View
          style={[
            styles.continueContainer,
            {
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text style={[styles.continueHint, { color: colors.icon }]}>
            ⚠️ Temporary: Skip eligibility for testing
          </Text>
          <ContinueButton title="Continue (Dev Only)" onPress={handleContinue} />
        </View>
      )}
    </SafeAreaView>
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
