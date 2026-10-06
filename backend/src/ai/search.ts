import { aiClient, aiIsLive } from './aiClient';

export type SearchFilters = { ageMin?: number; ageMax?: number; cities: string[]; education?: string; profession?: string; familyOriented?: boolean };

const CITY_WORDS = ['jaipur', 'delhi', 'udaipur', 'jodhpur', 'mumbai', 'bangalore', 'bengaluru', 'pune', 'ahmedabad', 'kota', 'chandigarh', 'lucknow', 'indore'];

/** Rule-based fallback: extracts age range, known cities, and a couple of keywords. No LLM required. */
function heuristicParse(query: string): SearchFilters {
  const q = query.toLowerCase();
  const range = q.match(/(\d{2})\s*(?:-|to|–)\s*(\d{2})/);
  const single = !range && q.match(/\b(\d{2})\b/);
  const cities = CITY_WORDS.filter((c) => q.includes(c)).map((c) => c[0].toUpperCase() + c.slice(1));
  const out: SearchFilters = { cities };
  if (range) { out.ageMin = Number(range[1]); out.ageMax = Number(range[2]); }
  else if (single) { out.ageMin = Number(single[1]) - 2; out.ageMax = Number(single[1]) + 2; }
  if (/(engineer|software|developer|it\b)/.test(q)) out.profession = 'Engineer';
  if (/(doctor|physician)/.test(q)) out.profession = 'Doctor';
  if (/(teacher|professor|lecturer)/.test(q)) out.profession = 'Teacher';
  if (/family[- ]oriented|family oriented|involves? family/.test(q)) out.familyOriented = true;
  return out;
}

const SYSTEM = `Convert a matrimonial search sentence into JSON only: {"ageMin":number|null,"ageMax":number|null,"cities":string[],"education":string|null,"profession":string|null,"familyOriented":boolean}. No prose, no markdown fences, JSON only. Never invent details not implied by the sentence.`;

export async function interpretSearch(query: string): Promise<{ filters: SearchFilters; source: 'ai' | 'rules' }> {
  if (!aiIsLive) return { filters: heuristicParse(query), source: 'rules' };
  try {
    const raw = await aiClient.complete(SYSTEM, query);
    const parsed = JSON.parse(raw.trim().replace(/^```json\s*|```$/g, ''));
    return { filters: { cities: Array.isArray(parsed.cities) ? parsed.cities : [], ageMin: parsed.ageMin ?? undefined, ageMax: parsed.ageMax ?? undefined, education: parsed.education ?? undefined, profession: parsed.profession ?? undefined, familyOriented: !!parsed.familyOriented }, source: 'ai' };
  } catch { return { filters: heuristicParse(query), source: 'rules' }; } // never fail the request over an AI hiccup
}
