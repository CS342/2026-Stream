import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  CONSENT_PROFILE_SUMMARY,
  DATA_PERMISSIONS_SUMMARY,
  STUDY_COORDINATOR,
} from '@/lib/consent/consent-document';
import { useAppTheme, type AppearanceMode } from '@/lib/theme/ThemeContext';

const APPEARANCE_OPTIONS: { value: AppearanceMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function ProfileScreen() {
  const { theme, appearance, setAppearance } = useAppTheme();
  const { colors: c } = theme;
  const router = useRouter();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: c.textPrimary }]}>
          Profile
        </Text>

        {/* 1. Account */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="person.circle.fill" size={17} color={c.textTertiary} />
            <Text style={[styles.cardLabel, { color: c.textTertiary }]}>Account</Text>
          </View>
          <Text style={[styles.placeholderText, { color: c.textTertiary }]}>
            Account details will appear here once sign-in is enabled.
          </Text>
        </View>

        {/* 2. Appearance — iOS-style segmented control */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="circle.lefthalf.filled" size={17} color={c.textSecondary} />
            <Text style={[styles.cardLabel, { color: c.textSecondary }]}>Appearance</Text>
          </View>
          <View style={[styles.segmentedControl, { backgroundColor: c.secondaryFill }]}>
            {APPEARANCE_OPTIONS.map((opt) => {
              const isSelected = appearance === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segment,
                    isSelected && [styles.segmentSelected, { backgroundColor: c.card }],
                  ]}
                  onPress={() => setAppearance(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: c.textSecondary },
                      isSelected && { color: c.textPrimary, fontWeight: '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Study Consent & Data Permissions — iOS Settings-style rows */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => setShowConsentModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <IconSymbol name="doc.text.fill" size={18} color={c.accent} />
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                Study Consent
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={c.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: c.separator }]} />

          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => setShowPermissionsModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <IconSymbol name="lock.shield" size={18} color={c.semanticSuccess} />
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                Data Permissions
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={c.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: c.separator }]} />

          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => router.push('/consent-viewer' as Href)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <IconSymbol name="doc.text.fill" size={18} color={c.textTertiary} />
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                View Full Consent Document
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={c.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* 4. Contact / Support */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="phone.fill" size={17} color={c.textSecondary} />
            <Text style={[styles.cardLabel, { color: c.textSecondary }]}>
              Contact for study questions
            </Text>
          </View>
          <Text style={[styles.contactName, { color: c.textPrimary }]}>
            {STUDY_COORDINATOR.name}
          </Text>
          <Text style={[styles.contactRole, { color: c.textTertiary }]}>
            {STUDY_COORDINATOR.role}
          </Text>

          <View style={styles.contactActions}>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: c.background }]}
              onPress={() => Linking.openURL(`mailto:${STUDY_COORDINATOR.email}`)}
              activeOpacity={0.7}
            >
              <IconSymbol name="envelope.fill" size={15} color={c.accent} />
              <Text style={[styles.contactButtonText, { color: c.textSecondary }]}>
                {STUDY_COORDINATOR.email}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: c.background }]}
              onPress={() => Linking.openURL(`tel:${STUDY_COORDINATOR.phone}`)}
              activeOpacity={0.7}
            >
              <IconSymbol name="phone.fill" size={15} color={c.accent} />
              <Text style={[styles.contactButtonText, { color: c.textSecondary }]}>
                {STUDY_COORDINATOR.phone}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Study Consent summary modal */}
      <Modal
        visible={showConsentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowConsentModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowConsentModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: c.card }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <IconSymbol
              name="doc.text.fill"
              size={32}
              color={c.accent}
              style={{ alignSelf: 'center', marginBottom: 16 }}
            />
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
              Study Consent
            </Text>
            <Text style={[styles.modalBody, { color: c.textSecondary }]}>
              {CONSENT_PROFILE_SUMMARY}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: c.accent }]}
              onPress={() => setShowConsentModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonText}>
                Got It
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Data Permissions modal */}
      <Modal
        visible={showPermissionsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPermissionsModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPermissionsModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: c.card }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <IconSymbol
              name="lock.shield.fill"
              size={32}
              color={c.semanticSuccess}
              style={{ alignSelf: 'center', marginBottom: 16 }}
            />
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
              Data Permissions
            </Text>
            <Text style={[styles.modalSubhead, { color: c.textTertiary }]}>
              What this app can access:
            </Text>
            {DATA_PERMISSIONS_SUMMARY.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={[styles.bullet, { backgroundColor: c.textTertiary }]} />
                <Text style={[styles.bulletText, { color: c.textSecondary }]}>
                  {item}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: c.accent }]}
              onPress={() => setShowPermissionsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonText}>
                Got It
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
    marginBottom: 20,
  },

  // Cards — iOS grouped style
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Account placeholder
  placeholderText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Segmented control — iOS style
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 7,
  },
  segmentSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Tappable row buttons — iOS Settings style
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: '400',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 4,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },

  // Contact
  contactName: {
    fontSize: 17,
    fontWeight: '600',
  },
  contactRole: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 14,
  },
  contactActions: {
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  contactButtonText: {
    fontSize: 15,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C7C7CC',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalSubhead: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'left',
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
