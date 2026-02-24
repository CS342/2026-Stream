/**
 * Clinical Notes → Firebase Storage sync pipeline.
 *
 * Pulls HKClinicalTypeIdentifierClinicalNoteRecord documents from Apple
 * HealthKit, extracts the embedded FHIR DocumentReference attachment
 * (typically a PDF or plain text), uploads the raw file to Firebase Storage,
 * and writes lightweight metadata to Firestore.
 *
 * Data model
 * ──────────
 *   Firebase Storage:
 *     users/{uid}/clinical-notes/{noteId}
 *       — raw document bytes (content-type preserved from FHIR attachment)
 *
 *   Firestore:
 *     users/{uid}/clinicalNotes/{noteId}
 *       displayName, startDate, endDate, contentType, title?,
 *       storageRef, fhirResourceType?, fhirSourceURL?,
 *       medgemmaStatus, uploadedAt
 *
 * Idempotency
 * ───────────
 *   Before uploading, the pipeline checks whether the Firestore metadata doc
 *   already exists (keyed on the HealthKit UUID). Re-running is safe and cheap.
 *
 * MedGemma pipeline hook
 * ──────────────────────
 *   Every uploaded note is written with medgemmaStatus = 'pending'.
 *   The end-of-study batch job queries:
 *     where('medgemmaStatus', '==', 'pending')
 *   downloads from Storage, runs MedGemma, and updates to 'complete'.
 */

import { Platform } from 'react-native';
import { getApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { getClinicalNotes } from '@/lib/services/healthkit';
import type { ClinicalRecord } from '@/lib/services/healthkit';
import { db, getAuth } from './firestore';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SyncClinicalNotesResult {
  ok: boolean;
  uploaded: number;
  skipped: number;
  error?: string;
}

interface FhirAttachment {
  data?: string;        // base64-encoded document bytes
  contentType?: string; // e.g. "application/pdf", "text/plain"
  title?: string;
  size?: number;        // bytes (unencoded)
  url?: string;         // present when data is not embedded
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts the first attachment from a FHIR DocumentReference resource.
 * Returns null if the resource is missing or malformed.
 */
function extractAttachment(
  fhirResource: Record<string, unknown> | undefined,
): FhirAttachment | null {
  if (!fhirResource) return null;

  const content = fhirResource['content'] as
    | Array<{ attachment?: Record<string, unknown> }>
    | undefined;

  if (!Array.isArray(content) || content.length === 0) return null;

  const raw = content[0]?.attachment;
  if (!raw) return null;

  return {
    data: raw['data'] as string | undefined,
    contentType: raw['contentType'] as string | undefined,
    title: raw['title'] as string | undefined,
    size: raw['size'] as number | undefined,
    url: raw['url'] as string | undefined,
  };
}

// ── syncClinicalNotes ─────────────────────────────────────────────────────────

/**
 * Syncs all available clinical notes for the signed-in user.
 *
 * Notes with no embedded attachment data (url-only references) are skipped
 * because HealthKit only vends embedded content — there is no way to resolve
 * the external URL from within the app.
 */
export async function syncClinicalNotes(): Promise<SyncClinicalNotesResult> {
  if (Platform.OS !== 'ios') {
    return { ok: true, uploaded: 0, skipped: 0 };
  }

  const uid = getAuth().currentUser?.uid;
  if (!uid) {
    return {
      ok: false,
      uploaded: 0,
      skipped: 0,
      error: 'no-auth: user is not signed in',
    };
  }

  try {
    console.log('[ClinicalNotes] Starting sync…');
    const notes: ClinicalRecord[] = await getClinicalNotes();
    console.log(`[ClinicalNotes] Found ${notes.length} note(s) in HealthKit`);

    if (notes.length === 0) {
      return { ok: true, uploaded: 0, skipped: 0 };
    }

    const storage = getStorage(getApp());
    let uploaded = 0;
    let skipped = 0;

    for (const note of notes) {
      // ── Idempotency check ────────────────────────────────────────────────
      const metaRef = doc(db, `users/${uid}/clinicalNotes/${note.id}`);
      const existing = await getDoc(metaRef);
      if (existing.exists()) {
        skipped++;
        continue;
      }

      // ── Extract attachment ───────────────────────────────────────────────
      const attachment = extractAttachment(note.fhirResource);

      if (!attachment?.data) {
        // Note has no embedded data (url-only or missing FHIR resource)
        console.warn(
          `[ClinicalNotes] Note ${note.id} ("${note.displayName}") has no embedded attachment — skipping`,
        );
        skipped++;
        continue;
      }

      // ── Upload to Firebase Storage ───────────────────────────────────────
      const storagePath = `users/${uid}/clinical-notes/${note.id}`;
      const storageRef = ref(storage, storagePath);
      const contentType = attachment.contentType ?? 'application/pdf';

      await uploadString(storageRef, attachment.data, 'base64', {
        contentType,
        customMetadata: {
          noteId: note.id,
          displayName: note.displayName,
          fhirSourceURL: note.fhirSourceURL ?? '',
        },
      });

      console.log(
        `[ClinicalNotes] Uploaded ${storagePath} (${contentType}, ~${attachment.size ?? '?'} bytes)`,
      );

      // ── Write metadata to Firestore ──────────────────────────────────────
      // The full document lives in Storage; Firestore holds only lightweight
      // metadata plus the medgemmaStatus field for the end-of-study pipeline.
      await setDoc(metaRef, {
        displayName: note.displayName,
        startDate: Timestamp.fromDate(new Date(note.startDate)),
        endDate: Timestamp.fromDate(new Date(note.endDate)),
        contentType,
        title: attachment.title ?? null,
        storageRef: storagePath,
        fhirResourceType: note.fhirResourceType ?? null,
        fhirSourceURL: note.fhirSourceURL ?? null,
        // End-of-study MedGemma pipeline reads all docs where this == 'pending'
        medgemmaStatus: 'pending',
        uploadedAt: serverTimestamp(),
      });

      uploaded++;
    }

    console.log(
      `[ClinicalNotes] Sync complete — uploaded: ${uploaded}, skipped: ${skipped}`,
    );
    return { ok: true, uploaded, skipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ClinicalNotes] syncClinicalNotes error:', message);
    return { ok: false, uploaded: 0, skipped: 0, error: message };
  }
}
