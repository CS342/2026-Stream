/**
 * Surgery Complete Modal
 *
 * A calm, full-screen modal shown when the surgery date has passed.
 * Can also be triggered via dev tools for demo purposes.
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Animated,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SurgeryCompleteModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function SurgeryCompleteModal({ visible, onDismiss }: SurgeryCompleteModalProps) {
  const isDark = useColorScheme() === 'dark';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, isDark && styles.overlayDark]}>
        <Animated.View
          style={[
            styles.content,
            isDark && styles.contentDark,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={[styles.iconCircle, isDark && styles.iconCircleDark]}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={56}
              color={isDark ? '#8CBCAA' : '#5A9E87'}
            />
          </View>

          <Text style={[styles.title, isDark && styles.titleDark]}>
            Surgery complete
          </Text>

          <Text style={[styles.body, isDark && styles.bodyDark]}>
            You've reached an important milestone in your care journey. We'll
            continue tracking your recovery patterns so your care team can
            support you.
          </Text>

          <Text style={[styles.subtext, isDark && styles.subtextDark]}>
            Your daily check-ins will now focus on recovery.
          </Text>

          <TouchableOpacity
            style={[styles.button, isDark && styles.buttonDark]}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, isDark && styles.buttonTextDark]}>
              Continue
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(240, 242, 248, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  overlayDark: {
    backgroundColor: 'rgba(10, 14, 26, 0.95)',
  },
  content: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    padding: 36,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  contentDark: {
    backgroundColor: '#1A1E2E',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ECF4F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircleDark: {
    backgroundColor: '#0F1E1A',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Georgia',
    marginBottom: 16,
    textAlign: 'center',
  },
  titleDark: {
    color: '#C8D6E5',
  },
  body: {
    fontSize: 16,
    color: '#5E6B7A',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  bodyDark: {
    color: '#8B92A8',
  },
  subtext: {
    fontSize: 14,
    color: '#8B92A8',
    textAlign: 'center',
    marginBottom: 32,
  },
  subtextDark: {
    color: '#6B7394',
  },
  button: {
    backgroundColor: '#5A9E87',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonDark: {
    backgroundColor: '#3D7A65',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextDark: {
    color: '#E8F0EC',
  },
});
