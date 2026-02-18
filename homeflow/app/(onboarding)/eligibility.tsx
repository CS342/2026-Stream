/**
 * Eligibility Questionnaire Screen
 *
 * Simple form to check if user meets study criteria:
 * 1. BPH diagnosis
 * 2. Scheduled surgery
 * 3. Surgery date
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, StanfordColors, Spacing } from '@/constants/theme';
import { OnboardingStep } from '@/lib/constants';
import { OnboardingService } from '@/lib/services/onboarding-service';
import {
  OnboardingProgressBar,
  ContinueButton,
  DevToolBar,
} from '@/components/onboarding';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EligibilityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [hasBPH, setHasBPH] = useState<boolean | null>(null);
  const [hasSurgery, setHasSurgery] = useState<boolean | null>(null);
  const [surgeryDate, setSurgeryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isEligible = hasBPH === true && hasSurgery === true && surgeryDate !== null;
  const canContinue = hasBPH !== null && hasSurgery !== null && (hasSurgery === false || surgeryDate !== null);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSurgeryDate(selectedDate);
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    // Save eligibility data
    await OnboardingService.updateData({
      eligibility: {
        hasIPhone: true, // Assumed since they're using the app
        hasBPHDiagnosis: hasBPH ?? false,
        consideringSurgery: hasSurgery ?? false,
        isEligible: isEligible,
      },
    });

    if (hasSurgery && surgeryDate) {
      await OnboardingService.updateData({
        account: {
          firstName: '',
          lastName: '',
          email: '',
          dateOfBirth: surgeryDate.toISOString(),
        },
      });
    }

    // If not eligible, go to ineligible screen
    if (!isEligible) {
      await OnboardingService.markIneligible();
      router.replace('/(onboarding)/ineligible' as Href);
      return;
    }

    // If eligible, proceed to consent
    await OnboardingService.goToStep(OnboardingStep.CONSENT);
    router.push('/(onboarding)/consent' as Href);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <OnboardingProgressBar currentStep={OnboardingStep.CHAT} />
        <View style={styles.titleContainer}>
          <IconSymbol name="checkmark.circle.fill" size={28} color={StanfordColors.cardinal} />
          <Text style={[styles.title, { color: colors.text }]}>
            Eligibility Check
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          Let's make sure this study is right for you
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}>
        
        {/* Question 1: BPH Diagnosis */}
        <View style={styles.questionContainer}>
          <Text style={[styles.questionText, { color: colors.text }]}>
            Have you been diagnosed with BPH (Benign Prostatic Hyperplasia)?
          </Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                {
                  backgroundColor: hasBPH === true
                    ? StanfordColors.cardinal
                    : colorScheme === 'dark'
                    ? '#2C2C2E'
                    : '#F2F2F7',
                  borderColor: hasBPH === true ? StanfordColors.cardinal : colors.border,
                },
              ]}
              onPress={() => setHasBPH(true)}>
              <Text
                style={[
                  styles.optionText,
                  { color: hasBPH === true ? '#FFFFFF' : colors.text },
                ]}>
                Yes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                {
                  backgroundColor: hasBPH === false
                    ? StanfordColors.cardinal
                    : colorScheme === 'dark'
                    ? '#2C2C2E'
                    : '#F2F2F7',
                  borderColor: hasBPH === false ? StanfordColors.cardinal : colors.border,
                },
              ]}
              onPress={() => setHasBPH(false)}>
              <Text
                style={[
                  styles.optionText,
                  { color: hasBPH === false ? '#FFFFFF' : colors.text },
                ]}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Question 2: Scheduled Surgery */}
        {hasBPH !== null && (
          <View style={styles.questionContainer}>
            <Text style={[styles.questionText, { color: colors.text }]}>
              Do you have a scheduled bladder outlet surgery?
            </Text>
            <Text style={[styles.questionHelp, { color: colors.icon }]}>
              Such as TURP, HoLEP, GreenLight laser, UroLift, Rezum, or Aquablation
            </Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: hasSurgery === true
                      ? StanfordColors.cardinal
                      : colorScheme === 'dark'
                      ? '#2C2C2E'
                      : '#F2F2F7',
                    borderColor: hasSurgery === true ? StanfordColors.cardinal : colors.border,
                  },
                ]}
                onPress={() => {
                  setHasSurgery(true);
                  if (Platform.OS === 'android') {
                    setShowDatePicker(true);
                  }
                }}>
                <Text
                  style={[
                    styles.optionText,
                    { color: hasSurgery === true ? '#FFFFFF' : colors.text },
                  ]}>
                  Yes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: hasSurgery === false
                      ? StanfordColors.cardinal
                      : colorScheme === 'dark'
                      ? '#2C2C2E'
                      : '#F2F2F7',
                    borderColor: hasSurgery === false ? StanfordColors.cardinal : colors.border,
                  },
                ]}
                onPress={() => {
                  setHasSurgery(false);
                  setSurgeryDate(null);
                }}>
                <Text
                  style={[
                    styles.optionText,
                    { color: hasSurgery === false ? '#FFFFFF' : colors.text },
                  ]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Question 3: Surgery Date */}
        {hasSurgery === true && (
          <View style={styles.questionContainer}>
            <Text style={[styles.questionText, { color: colors.text }]}>
              When is your surgery scheduled?
            </Text>
            
            {Platform.OS === 'ios' ? (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={surgeryDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  textColor={colors.text}
                  themeVariant={colorScheme}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                      borderColor: surgeryDate ? StanfordColors.cardinal : colors.border,
                    },
                  ]}
                  onPress={() => setShowDatePicker(true)}>
                  <IconSymbol name="calendar" size={20} color={StanfordColors.cardinal} />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {surgeryDate
                      ? surgeryDate.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Select surgery date'}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={surgeryDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>
        )}

        {/* Ineligibility Message */}
        {canContinue && !isEligible && (
          <View
            style={[
              styles.ineligibleBox,
              { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFF3CD' },
            ]}>
            <IconSymbol name="info.circle.fill" size={24} color="#FF9500" />
            <Text style={[styles.ineligibleText, { color: colors.text }]}>
              To participate in this study, you must have a BPH diagnosis and a scheduled bladder outlet surgery.
            </Text>
          </View>
        )}

        {/* Eligibility Confirmation */}
        {isEligible && (
          <View
            style={[
              styles.eligibleBox,
              { backgroundColor: colorScheme === 'dark' ? '#1C3A1C' : '#D4EDDA' },
            ]}>
            <IconSymbol name="checkmark.circle.fill" size={24} color="#34C759" />
            <Text style={[styles.eligibleText, { color: colors.text }]}>
              Great! You're eligible for the HomeFlow study.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <ContinueButton
          title={isEligible ? 'Continue to Consent' : 'Continue'}
          onPress={handleContinue}
          disabled={!canContinue}
        />
      </View>

      <DevToolBar currentStep={OnboardingStep.CHAT} onContinue={handleContinue} />
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
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
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
  questionContainer: {
    marginBottom: Spacing.xl,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    lineHeight: 26,
  },
  questionHelp: {
    fontSize: 14,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  optionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  ineligibleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.md,
  },
  ineligibleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  eligibleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.md,
  },
  eligibleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
