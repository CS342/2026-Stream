/**
 * IPSS Scores Hook
 *
 * Reads the International Prostate Symptom Score (IPSS) from Firestore.
 * Returns the most recent post-surgery score and the pre-surgery baseline.
 * Gracefully returns null when data is unavailable.
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

export interface IPSSScoreData {
  /** Most recent IPSS total score (0–35). null if unavailable. */
  current: number | null;
  /** Pre-surgery baseline score. null if unavailable. */
  preSurgery: number | null;
  isLoading: boolean;
}

/** Classify a score into a severity label and color. */
export function ipssCategory(score: number | null): {
  label: string;
  color: string;
} {
  if (score === null) return { label: '—', color: '#8E8E93' };
  if (score <= 7) return { label: 'Mild', color: '#30D158' };
  if (score <= 19) return { label: 'Moderate', color: '#FFD60A' };
  return { label: 'Severe', color: '#FF453A' };
}

export function useIPSSScores(): IPSSScoreData {
  const { user } = useAuth();
  const [data, setData] = useState<IPSSScoreData>({
    current: null,
    preSurgery: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!user?.id) {
      setData({ current: null, preSurgery: null, isLoading: false });
      return;
    }

    let cancelled = false;

    async function fetchScores() {
      try {
        const responsesRef = collection(db, 'questionnaire_responses');
        const q = query(
          responsesRef,
          where('userId', '==', user!.id),
          where('questionnaireId', '==', 'ipss'),
          orderBy('completedAt', 'desc'),
          limit(20),
        );

        const snap = await getDocs(q);
        if (cancelled) return;

        const responses = snap.docs.map((d) => d.data() as {
          totalScore?: number;
          score?: number;
          phase?: string;
          completedAt?: unknown;
        });

        // Partition by phase (pre vs post surgery)
        const postResponses = responses.filter((r) => r.phase === 'post_surgery');
        const preResponses = responses.filter(
          (r) => r.phase === 'pre_surgery' || !r.phase,
        );

        const scoreOf = (r: typeof responses[0]) =>
          typeof r.totalScore === 'number'
            ? r.totalScore
            : typeof r.score === 'number'
            ? r.score
            : null;

        const current = postResponses.length > 0
          ? scoreOf(postResponses[0])
          : responses.length > 0
          ? scoreOf(responses[0])
          : null;

        const preSurgery = preResponses.length > 0
          ? scoreOf(preResponses[preResponses.length - 1])
          : null;

        if (!cancelled) {
          setData({ current, preSurgery, isLoading: false });
        }
      } catch {
        if (!cancelled) {
          setData({ current: null, preSurgery: null, isLoading: false });
        }
      }
    }

    fetchScores();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return data;
}
