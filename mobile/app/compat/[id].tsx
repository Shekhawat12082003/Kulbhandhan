import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Screen } from '../../src/components/Screen';
import { Section } from '../../src/components/Section';
import { api } from '../../src/lib/api';
import { colors } from '../../src/theme';

const KOOTAS = [
  ['Varna', 'varna'], ['Vashya', 'vashya'], ['Tara', 'tara'], ['Yoni', 'yoni'],
  ['Graha Maitri', 'graha_maitri'], ['Gana', 'gana'], ['Bhakoot', 'bhakoot'], ['Nadi', 'nadi'],
] as const;

const value = (input: unknown): string => input == null || input === '' ? 'Not returned' :
  typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean' ? String(input) : JSON.stringify(input) ?? String(input);

const objectRows = (input: unknown): [string, string][] => !input || typeof input !== 'object' ? [] :
  Object.entries(input as Record<string, unknown>).map(([key, item]) => [key.replaceAll('_', ' '), value(item)]);

function PersonKundli({ title, person }: { title: string; person: any }) {
  if (!person) return null;
  const chartRows = (chart: any) => objectRows(chart?.placements ?? chart);
  const planets = Object.entries(person.planets ?? {}).map(([name, p]: [string, any]) => [
    name,
    [p.zodiac_sign_name ?? p.sign, p.degrees != null ? `${p.degrees}° ${p.minutes ?? 0}' ${p.seconds ?? 0}"` : p.normDegree,
      `House ${p.house_number ?? p.house}`, p.nakshatra_name ?? p.nakshatra,
      p.nakshatra_pada != null ? `Pada ${p.nakshatra_pada}` : null]
      .filter(Boolean).join(' · '),
  ] as [string, string]);
  return <>
    <Text style={{ fontFamily: 'serif', fontSize: 21, color: colors.maroon, marginVertical: 12 }}>{title}: {person.name}</Text>
    <Section title="Lagna" rows={objectRows(person.lagna)} />
    <Section title="Rashi" rows={objectRows(person.rashi)} />
    <Section title="Nakshatra" rows={objectRows(person.nakshatra)} />
    <Text style={{ fontFamily: 'serif', fontSize: 18, color: colors.maroon, marginVertical: 8 }}>D1 · Rashi chart</Text>
    {person.charts?.D1?.svg ? <SvgXml xml={person.charts.D1.svg} width="100%" height={300} /> : <Section title="D1 placements" rows={chartRows(person.charts?.D1)} />}
    <Text style={{ fontFamily: 'serif', fontSize: 18, color: colors.maroon, marginVertical: 8 }}>D9 · Navamsa chart</Text>
    {person.charts?.D9?.svg ? <SvgXml xml={person.charts.D9.svg} width="100%" height={300} /> : <Section title="D9 placements" rows={chartRows(person.charts?.D9)} />}
    <Section title="Planetary positions" rows={planets} />
    <Section title="Houses" rows={objectRows(person.houses)} />
    <Section title="Panchang" rows={objectRows(person.panchang)} />
    <Section title="Vimshottari Dasha" rows={objectRows(person.dasha?.vimshottari)} />
    <Section title="Dasha periods" rows={objectRows(person.dasha?.periods)} />
  </>;
}

export default function Compat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/compatibility/${id}`).then(setD).catch((e) => Alert.alert('Compatibility', e.message, [{ text: 'OK', onPress: () => router.back() }])); }, [id]);
  if (!d) return <Screen><ActivityIndicator color={colors.maroon} style={{ marginTop: 80 }} /></Screen>;
  const score = d.overall_score;
  const breakdown = d.ashtakoot?.breakdown ?? {};
  const kootaRows: [string, string][] = KOOTAS.map(([label, key]) => {
    const k = breakdown[key] ?? (key === 'graha_maitri' ? breakdown.maitri : key === 'gana' ? breakdown.gan : undefined);
    if (!k) return [label, 'Not returned by the provider'];
    const { score: _score, maximum: _maximum, ...details } = k;
    return [`${label} · ${value(k.score)}/${value(k.maximum)}`, value(details)];
  });
  const manglikRows = objectRows(d.dosha?.manglik);
  const familyChecks = objectRows(d.family_compatibility?.checks);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Compatibility', headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.maroon }} />
      <Text style={{ fontFamily: 'serif', fontSize: 25, color: colors.maroon, marginBottom: 8 }}>Kundli compatibility</Text>
      <Text style={{ color: colors.muted, marginBottom: 14 }}>{d.person_a?.name} and {d.person_b?.name}</Text>
      <Section title="Astrological compatibility" rows={[
        ['Guna Milan', `${value(score?.guna)} / ${value(score?.maximum)}`],
        ['Compatibility band', value(score?.compatibility)],
        ['Threshold policy', value(score?.policy)],
      ]} />
      <Section title="Ashtakoot · 36 points" rows={kootaRows} />
      <Section title="Dosha review · Manglik" rows={manglikRows} />
      <Section title="Dosha review · Nadi" rows={objectRows(d.dosha?.nadi)} />
      <Section title="Dosha review · Bhakoot" rows={objectRows(d.dosha?.bhakoot)} />
      <Section title="Dosha review · Rajju" rows={objectRows(d.dosha?.rajju)} />
      <Section title="Dosha review · Vedha" rows={objectRows(d.dosha?.vedha)} />
      <Section title="Ashtakoot cancellation notes" rows={objectRows(d.ashtakoot?.dosha_notes ?? d.ashtakoot?.cancellations)} />
      <Section title="South Indian 10-porutham · separate method" rows={objectRows(d.regional_compatibility)} />
      <Text style={{ fontFamily: 'serif', fontSize: 21, color: colors.maroon, marginVertical: 12 }}>Family compatibility</Text>
      <Section title="Lineage review" rows={[
        ['Status', value(d.family_compatibility?.status)], ...familyChecks,
        ['Family rules', 'No user-defined family restrictions are configured.'],
        ['Review note', value(d.family_compatibility?.note)],
      ]} />
      <Text style={{ fontFamily: 'serif', fontSize: 21, color: colors.maroon, marginVertical: 12 }}>Person A · {d.person_a?.name}</Text>
      <Section title="Birth chart details" rows={[
        ['Lagna', value(d.person_a?.lagna?.zodiac_sign_name)], ['Rashi', value(d.person_a?.rashi?.sign)],
        ['Nakshatra', `${value(d.person_a?.nakshatra?.name)} · Pada ${value(d.person_a?.nakshatra?.pada)}`],
      ]} />
      <PersonKundli title="Person A" person={d.person_a} />
      <PersonKundli title="Person B" person={d.person_b} />
      <Section title="Overall Kulbandhan compatibility" rows={[
        ['Astrological', value(d.overall_compatibility?.astrological?.compatibility)],
        ['Family / lineage', value(d.overall_compatibility?.family_lineage)],
        ['Combined result', value(d.overall_compatibility?.kulbandhan)],
      ]} />
      <Section title="Calculation source" rows={objectRows(d.calculation)} />
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{d.disclaimer}</Text>
    </Screen>
  );
}
