/**
 * Consent Screen
 *
 * Formal informed consent document with required sections.
 * Users must scroll through and agree before proceeding.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, StanfordColors, Spacing } from '@/constants/theme';
import { OnboardingStep } from '@/lib/constants';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { ConsentService } from '@/lib/services/consent-service';
import {
  CONSENT_DOCUMENT,
  getConsentSummary,
} from '@/lib/consent/consent-document';
import {
  OnboardingProgressBar,
  ConsentAgreement,
  ContinueButton,
  DevToolBar,
} from '@/components/onboarding';
import { IconSymbol } from '@/components/ui/icon-symbol';

function renderConsentContent(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={{ fontWeight: '700' }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

export default function ConsentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const canContinue = agreed && signature.trim().length > 0;

  const handleContinue = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);

    try {
      // Record consent
      await ConsentService.recordConsent(signature);

      // Update onboarding
      await OnboardingService.goToStep(OnboardingStep.PERMISSIONS);

      router.push('/(onboarding)/permissions' as Href);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dev-only handler that bypasses consent validation
  const handleDevContinue = async () => {
    setIsSubmitting(true);

    try {
      await OnboardingService.goToStep(OnboardingStep.PERMISSIONS);
      router.push('/(onboarding)/permissions' as Href);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <OnboardingProgressBar currentStep={OnboardingStep.CONSENT} />
        <View style={styles.titleContainer}>
          <IconSymbol name="doc.text.fill" size={24} color={StanfordColors.cardinal} />
          <Text style={[styles.title, { color: colors.text }]}>
            {CONSENT_DOCUMENT.title}
          </Text>
        </View>
        <Text style={[styles.studyName, { color: colors.icon }]}>
          {CONSENT_DOCUMENT.studyName}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Flat consent document */}
        {CONSENT_DOCUMENT.sections.map((section, index) => (
          <View key={section.id}>
            {index > 0 && (
              <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
            )}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionContent, { color: colors.text }]}>
              {renderConsentContent(section.content)}
            </Text>
          </View>
        ))}

        <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

        {/* Agreement checkbox */}
        <ConsentAgreement
          summary={getConsentSummary()}
          agreed={agreed}
          onToggle={() => setAgreed(!agreed)}
        />

        {/* Signature */}
        <View
          style={[
            styles.signatureContainer,
            {
              backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
              borderColor: signature.trim().length > 0 ? '#34C759' : colors.border,
            },
          ]}
        >
          <Text style={[styles.signatureLabel, { color: colors.text }]}>
            Please type your full name to sign
          </Text>
          <TextInput
            style={[
              styles.signatureInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F9F9F9',
              },
            ]}
            placeholder="Your full name"
            placeholderTextColor={colors.icon}
            value={signature}
            onChangeText={setSignature}
            autoCapitalize="words"
            autoCorrect={false}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
          <Text style={[styles.signatureDate, { color: colors.icon }]}>
            Date: {new Date().toLocaleDateString()}
          </Text>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        {!canContinue && (
          <Text style={[styles.footerHint, { color: colors.icon }]}>
            Please agree and sign to continue
          </Text>
        )}
        <ContinueButton
          title="I Agree & Continue"
          onPress={handleContinue}
          disabled={!canContinue}
          loading={isSubmitting}
        />
      </View>

      <DevToolBar currentStep={OnboardingStep.CONSENT} onContinue={handleDevContinue} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  studyName: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screenHorizontal,
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 23,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.lg,
  },
  signatureContainer: {
    borderRadius: 12,
    borderWidth: 2,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  signatureLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  signatureInput: {
    fontSize: 18,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    fontStyle: 'italic',
  },
  signatureDate: {
    fontSize: 13,
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
  footer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
