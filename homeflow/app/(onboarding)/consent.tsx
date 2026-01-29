/**
 * Consent Screen
 *
 * Formal informed consent document with required sections.
 * Users must scroll through and agree before proceeding.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  TextInput,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, StanfordColors, Spacing } from '@/constants/theme';
import { OnboardingStep } from '@/lib/constants';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { ConsentService } from '@/lib/services/consent-service';
import {
  CONSENT_DOCUMENT,
  getRequiredSections,
  getConsentSummary,
} from '@/lib/consent/consent-document';
import {
  OnboardingProgressBar,
  ConsentSection,
  ConsentAgreement,
  ContinueButton,
  DevToolBar,
} from '@/components/onboarding';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ConsentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [readSections, setReadSections] = useState<Set<string>>(new Set());
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const requiredSections = getRequiredSections();
  const allRequiredRead = requiredSections.every((s) => readSections.has(s.id));
  const canContinue = allRequiredRead && agreed && signature.trim().length > 0;

  const handleSectionRead = useCallback((sectionId: string) => {
    setReadSections((prev) => new Set([...prev, sectionId]));
  }, []);

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

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Introduction */}
        <View
          style={[
            styles.introBox,
            { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : 'rgba(140, 21, 21, 0.05)' },
          ]}
        >
          <Text style={[styles.introText, { color: colors.text }]}>
            Please read each section carefully. Sections marked with a red dot are required.
            Tap a section to expand it.
          </Text>
        </View>

        {/* Consent Sections */}
        {CONSENT_DOCUMENT.sections.map((section, index) => (
          <ConsentSection
            key={section.id}
            title={section.title}
            content={section.content}
            required={section.required}
            isRead={readSections.has(section.id)}
            onRead={() => handleSectionRead(section.id)}
            defaultExpanded={index === 0}
          />
        ))}

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: colors.icon }]}>
            {readSections.size} of {requiredSections.length} required sections read
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: StanfordColors.cardinal,
                  width: `${(readSections.size / requiredSections.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

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
          />
          <Text style={[styles.signatureDate, { color: colors.icon }]}>
            Date: {new Date().toLocaleDateString()}
          </Text>
        </View>

      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        {!allRequiredRead && (
          <Text style={[styles.footerHint, { color: colors.icon }]}>
            Please read all required sections before continuing
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screenHorizontal,
    paddingBottom: Spacing.xl,
  },
  introBox: {
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
  },
  progressContainer: {
    marginVertical: Spacing.md,
  },
  progressText: {
    fontSize: 13,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
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
