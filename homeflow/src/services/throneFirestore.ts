/**
 * Firestore read service for Throne uroflow data.
 *
 * Reads sessions and metrics from Firestore collections
 * written by the Cloud Function ingestion pipeline.
 */

import {
  collection,
  query,
  where,
  getDocs,
  QueryConstraint,
} from "firebase/firestore";
import {db} from "./firebase";

// Re-export the same types the mock module used, for compatibility
export interface ThroneSession {
  id: string;
  studyId: string;
  tags: string[];
  created: string;
  updated: string;
  startTs: string;
  endTs: string;
  deviceId: string;
  userId: string;
  status: string;
  metricCount: number;
}

export interface ThroneMetric {
  id: string;
  studyId: string;
  sessionId: string;
  ts: string;
  created: string;
  updated: string;
  deleted: string | null;
  type: string;
  value: number | string;
  series: string;
  durationMicros: number;
}

/**
 * Fetch all sessions from Firestore.
 * Sorting and date range filtering done client-side.
 */
export async function fetchSessions(opts?: {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<ThroneSession[]> {
  const constraints: QueryConstraint[] = [];

  if (opts?.userId) {
    constraints.push(where("userId", "==", opts.userId));
  }

  const q = query(collection(db, "sessions"), ...constraints);
  const snap = await getDocs(q);

  let sessions = snap.docs.map((doc) => doc.data() as ThroneSession);

  // Client-side date filtering
  if (opts?.startDate || opts?.endDate) {
    const startMs = opts.startDate?.getTime() ?? 0;
    const endMs = opts.endDate?.getTime() ?? Infinity;
    sessions = sessions.filter((s) => {
      const ts = new Date(s.startTs).getTime();
      return ts >= startMs && ts <= endMs;
    });
  }

  // Sort descending by startTs
  sessions.sort((a, b) => new Date(b.startTs).getTime() - new Date(a.startTs).getTime());

  return sessions;
}

/**
 * Fetch all metrics for a given session, sorted by timestamp ascending.
 */
export async function fetchMetricsForSession(
  sessionId: string,
): Promise<ThroneMetric[]> {
  const q = query(
    collection(db, "metrics"),
    where("sessionId", "==", sessionId),
  );

  const snap = await getDocs(q);
  const metrics = snap.docs.map((doc) => doc.data() as ThroneMetric);

  // Sort ascending by timestamp client-side
  metrics.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  return metrics;
}
