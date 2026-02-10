// --- Types ---

export type CheckpointType = 'YES_NO' | 'FREE_TEXT';

export interface FlowStep {
  id: string;
  botMessage: string;
  checkpoint?: {
    question: string;
    type: CheckpointType;
    onYes: string; // next step id, or 'DONE'
    onNo: {
      hint: string;
      retryStepId: string;
    };
  };
}

export interface GuidedFlow {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
}

export interface QuickAction {
  label: string;
  flowId: string | null;
  comingSoon?: boolean;
}

export interface IntentPattern {
  id: string;
  patterns: RegExp[];
  response: string;
  type: 'medical_refusal' | 'throne_coming_soon';
}

// --- Data ---

export const GREETING =
  "Hi there! I'm your setup assistant for the HomeFlow study. I can help you set up your Apple Watch, troubleshoot syncing, or answer questions about the app. What would you like help with?";

export const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Set up Apple Watch', flowId: 'apple-watch-setup' },
  { label: 'Fix syncing', flowId: 'fix-syncing' },
  { label: 'Throne setup', flowId: null, comingSoon: true },
];

export const GUIDED_FLOWS: Record<string, GuidedFlow> = {
  'apple-watch-setup': {
    id: 'apple-watch-setup',
    name: 'Apple Watch Setup',
    description: 'Walk through pairing your Apple Watch and enabling Health data sharing.',
    steps: [
      {
        id: 'aw-1',
        botMessage:
          "Let's get your Apple Watch set up with HomeFlow. First, we need to make sure your watch is paired with your iPhone.",
        checkpoint: {
          question: 'Is your Apple Watch currently paired with your iPhone?',
          type: 'YES_NO',
          onYes: 'aw-3',
          onNo: {
            hint: 'No worries. Open the Settings app on your iPhone, tap Bluetooth, and make sure it\'s turned on. Then open the Watch app on your iPhone and follow the on-screen instructions to pair your Apple Watch. Let me know when you\'re ready to try again.',
            retryStepId: 'aw-1',
          },
        },
      },
      // aw-2 is skipped (reserved for future expansion)
      {
        id: 'aw-3',
        botMessage:
          "Great — your watch is paired. Now let's make sure the Health app is accessible on your iPhone.",
        checkpoint: {
          question: 'Can you open the Health app on your iPhone?',
          type: 'YES_NO',
          onYes: 'aw-5',
          onNo: {
            hint: 'The Health app comes pre-installed on every iPhone. Look for a white icon with a red heart. If you can\'t find it, try swiping down on your Home Screen and searching for "Health." Let me know once you have it open.',
            retryStepId: 'aw-3',
          },
        },
      },
      {
        id: 'aw-5',
        botMessage:
          "Now let's enable data sharing so HomeFlow can read your health data. In the Health app, tap your profile picture in the top-right corner, then tap \"Apps\" and find HomeFlow. Turn on all the data categories listed (steps, heart rate, sleep, and active energy).",
        checkpoint: {
          question: 'Did you turn on the data categories for HomeFlow?',
          type: 'YES_NO',
          onYes: 'DONE',
          onNo: {
            hint: 'That\'s okay. Open the Health app → tap your profile picture (top-right) → tap "Apps" → tap "HomeFlow." You should see a list of data categories with toggles. Turn them all on, then let me know.',
            retryStepId: 'aw-5',
          },
        },
      },
    ],
  },
  'fix-syncing': {
    id: 'fix-syncing',
    name: 'Fix Syncing',
    description: 'Troubleshoot Apple Watch or Health data syncing issues.',
    steps: [
      {
        id: 'sync-1',
        botMessage:
          "Let's troubleshoot your syncing issue. First, make sure your Apple Watch is on your wrist and unlocked.",
        checkpoint: {
          question: 'Is your Apple Watch on your wrist and unlocked?',
          type: 'YES_NO',
          onYes: 'sync-3',
          onNo: {
            hint: 'Put your Apple Watch on your wrist and tap the screen or press the side button to wake it. Enter your passcode if prompted. Let me know when it\'s on and unlocked.',
            retryStepId: 'sync-1',
          },
        },
      },
      {
        id: 'sync-3',
        botMessage:
          'Good. Now try opening the Health app on your iPhone and pulling down on the Summary screen to refresh your data.',
        checkpoint: {
          question: 'Do you see updated data in the Health app?',
          type: 'YES_NO',
          onYes: 'DONE',
          onNo: {
            hint: 'Try restarting both your Apple Watch (press and hold the side button → Power Off → turn back on) and your iPhone. After they restart, open the Health app again and pull down to refresh. This usually resolves syncing delays.',
            retryStepId: 'sync-3',
          },
        },
      },
    ],
  },
};

export const INTENT_PATTERNS: IntentPattern[] = [
  {
    id: 'medical-refusal',
    patterns: [
      /symptom/i,
      /diagnos/i,
      /\bnormal\b/i,
      /worry/i,
      /\bpain\b/i,
      /blood/i,
      /\bhurt/i,
      /medication/i,
      /treatment/i,
      /side effect/i,
      /prescri/i,
      /dosage/i,
    ],
    response:
      "I'm not able to provide medical advice. Please reach out to your care team or physician for health-related questions. I'm here to help with device setup and syncing — would you like help with that?",
    type: 'medical_refusal',
  },
  {
    id: 'throne-coming-soon',
    patterns: [
      /throne/i,
      /uroflow/i,
      /toilet/i,
      /void.*device/i,
      /flow.*sensor/i,
    ],
    response:
      'Throne setup guidance is coming soon. For now, please follow the instructions included with your device or from your study team. I can help you set up your Apple Watch or Apple Health in the meantime.',
    type: 'throne_coming_soon',
  },
];

export const FLOW_COMPLETE_MESSAGE =
  "You're all set! Everything looks good. If you run into any issues later, just come back here and I can help you troubleshoot.";

export const FOLLOW_UP_PROMPT = 'Is there anything else I can help with?';
export const FAREWELL_MESSAGE =
  "Sounds good! I'll be right here whenever you need me.";
export const FOLLOW_UP_YES_MESSAGE =
  "Of course! Let's see what else I can help with.";

export const CONCIERGE_SYSTEM_PROMPT = `You are a calm, friendly setup concierge for the HomeFlow app, part of a BPH (benign prostatic hyperplasia) research study at Stanford.

Your role:
- Help users set up their Apple Watch and Apple Health with the HomeFlow app
- Answer questions about the app, the study schedule, and how data collection works
- Keep responses short (2-3 sentences), calm, and easy to read

Rules you must follow:
- Never provide medical advice of any kind. If asked about symptoms, diagnoses, medications, or treatments, say: "I'm not able to provide medical advice. Please reach out to your care team."
- If asked about Throne or uroflow devices, say: "Throne setup guidance is coming soon. Please follow the instructions from your study team."
- Never mention Apple Health UI details like rings, goals, or badges
- Never speculate about the user's health condition
- Stay focused on setup, syncing, and app usage`;
