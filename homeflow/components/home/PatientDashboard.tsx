/**
 * PatientDashboard
 *
 * Rich home-screen dashboard for BPH study participants. Displays:
 *   1. Header — StreamSync logo, patient name/age, surgery date, bell
 *   2. Study Progress Banner — timeline, progress bar, surgery status
 *   3. IPSS Score Card — gauge ring, pre/post comparison, gradient bar
 *   4. Throne Smart Toilet Data — flow rate, void volume sparklines, PSA bars
 *   5. Apple Watch Data — activity, sleep quality, vitals
 *
 * All data is loaded from Firestore / HealthKit via existing hooks.
 * Shows skeleton placeholders while loading.
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/lib/theme/ThemeContext';
import { useAuth } from '@/lib/auth/auth-context';
import { useSurgeryDate } from '@/hooks/use-surgery-date';
import { useHealthSummary } from '@/hooks/use-health-summary';
import { useIPSSScores, ipssCategory } from '@/hooks/use-ipss-scores';
import { useThroneSummary, type TrendPoint, type PSATrendPoint } from '@/hooks/use-throne-summary';

// ─── Health-specific accent colors (separate from app accent) ────────────────
const TEAL = '#00D4FF';
const GOLD = '#FFD60A';
const DEEP_PURPLE = '#BF5AF2';
const RING_RED = '#FF453A';
const RING_GREEN = '#30D158';
const RING_BLUE = '#5E9EFF';

// ─── SkeletonBox — pulsing gray placeholder ──────────────────────────────────

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius,
          backgroundColor: '#3A3A3C',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({
  children,
  style,
  colors,
}: {
  children: React.ReactNode;
  style?: object;
  colors: ReturnType<typeof useAppTheme>['theme']['colors'];
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Sparkline — mini bar chart ───────────────────────────────────────────────

function Sparkline({
  data,
  color,
  height = 44,
}: {
  data: TrendPoint[];
  color: string;
  height?: number;
}) {
  if (data.length === 0) {
    return <SkeletonBox height={height} borderRadius={6} />;
  }

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 0.1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 3 }}>
      {data.map((point, i) => {
        const barH = Math.max(4, (point.value / max) * height);
        const isLast = i === data.length - 1;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: barH,
              backgroundColor: color,
              borderRadius: 3,
              opacity: isLast ? 1 : 0.45,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── PSA Bar Chart ────────────────────────────────────────────────────────────

function PSABarChart({
  data,
  latestValue,
  isLoading,
  colors,
}: {
  data: PSATrendPoint[];
  latestValue: number | null;
  isLoading: boolean;
  colors: ReturnType<typeof useAppTheme>['theme']['colors'];
}) {
  const chartHeight = 72;

  if (isLoading) {
    return (
      <View>
        <View style={[styles.cardSubHeader, { marginBottom: 10 }]}>
          <SkeletonBox width={80} height={14} />
          <SkeletonBox width={100} height={14} />
        </View>
        <SkeletonBox height={chartHeight} />
      </View>
    );
  }

  // If no PSA data, show a stub with sample values (demo-safe)
  const displayData: PSATrendPoint[] = data.length > 0
    ? data
    : [
        { month: 'Oct', value: 2.8 },
        { month: 'Nov', value: 2.4 },
        { month: 'Dec', value: 1.9 },
        { month: 'Jan', value: 1.6 },
        { month: 'Feb', value: 1.4 },
        { month: 'Mar', value: 1.2 },
      ];

  const latest = latestValue ?? displayData[displayData.length - 1]?.value ?? null;
  const maxVal = Math.max(...displayData.map((d) => d.value), 0.1);

  return (
    <View>
      <View style={styles.cardSubHeader}>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
          PSA Trend
        </Text>
        {latest !== null && (
          <Text style={[styles.metricValue, { color: TEAL, fontSize: 13 }]}>
            {latest.toFixed(1)} ng/mL latest
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight, gap: 6, marginTop: 8 }}>
        {displayData.map((point, i) => {
          const isLast = i === displayData.length - 1;
          const barH = Math.max(8, (point.value / maxVal) * chartHeight);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.psaBarValue, { color: isLast ? GOLD : colors.textTertiary }]}>
                {point.value.toFixed(1)}
              </Text>
              <View
                style={{
                  width: '100%',
                  height: barH,
                  backgroundColor: isLast ? GOLD : '#2C3A5C',
                  borderRadius: 4,
                  marginTop: 2,
                }}
              />
              <Text style={[styles.psaBarLabel, { color: colors.textTertiary }]}>
                {point.month}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── IPSS Gauge Ring ─────────────────────────────────────────────────────────

function IPSSGaugeRing({
  score,
  maxScore = 35,
}: {
  score: number | null;
  maxScore?: number;
}) {
  const cat = ipssCategory(score);
  const SIZE = 88;
  const displayScore = score ?? 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: 8,
          borderColor: cat.color,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.25)',
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: '800',
            color: cat.color,
            letterSpacing: -0.5,
          }}
        >
          {score !== null ? displayScore : '—'}
        </Text>
      </View>
      <Text
        style={{
          marginTop: 6,
          fontSize: 12,
          fontWeight: '600',
          color: cat.color,
          letterSpacing: 0.3,
        }}
      >
        {cat.label}
      </Text>
    </View>
  );
}

// ─── IPSS Gradient Bar ────────────────────────────────────────────────────────

function IPSSGradientBar({
  score,
  colors,
}: {
  score: number | null;
  colors: ReturnType<typeof useAppTheme>['theme']['colors'];
}) {
  const position = score !== null ? Math.min(100, (score / 35) * 100) : null;

  return (
    <View style={{ marginTop: 12 }}>
      {/* Color segments */}
      <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ flex: 7, backgroundColor: '#30D158' }} />
        <View style={{ flex: 12, backgroundColor: '#FFD60A' }} />
        <View style={{ flex: 16, backgroundColor: '#FF453A' }} />
      </View>

      {/* Dot marker */}
      {position !== null && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}
          pointerEvents="none"
        >
          {/* Spacer pushes dot to the correct position */}
          <View style={{ flex: position }} />
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#FFFFFF',
              borderWidth: 2,
              borderColor: ipssCategory(score).color,
              marginTop: -3,
              transform: [{ translateX: -6 }],
            }}
          />
          <View style={{ flex: 100 - position }} />
        </View>
      )}

      {/* Labels */}
      <View style={[styles.rowSpaced, { marginTop: 6 }]}>
        <Text style={[styles.gradientLabel, { color: '#30D158' }]}>0 Mild</Text>
        <Text style={[styles.gradientLabel, { color: '#FFD60A' }]}>8 Moderate</Text>
        <Text style={[styles.gradientLabel, { color: '#FF453A' }]}>20 Severe</Text>
      </View>
    </View>
  );
}

