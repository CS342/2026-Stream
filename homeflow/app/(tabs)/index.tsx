import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { notifyOnboardingComplete } from '@/hooks/use-onboarding-status';
import { useSurgeryDate } from '@/hooks/use-surgery-date';
import { useWatchUsage } from '@/hooks/use-watch-usage';
import { SurgeryCompleteModal } from '@/components/home/SurgeryCompleteModal';

export default function HomeScreen() {
  const isDark = useColorScheme() === 'dark';
  const surgery = useSurgeryDate();
  const watch = useWatchUsage();
  const [showSurgeryModal, setShowSurgeryModal] = useState(false);
  const [showDevSheet, setShowDevSheet] = useState(false);
  const [watchDismissed, setWatchDismissed] = useState(false);

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding?',
      'This will clear all onboarding progress and restart from the beginning.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await OnboardingService.reset();
              notifyOnboardingComplete();
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert('Error', 'Failed to reset onboarding');
            }
          },
        },
      ],
    );
  };

  const showWatchReminder = !watch.isLoading && !watch.watchWornRecently && !watchDismissed;

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.dateLabel, isDark && styles.dateLabelDark]}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={[styles.greeting, isDark && styles.greetingDark]}>
              Welcome to HomeFlow
            </Text>
          </View>
          {__DEV__ && (
            <TouchableOpacity
              style={[styles.devPill, isDark && styles.devPillDark]}
              onPress={() => setShowDevSheet(true)}
              activeOpacity={0.7}
            >
              <IconSymbol name="wrench.fill" size={14} color={isDark ? '#8B92A8' : '#7A7F8E'} />
              <Text style={[styles.devPillText, isDark && styles.devPillTextDark]}>Dev</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Surgery Date Card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.cardHeader}>
            <IconSymbol
              name="calendar.badge.clock"
              size={16}
              color={isDark ? '#A0A8D0' : '#7B8CDE'}
            />
            <Text style={[styles.cardLabel, isDark && styles.cardLabelDark]}>
              Surgery date
            </Text>
            {surgery.isPlaceholder && __DEV__ && (
              <View style={[styles.placeholderBadge, isDark && styles.placeholderBadgeDark]}>
                <Text style={styles.placeholderBadgeText}>Placeholder</Text>
              </View>
            )}
          </View>
          {surgery.isLoading ? (
            <Text style={[styles.cardValue, isDark && styles.cardValueDark]}>Loading...</Text>
          ) : (
            <>
              <Text style={[styles.cardValue, isDark && styles.cardValueDark]}>
                {surgery.dateLabel}
              </Text>
              {surgery.date && !surgery.hasPassed && (
                <Text style={[styles.cardSubtext, isDark && styles.cardSubtextDark]}>
                  {daysUntil(surgery.date)}
                </Text>
              )}
              {surgery.hasPassed && (
                <Text style={[styles.cardSubtext, isDark && styles.cardSubtextDark]}>
                  Surgery completed — tracking recovery
                </Text>
              )}
            </>
          )}
        </View>

        {/* Study Timeline Card */}
        {!surgery.isLoading && (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.cardHeader}>
              <IconSymbol
                name="calendar"
                size={16}
                color={isDark ? '#8CBCAA' : '#5A9E87'}
              />
              <Text style={[styles.cardLabel, { color: isDark ? '#8CBCAA' : '#5A9E87' }]}>
                Study timeline
              </Text>
              {surgery.isPlaceholder && __DEV__ && (
                <View style={[styles.placeholderBadge, isDark && styles.placeholderBadgeDark]}>
                  <Text style={styles.placeholderBadgeText}>Placeholder</Text>
                </View>
              )}
            </View>
            <View style={styles.timelineRow}>
              <View style={styles.timelineItem}>
                <Text style={[styles.timelineLabel, isDark && styles.timelineLabelDark]}>
                  Start
                </Text>
                <Text style={[styles.timelineValue, isDark && styles.timelineValueDark]}>
                  {surgery.studyStartLabel}
                </Text>
              </View>
              <View style={[styles.timelineDivider, isDark && styles.timelineDividerDark]} />
              <View style={styles.timelineItem}>
                <Text style={[styles.timelineLabel, isDark && styles.timelineLabelDark]}>
                  End
                </Text>
                <Text style={[styles.timelineValue, isDark && styles.timelineValueDark]}>
                  {surgery.studyEndLabel}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Watch Reminder */}
        {showWatchReminder && (
          <View style={[styles.reminderCard, isDark && styles.reminderCardDark]}>
            <View style={styles.reminderContent}>
              <IconSymbol
                name="applewatch"
                size={20}
                color={isDark ? '#8CBCAA' : '#5A9E87'}
              />
              <View style={styles.reminderTextContainer}>
                <Text style={[styles.reminderTitle, isDark && styles.reminderTitleDark]}>
                  Wear your Apple Watch today
                </Text>
                <Text style={[styles.reminderBody, isDark && styles.reminderBodyDark]}>
                  We use watch data to track your activity and sleep patterns.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWatchDismissed(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <IconSymbol
                  name="xmark"
                  size={14}
                  color={isDark ? '#5E7A70' : '#8E8E93'}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Watch all set */}
        {!watch.isLoading && watch.watchWornRecently && (
          <View style={[styles.allSetCard, isDark && styles.allSetCardDark]}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={18}
              color={isDark ? '#8CBCAA' : '#5A9E87'}
            />
            <Text style={[styles.allSetText, isDark && styles.allSetTextDark]}>
              Apple Watch data is syncing — all set
            </Text>
          </View>
        )}

        {/* Study info */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
            Your study
          </Text>
          <Text style={[styles.studyBody, isDark && styles.studyBodyDark]}>
            Track your BPH symptoms, voiding patterns, and recovery progress
            throughout the study. Your daily data helps your care team
            understand your health patterns.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Surgery Complete Modal */}
      <SurgeryCompleteModal
        visible={showSurgeryModal}
        onDismiss={() => setShowSurgeryModal(false)}
      />

      {/* Dev Tools Sheet */}
      {__DEV__ && (
        <Modal
          visible={showDevSheet}
          animationType="slide"
          transparent
          onRequestClose={() => setShowDevSheet(false)}
        >
          <Pressable style={styles.sheetOverlay} onPress={() => setShowDevSheet(false)}>
            <Pressable
              style={[styles.sheetContent, isDark && styles.sheetContentDark]}
              onPress={() => {}}
            >
              <View style={styles.sheetHandle} />
              <Text style={[styles.sheetTitle, isDark && styles.sheetTitleDark]}>
                Developer Tools
              </Text>

              <TouchableOpacity
                style={[styles.sheetButton, isDark && styles.sheetButtonDark]}
                onPress={() => {
                  setShowDevSheet(false);
                  setTimeout(() => setShowSurgeryModal(true), 300);
                }}
                activeOpacity={0.7}
              >
                <IconSymbol name="checkmark.circle.fill" size={18} color={isDark ? '#8CBCAA' : '#5A9E87'} />
                <Text style={[styles.sheetButtonText, isDark && styles.sheetButtonTextDark]}>
                  Trigger Surgery Complete
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetButton, isDark && styles.sheetButtonDark]}
                onPress={() => {
                  setShowDevSheet(false);
                  setTimeout(handleResetOnboarding, 300);
                }}
                activeOpacity={0.7}
              >
                <IconSymbol name="sparkles" size={18} color={isDark ? '#A0A8D0' : '#7B8CDE'} />
                <Text style={[styles.sheetButtonText, isDark && styles.sheetButtonTextDark]}>
                  Reset Onboarding
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetCancel, isDark && styles.sheetCancelDark]}
                onPress={() => setShowDevSheet(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sheetCancelText, isDark && styles.sheetCancelTextDark]}>
                  Close
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function daysUntil(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Scheduled for today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return '';
  return `${diff} days from now`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F8',
  },
  containerDark: {
    backgroundColor: '#0A0E1A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#7A7F8E',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '500',
  },
  dateLabelDark: {
    color: '#8B92A8',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Georgia',
    marginTop: 4,
  },
  greetingDark: {
    color: '#C8D6E5',
  },

  // Dev pill
  devPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0E2EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 4,
  },
  devPillDark: {
    backgroundColor: '#1A1E2E',
  },
  devPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A7F8E',
  },
  devPillTextDark: {
    color: '#8B92A8',
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#141828',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 13,
    color: '#7B8CDE',
    fontWeight: '500',
  },
  cardLabelDark: {
    color: '#A0A8D0',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Georgia',
  },
  cardValueDark: {
    color: '#D4D8E8',
  },
  cardSubtext: {
    fontSize: 14,
    color: '#7A7F8E',
    marginTop: 4,
  },
  cardSubtextDark: {
    color: '#8B92A8',
  },
  placeholderBadge: {
    backgroundColor: '#E8E0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  placeholderBadgeDark: {
    backgroundColor: '#1E1828',
  },
  placeholderBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9B8AB8',
  },

  // Study timeline
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineItem: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7A7F8E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timelineLabelDark: {
    color: '#6B7394',
  },
  timelineValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  timelineValueDark: {
    color: '#D4D8E8',
  },
  timelineDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#D8DAE2',
    marginHorizontal: 16,
  },
  timelineDividerDark: {
    backgroundColor: '#1E2236',
  },

  // Watch reminder
  reminderCard: {
    backgroundColor: '#ECF4F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  reminderCardDark: {
    backgroundColor: '#0F1E1A',
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A3E36',
    marginBottom: 2,
  },
  reminderTitleDark: {
    color: '#CDDDD6',
  },
  reminderBody: {
    fontSize: 14,
    color: '#5E7A70',
    lineHeight: 20,
  },
  reminderBodyDark: {
    color: '#8EAAA0',
  },

  // All set
  allSetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECF4F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  allSetCardDark: {
    backgroundColor: '#0F1E1A',
  },
  allSetText: {
    fontSize: 15,
    color: '#2A3E36',
    fontWeight: '500',
  },
  allSetTextDark: {
    color: '#CDDDD6',
  },

  // Study section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Georgia',
    marginBottom: 8,
  },
  sectionTitleDark: {
    color: '#C8D6E5',
  },
  studyBody: {
    fontSize: 15,
    color: '#5E6B7A',
    lineHeight: 22,
  },
  studyBodyDark: {
    color: '#8B92A8',
  },

  // Dev tools sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  sheetContentDark: {
    backgroundColor: '#1A1E2E',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7A7F8E',
    marginBottom: 16,
    textAlign: 'center',
  },
  sheetTitleDark: {
    color: '#8B92A8',
  },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0F2F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  sheetButtonDark: {
    backgroundColor: '#0F1320',
  },
  sheetButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2C3E50',
  },
  sheetButtonTextDark: {
    color: '#C8D6E5',
  },
  sheetCancel: {
    alignItems: 'center',
    padding: 14,
    marginTop: 4,
  },
  sheetCancelDark: {},
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  sheetCancelTextDark: {
    color: '#6B7394',
  },
});
