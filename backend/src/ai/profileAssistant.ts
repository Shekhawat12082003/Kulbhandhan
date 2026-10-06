import { aiClient, aiIsLive } from './aiClient';
import { AppError } from '../utils/errors';

const FIELD_LABEL: Record<string, string> = {
  about: 'a warm, honest "About Me" section for a matrimonial profile',
  familyIntro: 'a respectful family introduction for a matrimonial profile',
  partnerExpectations: 'a clear description of partner expectations for a matrimonial profile',
  professional: 'a concise professional description for a matrimonial profile',
};

const SYSTEM = `You write short matrimonial-profile text (2-4 sentences) using ONLY the facts the user gives you. Never invent a job, degree, income, family detail, or achievement not explicitly provided. If given facts are sparse, write briefly rather than padding with invented detail. Plain text only, no headings.`;

/** The AI may only rephrase supplied facts; it must never add unstated information. Client still requires the user's approval before saving. */
export async function assistProfileText(field: keyof typeof FIELD_LABEL, facts: string): Promise<{ text: string; isTemplate: boolean }> {
  if (!facts.trim()) throw new AppError(400, 'FACTS_REQUIRED', 'Add a few facts about yourself first.');
  if (!aiIsLive) {
    // Rule-based fallback: lightly formats the user's own words rather than generating new prose.
    return { text: facts.trim().replace(/\s+/g, ' '), isTemplate: true };
  }
  const prompt = `Write ${FIELD_LABEL[field]}. Facts provided by the user:\n${facts}`;
  const text = await aiClient.complete(SYSTEM, prompt);
  return { text: text.trim(), isTemplate: false };
}
