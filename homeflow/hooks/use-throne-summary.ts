/**
 * Throne Summary Hook
 *
 * Fetches the last 7 days of Throne uroflow sessions and computes:
 *   - Latest average flow rate (mL/s)
 *   - Latest voided volume (mL)
 *   - 7-day daily averages for sparkline charts
 *
 * Also reads PSA trend data from Firestore (users/{uid}/psa_measurements),
 * returning an empty array gracefully when the collection doesn't exist.
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/src/services/firebase';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchSessions, fetchMetricsBatch } from '@/src/services/throneFirestore';
import { parseSessionWithMetrics, type ParsedVoidSession } from '@/src/data/parseVoidingSession';

export interface TrendPoint {
  label: string;
  value: number;
}

export interface PSATrendPoint {
  /** Short month label e.g. "Oct" */
  month: string;
  /** PSA value in ng/mL */
  value: number;
}

export interface ThroneSummaryData {
  latestFlowRate: number | null;
  latestVoidVolume: number | null;
  /** Daily average flow rate for the last 7 days (oldest first) */
  flowRateTrend: TrendPoint[];
  /** Daily average void volume for the last 7 days (oldest first) */
  voidVolumeTrend: TrendPoint[];
  /** PSA results over the last 6 months (oldest first) */
  psaTrend: PSATrendPoint[];
  isLoading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildTrend(
  sessions: ParsedVoidSession[],
  key: 'avgFlowRate' | 'voidedVolume',
): TrendPoint[] {
  const map = new Map<string, number[]>();
  for (const s of sessions) {
    const val = s[key];
    if (val === null) continue;
    const label = dayLabel(s.timestamp);
    const arr = map.get(label) ?? [];
    arr.push(val);
    map.set(label, arr);
  }
  return Array.from(map.entries())
    .map(([label, vals]) => ({
      label,
      value: vals.reduce((a, b) => a + b, 0) / vals.length,
    }))
    .reverse(); // oldest → newest
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useThroneSummary(): ThroneSummaryData {
  const { user } = useAuth();
  const [data, setData] = useState<ThroneSummaryData>({
    latestFlowRate: null,
    latestVoidVolume: null,
    flowRateTrend: [],
    voidVolumeTrend: [],
    psaTrend: [],
    isLoading: true,
  });

  useEffect(() => {
    if (!user?.id) {
      setData((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    let cancelled = false;

    async function fetchData() {
      try {
        // ── Uroflow sessions ──────────────────────────────────────────────
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [sessions, psaSnap] = await Promise.all([
          fetchSessions({ userId: user!.id, startDate: sevenDaysAgo }),
          // ── PSA measurements (separate Firestore collection) ────────────
          getDocs(
            query(
              collection(db, 'psa_measurements'),
              where('userId', '==', user!.id),
              orderBy('measuredAt', 'asc'),
              limit(6),
            ),
          ).catch(() => null), // collection may not exist
        ]);

        if (cancelled) return;

        // Parse uroflow
        let parsedSessions: ParsedVoidSession[] = [];
        if (sessions.length > 0) {
          const metrics = await fetchMetricsBatch(sessions.map((s) => s.id));
          if (cancelled) return;

          const metricsBySession = new Map<string, typeof metrics>();
          for (const m of metrics) {
            const arr = metricsBySession.get(m.sessionId) ?? [];
            arr.push(m);
            metricsBySession.set(m.sessionId, arr);
          }

          parsedSessions = sessions.map((s) =>
            parseSessionWithMetrics(s, metricsBySession.get(s.id) ?? []),
          );
        }

        // Latest values from most recent session
        const latestFlowRate = parsedSessions[0]?.avgFlowRate ?? null;
        const latestVoidVolume = parsedSessions[0]?.voidedVolume ?? null;

        // Build sparkline trends
        const flowRateTrend = buildTrend(parsedSessions, 'avgFlowRate');
        const voidVolumeTrend = buildTrend(parsedSessions, 'voidedVolume');

        // PSA trend
        const psaTrend: PSATrendPoint[] = psaSnap
          ? psaSnap.docs.map((d) => {
              const raw = d.data() as { measuredAt?: string; value?: number; month?: string };
              const month = raw.month ?? (raw.measuredAt
                ? new Date(raw.measuredAt).toLocaleDateString('en-US', { month: 'short' })
                : '');
              return { month, value: raw.value ?? 0 };
            })
          : [];

        if (!cancelled) {
          setData({
            latestFlowRate,
            latestVoidVolume,
            flowRateTrend,
            voidVolumeTrend,
            psaTrend,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setData((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return data;
}