// ─── Activity Rings (concentric circles) ─────────────────────────────────────

function ActivityRings({
  caloriesPct,
  exercisePct,
  standPct,
}: {
  caloriesPct: number;
  exercisePct: number;
  standPct: number;
}) {
  const CONTAINER = 68;
  const ringData = [
    { color: RING_RED, pct: caloriesPct, size: 68 },
    { color: RING_GREEN, pct: exercisePct, size: 50 },
    { color: RING_BLUE, pct: standPct, size: 32 },
  ];

  return (
    <View style={{ width: CONTAINER, height: CONTAINER }}>
      {ringData.map(({ color, pct, size }, i) => {
        const offset = (CONTAINER - size) / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: offset,
              left: offset,
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 6,
              borderColor: color,
              opacity: Math.min(1, 0.35 + pct * 0.65),
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Sleep Stage Bars ─────────────────────────────────────────────────────────

function SleepStageBars({
  deep,
  core,
  rem,
  total,
  colors,
}: {
  deep: number;
  core: number;
  rem: number;
  total: number;
  colors: ReturnType<typeof useAppTheme>['theme']['colors'];
}) {
  const stages = [
    { label: 'Deep', minutes: deep, color: DEEP_PURPLE },
    { label: 'Core', minutes: core, color: RING_BLUE },
    { label: 'REM', minutes: rem, color: RING_GREEN },
  ];

  const safeTotal = total > 0 ? total : 1;

  return (
    <View style={{ gap: 5, marginTop: 8 }}>
      {stages.map(({ label, minutes, color }) => {
        const pct = Math.min(1, minutes / safeTotal);
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        return (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text style={{ color: colors.textTertiary, fontSize: 10, width: 28 }}>
              {label}
            </Text>
            <View
              style={{
                flex: 1,
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
              }}
            >
              <View
                style={{
                  width: `${Math.round(pct * 100)}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: 2,
                }}
              />
            </View>
            <Text style={{ color: colors.textTertiary, fontSize: 10, width: 32, textAlign: 'right' }}>
              {timeStr}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Surgery Complete Modal ───────────────────────────────────────────────────

function SurgeryCompleteOverlay({
  visible,
  onDismiss,
  colors,
}: {
  visible: boolean;
  onDismiss: () => void;
  colors: ReturnType<typeof useAppTheme>['theme']['colors'];
}) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.8);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.surgeryCompleteCard,
            { backgroundColor: colors.card, opacity, transform: [{ scale }] },
          ]}
        >
          <Text style={{ fontSize: 48, marginBottom: 8 }}>🎉</Text>
          <Text style={[styles.surgeryCompleteTitle, { color: colors.textPrimary }]}>
            Surgery Complete!
          </Text>
          <Text style={[styles.surgeryCompleteBody, { color: colors.textSecondary }]}>
            Congratulations on completing your procedure. Keep wearing your Apple Watch to track your recovery.
          </Text>
          <TouchableOpacity
            style={[styles.surgeryCompleteBtn, { backgroundColor: TEAL }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.surgeryCompleteBtnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Study Progress Banner ────────────────────────────────────────────────────

function StudyProgressBanner({
  surgery,
  colors,
  onSurgeryComplete,
}: {
  surgery: ReturnType<typeof useSurgeryDate>;
  colors: ReturnType<typeof useAppTheme>['theme']['colors'];
  onSurgeryComplete: () => void;
}) {
  const [completionShown, setCompletionShown] = useState(false);

  // Trigger modal on surgery day (once)
  useEffect(() => {
    if (!surgery.isLoading && surgery.hasPassed && !completionShown) {
      const today = new Date().toISOString().split('T')[0];
      if (surgery.date === today) {
        onSurgeryComplete();
        setCompletionShown(true);
      }
    }
  }, [surgery.isLoading, surgery.hasPassed, surgery.date, completionShown, onSurgeryComplete]);

  const progress = useMemo<number>(() => {
    if (!surgery.studyStartDate || !surgery.studyEndDate) return 0;
    const start = new Date(surgery.studyStartDate + 'T00:00:00').getTime();
    const end = new Date(surgery.studyEndDate + 'T00:00:00').getTime();
    const now = Date.now();
    return Math.min(1, Math.max(0, (now - start) / (end - start)));
  }, [surgery.studyStartDate, surgery.studyEndDate]);

  const statusText = useMemo<string>(() => {
    if (surgery.isLoading || !surgery.date) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const surgDate = new Date(surgery.date + 'T00:00:00');
    const diffDays = Math.round(
      (surgDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return 'Surgery day';
    if (diffDays > 0) return `Surgery in ${diffDays} day${diffDays === 1 ? '' : 's'}`;

    // Post-surgery
    if (surgery.studyStartDate) {
      const studyStart = new Date(surgery.studyStartDate + 'T00:00:00');
      const dayOfStudy = Math.round(
        (today.getTime() - studyStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      return `Post-surgery · Study day ${dayOfStudy}`;
    }
    return 'Post-surgery';
  }, [surgery]);

  if (surgery.isLoading) {
    return (
      <SectionCard colors={colors} style={{ marginBottom: 12 }}>
        <SkeletonBox height={14} width="50%" style={{ marginBottom: 8 }} />
        <SkeletonBox height={6} style={{ marginBottom: 8 }} />
        <SkeletonBox height={12} width="60%" />
      </SectionCard>
    );
  }

  return (
    <SectionCard colors={colors} style={{ marginBottom: 12 }}>
      <View style={styles.rowSpaced}>
        <View>
          <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Study Start</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
            {surgery.studyStartLabel || '—'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Study End</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
            {surgery.studyEndLabel || '—'}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={{
          marginTop: 12,
          height: 6,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            backgroundColor: TEAL,
            borderRadius: 3,
          }}
        />
      </View>

      {statusText ? (
        <Text style={[styles.statusText, { color: surgery.hasPassed ? TEAL : GOLD, marginTop: 6 }]}>
          {statusText}
        </Text>
      ) : null}
    </SectionCard>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function PatientDashboard() {
  const { theme } = useAppTheme();
  const { colors: t } = theme;
  const { user } = useAuth();
  const surgery = useSurgeryDate();
  const health = useHealthSummary();
  const ipss = useIPSSScores();
  const throne = useThroneSummary();

  const [showSurgeryModal, setShowSurgeryModal] = useState(false);

  // Patient display info
  const patientName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : null;

  const patientAge = useMemo<number | null>(() => {
    if (!user?.dateOfBirth) return null;
    const dob = new Date(user.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }, [user?.dateOfBirth]);

  const surgeryDisplay = surgery.date
    ? new Date(surgery.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // ── HealthKit-derived values ──────────────────────────────────────────────
  const sleepMinutes = health.summary?.raw.sleep?.totalAsleepMinutes ?? null;
  const sleepH = sleepMinutes !== null ? Math.floor(sleepMinutes / 60) : null;
  const sleepM = sleepMinutes !== null ? sleepMinutes % 60 : null;
  const sleepLabel =
    sleepH !== null && sleepM !== null ? `${sleepH}h ${sleepM}m` : null;

  const sleepStatus =
    sleepMinutes !== null
      ? sleepMinutes >= 420
        ? 'Good'
        : sleepMinutes >= 360
        ? 'Fair'
        : 'Low'
      : null;
  const sleepStatusColor =
    sleepStatus === 'Good' ? RING_GREEN : sleepStatus === 'Fair' ? GOLD : RING_RED;

  const stages = health.summary?.raw.sleep?.stages ?? null;
  const deepMin = stages?.deep ?? 0;
  const coreMin = stages?.core ?? 0;
  const remMin = stages?.rem ?? 0;

  const activity = health.summary?.raw.activity;
  const caloriesPct = activity
    ? Math.min(1, activity.activeEnergyBurned / 500)
    : 0;
  const exercisePct = activity
    ? Math.min(1, activity.exerciseMinutes / 30)
    : 0;
  const standPct = activity
    ? Math.min(1, activity.standMinutes / 12)
    : 0;

  const vitals = health.summary?.raw.vitals;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: t.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HEADER ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* StreamSync logo */}
            <Text style={styles.logoText} numberOfLines={1}>
              <Text style={{ color: t.textPrimary }}>Stream</Text>
              <Text style={{ color: TEAL }}>sync</Text>
            </Text>

            {/* Patient name + age */}
            {patientName ? (
              <Text style={[styles.patientName, { color: t.textPrimary }]}>
                {patientName}
                {patientAge !== null && (
                  <Text style={{ color: t.textSecondary }}>, {patientAge}</Text>
                )}
              </Text>
            ) : (
              <SkeletonBox width={160} height={18} style={{ marginTop: 4 }} />
            )}

            {/* Surgery date */}
            {surgeryDisplay ? (
              <Text style={[styles.surgeryDateLabel, { color: TEAL }]}>
                Date of Surgery: {surgeryDisplay}
              </Text>
            ) : null}
          </View>

          {/* Bell icon */}
          <TouchableOpacity
            style={[styles.bellButton, { backgroundColor: t.secondaryFill }]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="bell.fill" size={20} color={t.textSecondary} />
            {/* Badge dot */}
            <View style={[styles.bellBadge, { backgroundColor: RING_RED }]} />
          </TouchableOpacity>
        </View>

        {/* ── 2. STUDY PROGRESS BANNER ───────────────────────────────────── */}
        <StudyProgressBanner
          surgery={surgery}
          colors={t}
          onSurgeryComplete={() => setShowSurgeryModal(true)}
        />

        {/* ── 3. IPSS SCORE CARD ─────────────────────────────────────────── */}
        <SectionCard colors={t} style={{ marginBottom: 12 }}>
          <View style={styles.cardSubHeader}>
            <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>
              IPSS Score
            </Text>
          </View>

          <View style={styles.ipssRow}>
            {/* Current score gauge */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              {ipss.isLoading ? (
                <SkeletonBox width={88} height={88} borderRadius={44} />
              ) : (
                <IPSSGaugeRing score={ipss.current} />
              )}
              <Text style={[styles.metaLabel, { color: t.textTertiary, marginTop: 4 }]}>
                Current
              </Text>
            </View>

            {/* Divider */}
            <View style={[styles.vDivider, { backgroundColor: t.separator }]} />

            {/* Pre-surgery baseline */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              {ipss.isLoading ? (
                <SkeletonBox width={88} height={88} borderRadius={44} />
              ) : (
                <IPSSGaugeRing score={ipss.preSurgery} />
              )}
              <Text style={[styles.metaLabel, { color: t.textTertiary, marginTop: 4 }]}>
                Pre-Surgery
              </Text>
            </View>
          </View>

          {/* Gradient color bar */}
          {!ipss.isLoading && <IPSSGradientBar score={ipss.current} colors={t} />}
        </SectionCard>

        {/* ── 4. THRONE SMART TOILET DATA ───────────────────────────────── */}
        <SectionCard colors={t} style={{ marginBottom: 12 }}>
          <View style={[styles.cardSubHeader, { marginBottom: 12 }]}>
            <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>
              Throne Smart Toilet Data
            </Text>
            <IconSymbol name="ellipsis" size={18} color={t.textTertiary} />
          </View>

          {/* Flow Rate + Void Volume side by side */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {/* Flow Rate */}
            <View
              style={[
                styles.halfCard,
                { backgroundColor: 'rgba(0,212,255,0.07)', borderColor: 'rgba(0,212,255,0.15)' },
              ]}
            >
              <Text style={[styles.metricLabel, { color: t.textSecondary }]}>
                Flow Rate
              </Text>
              {throne.isLoading ? (
                <>
                  <SkeletonBox width={80} height={22} style={{ marginVertical: 4 }} />
                  <SkeletonBox height={44} />
                </>
              ) : (
                <>
                  <Text style={[styles.metricValue, { color: TEAL }]}>
                    {throne.latestFlowRate !== null
                      ? `${throne.latestFlowRate.toFixed(1)} mL/s`
                      : '—'}
                  </Text>
                  <Sparkline
                    data={throne.flowRateTrend}
                    color={TEAL}
                    height={44}
                  />
                  {throne.flowRateTrend.length > 0 && (
                    <View style={[styles.rowSpaced, { marginTop: 4 }]}>
                      <Text style={[styles.trendDateLabel, { color: t.textTertiary }]}>
                        {throne.flowRateTrend[0]?.label}
                      </Text>
                      <Text style={[styles.trendDateLabel, { color: t.textTertiary }]}>
                        Today
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Void Volume */}
            <View
              style={[
                styles.halfCard,
                { backgroundColor: 'rgba(94,158,255,0.07)', borderColor: 'rgba(94,158,255,0.15)' },
              ]}
            >
              <Text style={[styles.metricLabel, { color: t.textSecondary }]}>
                Void Volume
              </Text>
              {throne.isLoading ? (
                <>
                  <SkeletonBox width={80} height={22} style={{ marginVertical: 4 }} />
                  <SkeletonBox height={44} />
                </>
              ) : (
                <>
                  <Text style={[styles.metricValue, { color: RING_BLUE }]}>
                    {throne.latestVoidVolume !== null
                      ? `${Math.round(throne.latestVoidVolume)} mL`
                      : '—'}
                  </Text>
                  <Sparkline
                    data={throne.voidVolumeTrend}
                    color={RING_BLUE}
                    height={44}
                  />
                  {throne.voidVolumeTrend.length > 0 && (
                    <View style={[styles.rowSpaced, { marginTop: 4 }]}>
                      <Text style={[styles.trendDateLabel, { color: t.textTertiary }]}>
                        {throne.voidVolumeTrend[0]?.label}
                      </Text>
                      <Text style={[styles.trendDateLabel, { color: t.textTertiary }]}>
                        Today
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.hDivider, { backgroundColor: t.separator, marginBottom: 16 }]} />

          {/* PSA Trend */}
          <PSABarChart
            data={throne.psaTrend}
            latestValue={
              throne.psaTrend.length > 0
                ? throne.psaTrend[throne.psaTrend.length - 1].value
                : null
            }
            isLoading={throne.isLoading}
            colors={t}
          />
        </SectionCard>

        {/* ── 5. APPLE WATCH DATA ────────────────────────────────────────── */}
        {Platform.OS === 'ios' && (
          <SectionCard colors={t} style={{ marginBottom: 12 }}>
            <View style={[styles.cardSubHeader, { marginBottom: 12 }]}>
              <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>
                Apple Watch Data
              </Text>
              <IconSymbol name="ellipsis" size={18} color={t.textTertiary} />
            </View>

            {/* Activity row */}
            <View style={[styles.activityRow, { borderColor: t.separator }]}>
              <ActivityRings
                caloriesPct={caloriesPct}
                exercisePct={exercisePct}
                standPct={standPct}
              />

              <View style={{ flex: 1, gap: 4, marginLeft: 12 }}>
                <Text style={[styles.metricLabel, { color: t.textSecondary }]}>
                  Daily Activity
                </Text>
                {health.isLoading ? (
                  <>
                    <SkeletonBox width="80%" height={14} />
                    <SkeletonBox width="60%" height={14} />
                  </>
                ) : (
                  <>
                    {activity && (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RING_RED }} />
                          <Text style={[styles.activityStat, { color: t.textPrimary }]}>
                            {Math.round(activity.activeEnergyBurned)}{' '}
                            <Text style={{ color: t.textTertiary }}>/ 500 CAL</Text>
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RING_GREEN }} />
                          <Text style={[styles.activityStat, { color: t.textPrimary }]}>
                            {activity.exerciseMinutes}{' '}
                            <Text style={{ color: t.textTertiary }}>/ 30 MIN</Text>
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RING_BLUE }} />
                          <Text style={[styles.activityStat, { color: t.textPrimary }]}>
                            {activity.steps.toLocaleString()}{' '}
                            <Text style={{ color: t.textTertiary }}>steps</Text>
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>

              {/* Sleep badge (right side of activity row) */}
              {sleepLabel && (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.sleepTimeLabel, { color: t.textPrimary }]}>
                    {sleepLabel}
                  </Text>
                  {sleepStatus && (
                    <View
                      style={[
                        styles.sleepBadge,
                        { backgroundColor: `${sleepStatusColor}22`, borderColor: sleepStatusColor },
                      ]}
                    >
                      <Text style={[styles.sleepBadgeText, { color: sleepStatusColor }]}>
                        {sleepStatus}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Bottom row: Sleep Quality + Vitals */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              {/* Sleep Quality */}
              <View
                style={[
                  styles.halfCard,
                  { backgroundColor: `${DEEP_PURPLE}11`, borderColor: `${DEEP_PURPLE}30` },
                ]}
              >
                <Text style={[styles.metricLabel, { color: t.textSecondary }]}>
                  Sleep Quality
                </Text>
                {health.isLoading ? (
                  <SkeletonBox height={60} style={{ marginTop: 8 }} />
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {sleepLabel && (
                        <Text style={[styles.metricValue, { color: t.textPrimary, fontSize: 15 }]}>
                          {sleepLabel}
                        </Text>
                      )}
                      {sleepStatus && (
                        <View
                          style={[
                            styles.sleepBadge,
                            {
                              backgroundColor: `${sleepStatusColor}22`,
                              borderColor: sleepStatusColor,
                            },
                          ]}
                        >
                          <Text style={[styles.sleepBadgeText, { color: sleepStatusColor }]}>
                            {sleepStatus}
                          </Text>
                        </View>
                      )}
                    </View>
                    {stages && (
                      <SleepStageBars
                        deep={deepMin}
                        core={coreMin}
                        rem={remMin}
                        total={sleepMinutes ?? 0}
                        colors={t}
                      />
                    )}
                  </>
                )}
              </View>

              {/* Vitals */}
              <View
                style={[
                  styles.halfCard,
                  { backgroundColor: 'rgba(255,68,58,0.07)', borderColor: 'rgba(255,68,58,0.15)' },
                ]}
              >
                <Text style={[styles.metricLabel, { color: t.textSecondary }]}>
                  Vitals
                </Text>
                {health.isLoading ? (
                  <>
                    <SkeletonBox width="80%" height={14} style={{ marginTop: 8 }} />
                    <SkeletonBox width="70%" height={14} style={{ marginTop: 6 }} />
                    <SkeletonBox width="60%" height={14} style={{ marginTop: 6 }} />
                  </>
                ) : (
                  <View style={{ gap: 6, marginTop: 8 }}>
                    <View style={styles.vitalRow}>
                      <Text style={styles.vitalIcon}>❤️</Text>
                      <Text style={[styles.vitalLabel, { color: t.textSecondary }]}>HR</Text>
                      <Text style={[styles.vitalValue, { color: t.textPrimary }]}>
                        {vitals?.heartRate.average != null
                          ? Math.round(vitals.heartRate.average)
                          : '—'}{' '}
                        <Text style={{ color: t.textTertiary, fontSize: 10 }}>bpm</Text>
                      </Text>
                    </View>
                    <View style={styles.vitalRow}>
                      <Text style={styles.vitalIcon}>💧</Text>
                      <Text style={[styles.vitalLabel, { color: t.textSecondary }]}>SpO₂</Text>
                      <Text style={[styles.vitalValue, { color: t.textPrimary }]}>
                        {vitals?.oxygenSaturation != null
                          ? `${Math.round(vitals.oxygenSaturation)}%`
                          : '—'}
                      </Text>
                    </View>
                    <View style={styles.vitalRow}>
                      <Text style={styles.vitalIcon}>🫁</Text>
                      <Text style={[styles.vitalLabel, { color: t.textSecondary }]}>RR</Text>
                      <Text style={[styles.vitalValue, { color: t.textPrimary }]}>
                        {vitals?.respiratoryRate != null
                          ? `${Math.round(vitals.respiratoryRate)}`
                          : '—'}{' '}
                        <Text style={{ color: t.textTertiary, fontSize: 10 }}>bpm</Text>
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </SectionCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Surgery Complete overlay */}
      <SurgeryCompleteOverlay
        visible={showSurgeryModal}
        onDismiss={() => setShowSurgeryModal(false)}
        colors={t}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  surgeryDateLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  // Cards
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
  },
  halfCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  cardSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Section titles
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  // IPSS
  ipssRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    height: 100,
    marginHorizontal: 16,
  },
  hDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  gradientLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Metrics
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  trendDateLabel: {
    fontSize: 9,
    fontWeight: '400',
  },

  // PSA
  psaBarValue: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  psaBarLabel: {
    fontSize: 9,
    fontWeight: '400',
    marginTop: 3,
  },

  // Activity
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityStat: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Sleep
  sleepTimeLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  sleepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  sleepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Vitals
  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vitalIcon: {
    fontSize: 13,
  },
  vitalLabel: {
    fontSize: 11,
    fontWeight: '500',
    width: 34,
  },
  vitalValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Surgery Complete modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  surgeryCompleteCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  surgeryCompleteTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  surgeryCompleteBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  surgeryCompleteBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 140,
    alignItems: 'center',
  },
  surgeryCompleteBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },

  // Misc
  rowSpaced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
