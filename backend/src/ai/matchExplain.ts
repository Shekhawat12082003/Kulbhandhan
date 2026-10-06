import { ageFrom } from '../services/authService';

export type Point = { text: string; ok: boolean };

/** Deterministic, explainable rules only — never an opaque AI verdict. Mirrors spec section 18. */
export function explainMatch(me: any, other: any): { points: Point[]; hasKundliBoth: boolean } {
  const points: Point[] = [];
  const age = ageFrom(other.dateOfBirth);
  if (me.prefs?.ageMin || me.prefs?.ageMax) {
    const ok = (!me.prefs.ageMin || age >= me.prefs.ageMin) && (!me.prefs.ageMax || age <= me.prefs.ageMax);
    points.push({ text: 'Age preference matches', ok });
  }
  if (me.education && other.education) points.push({ text: 'Education level is comparable', ok: me.education.toLowerCase() === other.education.toLowerCase() });
  if (me.prefs?.cities?.length) points.push({ text: 'Location preference matches', ok: me.prefs.cities.some((c: string) => c.toLowerCase() === (other.city ?? '').toLowerCase()) });
  else if (me.city && other.city) points.push({ text: 'Same city', ok: me.city.toLowerCase() === other.city.toLowerCase() });
  const hasKundliBoth = me.kundli?.moonNakshatra != null && other.kundli?.moonNakshatra != null;
  points.push({ text: 'Both profiles have completed Kundli', ok: hasKundliBoth });
  if (me.heritage?.kul && other.heritage?.kul) points.push({ text: 'Heritage information available on both sides', ok: true });
  return { points, hasKundliBoth };
}
