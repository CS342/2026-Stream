/**
 * Consent Document
 *
 * Informed consent text for the HomeFlow BPH study.
 * Structured for display in the consent screen.
 *
 * Note: This is a template - actual consent text should be
 * reviewed and approved by your IRB.
 */

import { STUDY_INFO, CONSENT_VERSION } from '../constants';

/**
 * Section of the consent document
 */
export interface ConsentSection {
  id: string;
  title: string;
  content: string;
  required?: boolean; // Must scroll through to proceed
}

/**
 * Full consent document structure
 */
export interface ConsentDocument {
  version: string;
  title: string;
  studyName: string;
  institution: string;
  principalInvestigator: string;
  irbProtocol: string;
  sections: ConsentSection[];
  signatureRequired: boolean;
}

/**
 * HomeFlow study consent document
 */
export const CONSENT_DOCUMENT: ConsentDocument = {
  version: CONSENT_VERSION,
  title: 'Informed Consent',
  studyName: STUDY_INFO.name,
  institution: STUDY_INFO.institution,
  principalInvestigator: STUDY_INFO.principalInvestigator,
  irbProtocol: STUDY_INFO.irbProtocol,
  signatureRequired: true,

  sections: [
    {
      id: 'overview',
      title: 'Study Overview',
      required: true,
      content: `You are being asked to participate in a research study. This document provides important information about the study, including its purpose, what participation involves, and the risks and benefits.

**Study Title:** ${STUDY_INFO.name}

**Principal Investigator:** ${STUDY_INFO.principalInvestigator}

**Institution:** ${STUDY_INFO.institution}

**IRB Protocol:** ${STUDY_INFO.irbProtocol}

Please read this information carefully and take as much time as you need. You may ask questions at any time by contacting the research team.`,
    },
    {
      id: 'purpose',
      title: 'Purpose of the Study',
      required: true,
      content: `The purpose of this research study is to understand how voiding patterns, physical activity, and sleep change before and after bladder outlet surgery for benign prostatic hyperplasia (BPH).

By collecting data passively using your iPhone, Apple Watch, and optional Throne uroflowmetry device, we hope to:

- Better understand recovery patterns after BPH surgery
- Identify factors that predict surgical outcomes
- Develop tools to help patients and doctors monitor recovery

This study will enroll approximately 100 participants over 2 years.`,
    },
    {
      id: 'procedures',
      title: 'Study Procedures',
      required: true,
      content: `If you agree to participate, you will be asked to:

**During Enrollment (Today)**
- Complete eligibility screening
- Provide informed consent (this document)
- Share access to Apple Health data
- Optionally connect your Throne device
- Complete a baseline symptom questionnaire (IPSS)

**During the Study (6 months)**
- Allow the app to passively collect health data:
  - Step count and activity levels
  - Sleep duration and patterns
  - Heart rate (if available)
  - Voiding data from Throne (if connected)
- Complete brief symptom surveys periodically (about 5 minutes each)
- Continue using your devices normally

**What We Collect**
- Health data from Apple Watch and iPhone
- Uroflow measurements from Throne (optional)
- Survey responses about your symptoms
- Basic demographic information`,
    },
    {
      id: 'risks',
      title: 'Risks and Discomforts',
      required: true,
      content: `**Minimal Physical Risk**
This study involves no physical interventions. You will continue your normal medical care.

**Privacy Risk**
There is a risk that your personal health information could be accessed by unauthorized individuals. We take extensive measures to protect your data (see Privacy section).

**Time and Inconvenience**
Completing surveys takes a small amount of time. The app runs in the background and should not interfere with normal phone use.

**Emotional Discomfort**
Some participants may feel uncomfortable answering questions about urinary symptoms. You may skip any question you prefer not to answer.`,
    },
    {
      id: 'benefits',
      title: 'Benefits',
      required: true,
      content: `**Potential Benefits to You**
- Track your symptoms and recovery over time
- Receive personalized insights about your health patterns
- Contribute to research that may help future patients

**Benefits to Society**
- Improve understanding of BPH surgery outcomes
- Help develop better monitoring tools for patients
- Advance scientific knowledge in urology`,
    },
    {
      id: 'privacy',
      title: 'Privacy and Data Protection',
      required: true,
      content: `**How We Protect Your Data**
- All data is encrypted in transit and at rest
- Data is stored on secure, HIPAA-compliant servers
- Your identity is separated from your health data
- Only authorized researchers can access study data

**What We Share**
- De-identified data may be shared with other researchers
- We will never sell your data
- We will never share identifiable data without your permission

**Your Rights**
- You can request a copy of your data at any time
- You can request deletion of your data
- You can withdraw from the study at any time

**Data Retention**
- Study data will be retained for 7 years after study completion
- After this period, data will be securely destroyed`,
    },
    {
      id: 'compensation',
      title: 'Compensation',
      required: false,
      content: `There is no direct compensation for participating in this study. However, you will receive:

- Free access to the HomeFlow app during the study
- Personalized health insights based on your data
- Summary of your symptom trends over time

If you are injured as a result of being in this study, ${STUDY_INFO.institution} does not have a program to compensate you.`,
    },
    {
      id: 'voluntary',
      title: 'Voluntary Participation',
      required: true,
      content: `Your participation in this study is completely voluntary.

- You may choose not to participate
- You may withdraw at any time without penalty
- Withdrawing will not affect your medical care
- You may skip any questions you don't want to answer

To withdraw from the study, contact the research team or use the "Withdraw from Study" option in the app settings.`,
    },
    {
      id: 'contact',
      title: 'Contact Information',
      required: true,
      content: `**Questions About the Study**
Contact the research team:
- Email: ${STUDY_INFO.contactEmail}
- Phone: ${STUDY_INFO.contactPhone}

**Questions About Your Rights as a Participant**
Contact the ${STUDY_INFO.institution} Institutional Review Board (IRB):
- Protocol Number: ${STUDY_INFO.irbProtocol}

**Medical Concerns**
For any medical concerns, contact your healthcare provider directly.`,
    },
  ],
};

/**
 * Get consent sections that require reading
 */
export function getRequiredSections(): ConsentSection[] {
  return CONSENT_DOCUMENT.sections.filter((s) => s.required);
}

/**
 * Get all consent sections
 */
export function getAllSections(): ConsentSection[] {
  return CONSENT_DOCUMENT.sections;
}

/**
 * Generate a summary of consent for confirmation
 */
export function getConsentSummary(): string {
  return `By signing below, I confirm that:

- I have read and understood the consent document
- I have had the opportunity to ask questions
- I understand the risks and benefits of participation
- I understand I can withdraw at any time
- I agree to participate in the ${STUDY_INFO.name}

Version: ${CONSENT_VERSION}`;
}
