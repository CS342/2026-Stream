import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/hooks/use-auth';
import {
  CONSENT_PROFILE_SUMMARY,
  DATA_PERMISSIONS_SUMMARY,
  STUDY_COORDINATOR,
} from '@/lib/consent/consent-document';

export default function ProfileScreen() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to sign out.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, isDark && styles.screenTitleDark]}>
          Profile
        </Text>

        {/* 1. Account */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.cardHeader}>
            <IconSymbol
              name="person.circle.fill"
              size={16}
              color={isDark ? '#8B92A8' : '#7A7F8E'}
            />
            <Text style={[styles.cardLabel, isDark && styles.cardLabelDark]}>Account</Text>
          </View>
          {user ? (
            <>
              <Text style={[styles.accountName, isDark && styles.accountNameDark]}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={[styles.accountEmail, isDark && styles.accountEmailDark]}>
                {user.email}
              </Text>
            </>
          ) : (
            <Text style={[styles.placeholderText, isDark && styles.placeholderTextDark]}>
              Not signed in.
            </Text>
          )}
        </View>

        {/* 2. Study Consent & Data Permissions — compact tappable rows */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => setShowConsentModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <IconSymbol
                name="doc.text.fill"
                size={18}
                color={isDark ? '#A0A8D0' : '#7B8CDE'}
              />
              <Text style={[styles.rowLabel, { color: isDark ? '#A0A8D0' : '#7B8CDE' }]}>
                Study consent
              </Text>
            </View>
            <IconSymbol
              name="chevron.right"
              size={14}
              color={isDark ? '#A0A8D0' : '#7B8CDE'}
            />
          </TouchableOpacity>

          <View style={[styles.rowDivider, isDark && styles.rowDividerDark]} />

          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => setShowPermissionsModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <IconSymbol
                name="lock.shield"
                size={18}
                color={isDark ? '#8CBCAA' : '#5A9E87'}
              />
              <Text style={[styles.rowLabel, { color: isDark ? '#8CBCAA' : '#5A9E87' }]}>
                Data permissions
              </Text>
            </View>
            <IconSymbol
              name="chevron.right"
              size={14}
              color={isDark ? '#8CBCAA' : '#5A9E87'}
            />
          </TouchableOpacity>

          <View style={[styles.rowDivider, isDark && styles.rowDividerDark]} />

          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => router.push('/consent-viewer' as Href)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <IconSymbol
                name="doc.text.fill"
                size={18}
                color={isDark ? '#8B92A8' : '#7A7F8E'}
              />
              <Text style={[styles.rowLabel, { color: isDark ? '#8B92A8' : '#7A7F8E' }]}>
                View full consent document
              </Text>
            </View>
            <IconSymbol
              name="chevron.right"
              size={14}
              color={isDark ? '#8B92A8' : '#7A7F8E'}
            />
          </TouchableOpacity>
        </View>

        {/* 4. Contact / Support */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.cardHeader}>
            <IconSymbol
              name="phone.fill"
              size={16}
              color={isDark ? '#C4949A' : '#B07178'}
            />
            <Text style={[styles.cardLabel, { color: isDark ? '#C4949A' : '#B07178' }]}>
              Contact for study questions
            </Text>
          </View>
          <Text style={[styles.contactName, isDark && styles.contactNameDark]}>
            {STUDY_COORDINATOR.name}
          </Text>
          <Text style={[styles.contactRole, isDark && styles.contactRoleDark]}>
            {STUDY_COORDINATOR.role}
          </Text>

          <View style={styles.contactActions}>
            <TouchableOpacity
              style={[styles.contactButton, isDark && styles.contactButtonDark]}
              onPress={() => Linking.openURL(`mailto:${STUDY_COORDINATOR.email}`)}
              activeOpacity={0.7}
            >
              <IconSymbol name="envelope.fill" size={15} color={isDark ? '#C4949A' : '#B07178'} />
              <Text style={[styles.contactButtonText, isDark && styles.contactButtonTextDark]}>
                {STUDY_COORDINATOR.email}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactButton, isDark && styles.contactButtonDark]}
              onPress={() => Linking.openURL(`tel:${STUDY_COORDINATOR.phone}`)}
              activeOpacity={0.7}
            >
              <IconSymbol name="phone.fill" size={15} color={isDark ? '#C4949A' : '#B07178'} />
              <Text style={[styles.contactButtonText, isDark && styles.contactButtonTextDark]}>
                {STUDY_COORDINATOR.phone}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutButton, isDark && styles.signOutButtonDark]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color="#D64545" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

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
            style={[styles.modalContent, isDark && styles.modalContentDark]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <IconSymbol
              name="doc.text.fill"
              size={32}
              color={isDark ? '#A0A8D0' : '#7B8CDE'}
              style={{ alignSelf: 'center', marginBottom: 16 }}
            />
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Study consent
            </Text>
            <Text style={[styles.modalBody, isDark && styles.modalBodyDark]}>
              {CONSENT_PROFILE_SUMMARY}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: isDark ? '#4A5396' : '#7B8CDE' }]}
              onPress={() => setShowConsentModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalButtonText, isDark && styles.modalButtonTextDark]}>
                Got it
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
            style={[styles.modalContent, isDark && styles.modalContentDark]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <IconSymbol
              name="lock.shield.fill"
              size={32}
              color={isDark ? '#8CBCAA' : '#5A9E87'}
              style={{ alignSelf: 'center', marginBottom: 16 }}
            />
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Data permissions
            </Text>
            <Text style={[styles.modalSubhead, isDark && styles.modalSubheadDark]}>
              What this app can access:
            </Text>
            {DATA_PERMISSIONS_SUMMARY.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={[styles.bullet, isDark && styles.bulletDark]} />
                <Text style={[styles.bulletText, isDark && styles.bulletTextDark]}>
                  {item}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.modalButton, isDark && styles.modalButtonDark]}
              onPress={() => setShowPermissionsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalButtonText, isDark && styles.modalButtonTextDark]}>
                Got it
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
  screenTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Georgia',
    marginBottom: 24,
  },
  screenTitleDark: {
    color: '#C8D6E5',
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
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7A7F8E',
  },
  cardLabelDark: {
    color: '#8B92A8',
  },

  // Account info
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  accountNameDark: {
    color: '#D4D8E8',
  },
  accountEmail: {
    fontSize: 14,
    color: '#7A7F8E',
    marginTop: 2,
  },
  accountEmailDark: {
    color: '#6B7394',
  },
  placeholderText: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  placeholderTextDark: {
    color: '#6B7394',
  },

  // Sign out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  signOutButtonDark: {
    backgroundColor: '#141828',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D64545',
  },

  // Tappable row buttons
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EE',
  },
  rowDividerDark: {
    backgroundColor: '#1E2236',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C7C7CC',
    marginTop: 7,
    marginRight: 10,
  },
  bulletDark: {
    backgroundColor: '#3A3E50',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#5E6B7A',
    lineHeight: 22,
  },
  bulletTextDark: {
    color: '#8B92A8',
  },

  // Contact
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  contactNameDark: {
    color: '#D4D8E8',
  },
  contactRole: {
    fontSize: 14,
    color: '#7A7F8E',
    marginTop: 2,
    marginBottom: 14,
  },
  contactRoleDark: {
    color: '#6B7394',
  },
  contactActions: {
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5EEEF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  contactButtonDark: {
    backgroundColor: '#1E1318',
  },
  contactButtonText: {
    fontSize: 14,
    color: '#5E6B7A',
  },
  contactButtonTextDark: {
    color: '#A8868C',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalContentDark: {
    backgroundColor: '#1A1E2E',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalTitleDark: {
    color: '#C8D6E5',
  },
  modalBody: {
    fontSize: 15,
    color: '#5E6B7A',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalBodyDark: {
    color: '#8B92A8',
  },
  modalSubhead: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7A7F8E',
    marginBottom: 12,
    textAlign: 'left',
  },
  modalSubheadDark: {
    color: '#6B7394',
  },
  modalButton: {
    backgroundColor: '#5A9E87',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonDark: {
    backgroundColor: '#3D7A65',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonTextDark: {
    color: '#E8F0EC',
  },
});
