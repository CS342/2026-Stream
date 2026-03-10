/**
 * useThroneUserId
 *
 * Reads the Throne-internal user ID for the signed-in Firebase user.
 * The Throne userId is stored in users/{uid}.throneUserId by the study
 * coordinator during participant enrollment.
 *
 * This ID is used to filter Firestore session queries so each user only
 * sees their own uroflow data.
 */

import { useState, useEffect } from 'react';
import { fetchThroneUserId } from '@/src/services/throneFirestore';

interface ThroneUserIdState {
  /** The Throne-internal user ID, or null if not yet enrolled / not found */
  throneUserId: string | null;
  /** True while the Firestore read is in flight */
  isLoading: boolean;
}

export function useThroneUserId(uid: string | null): ThroneUserIdState {
  const [state, setState] = useState<ThroneUserIdState>({
    throneUserId: null,
    isLoading: uid !== null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ throneUserId: null, isLoading: false });
      return;
    }

    let cancelled = false;
    setState({ throneUserId: null, isLoading: true });

    fetchThroneUserId(uid).then((id) => {
      if (!cancelled) setState({ throneUserId: id, isLoading: false });
    }).catch(() => {
      if (!cancelled) setState({ throneUserId: null, isLoading: false });
    });

    return () => { cancelled = true; };
  }, [uid]);

  return state;
}
