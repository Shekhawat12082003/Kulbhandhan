import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { Button } from '../src/components/Button';
import { api } from '../src/lib/api';
import { colors } from '../src/theme';

const VARGAS = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D10', 'D11', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];

const display = (value: unknown): string => {
  if (value == null || value === '') return 'Not returned by calculation provider';
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : JSON.stringify(value) ?? String(value);
};

function rows(value: unknown): [string, string][] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => [key.replaceAll('_', ' '), display(item)]);
}

export default function Kundli() {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [vargaBusy, setVargaBusy] = useState(false);
  const [selectedVarga, setSelectedVarga] = useState('');
  const load = useCallback(() => api('/kundli/me').then(setD).catch((e) => { Alert.alert('Error', e.message); router.back(); }), []);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy(true);
    try { await api('/kundli/generate', 'POST'); await load(); }
    catch (e: any) { Alert.alert('Could not generate Kundli', e.message); } finally { setBusy(false); }
  }
  async function deleteBirthDetails() {
    setBusy(true);
    try { await api('/kundli/me/birth-details', 'DELETE'); await load(); }
    catch (e: any) { Alert.alert('Could not remove birth details', e.message); }
    finally { setBusy(false); }
  }
  async function selectVarga(chartCode: string) {
    setSelectedVarga(chartCode);
    if (d.kundli?.charts?.[chartCode]) return;
    setVargaBusy(true);
    try {
      const result = await api(`/kundli/me/divisional/${chartCode}`);
      setD((current: any) => ({ ...current, kundli: { ...current.kundli, charts: { ...current.kundli?.charts, [chartCode]: result.chart } } }));
    } catch (e: any) { Alert.alert('Could not load chart', e.message); }
    finally { setVargaBusy(false); }
  }
  if (!d) return <Screen><ActivityIndicator color={colors.maroon} style={{ marginTop: 80 }} /></Screen>;
  const k = d.kundli;
  const birth = d.birthDetails;
  const birthDate = typeof d.dateOfBirth === 'string' ? d.dateOfBirth.slice(0, 10) : String(d.dateOfBirth ?? '');
  const planetRows: [string, string][] = Object.entries(k?.planets ?? {}).map(([name, item]: [string, any]) => [
    name,
    [item.zodiac_sign_name ?? item.sign, item.degrees != null ? `${item.degrees}° ${item.minutes ?? 0}' ${item.seconds ?? 0}"` : item.normDegree,
      `House ${item.house_number ?? item.house}`, item.nakshatra_name ?? item.nakshatra,
      item.nakshatra_pada != null ? `Pada ${item.nakshatra_pada}` : null, item.isRetro === true || item.isRetro === 'true' ? 'Retrograde' : null]
      .filter(Boolean).join(' · '),
  ]);
  const birthRows: [string, string][] = [
    ['Date', birthDate], ['Exact time', birth?.birthTime], ['Birthplace', birth?.birthPlace],
    ['City', birth?.city], ['State', birth?.state], ['Country', birth?.country], ['Coordinates', birth?.latitude != null && birth?.longitude != null ? `${birth.latitude}, ${birth.longitude}` : null],
    ['Timezone', birth?.timezone], ['UTC offset at birth', birth?.utcOffsetHours != null ? `${birth.utcOffsetHours} hours` : null],
  ].map(([label, value]) => [label, display(value)]);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Your Kundli', headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.maroon }} />
      <Text style={{ fontFamily: 'serif', fontSize: 26, color: colors.maroon, marginVertical: 12 }}>Birth Kundli</Text>
      <Text style={{ color: colors.muted, lineHeight: 21, marginBottom: 14 }}>Calculated by Navamsha using the saved birth time, coordinates, timezone, and recorded Vedic settings.</Text>
      {d.calculation && <Section title="Calculation source" rows={[
        ['Provider', display(d.calculation.provider)], ['Engine version', display(d.calculation.providerVersion)],
        ['Calculated at', display(d.calculation.calculatedAt)],
      ]} />}
      <Section title="Birth details" rows={birthRows} />
      {!birth?.birthTime || birth?.latitude == null || birth?.longitude == null || !birth?.timezone || birth?.utcOffsetHours == null ? (
        <Button title="Complete birth details" onPress={() => router.push('/onboarding')} />
      ) : <Button title={k ? 'Refresh calculation' : 'Calculate Kundli'} onPress={generate} loading={busy} />}
      {k && <>
        <Section title="Calculation settings" rows={rows(k.settings)} />
        <Section title="Lagna" rows={rows(k.lagna)} />
        <Section title="Rashi and Nakshatra" rows={[
          ['Moon sign', display(k.rashi?.sign)], ['Nakshatra', display(k.nakshatra?.name)],
          ['Nakshatra pada', display(k.nakshatra?.pada)], ['Vimshottari lord', display(k.nakshatra?.lord)],
        ]} />
        <Section title="Panchang at birth" rows={rows(k.panchang)} />
        <Text style={{ fontFamily: 'serif', fontSize: 20, color: colors.maroon, marginVertical: 10 }}>D1 · Rashi chart</Text>
        {k.charts?.D1?.svg ? <SvgXml xml={k.charts.D1.svg} width="100%" height={320} /> : <Text style={{ color: colors.muted }}>D1 chart was not returned.</Text>}
        <Text style={{ fontFamily: 'serif', fontSize: 20, color: colors.maroon, marginVertical: 10 }}>D9 · Navamsa chart</Text>
        {k.charts?.D9?.svg ? <SvgXml xml={k.charts.D9.svg} width="100%" height={320} /> : <Text style={{ color: colors.muted }}>D9 chart was not returned.</Text>}
        <Text style={{ fontFamily: 'serif', fontSize: 20, color: colors.maroon, marginVertical: 10 }}>Other divisional charts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          {VARGAS.map((chartCode) => <Pressable key={chartCode} onPress={() => selectVarga(chartCode)} accessibilityRole="button"
            style={{ minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1,
              borderColor: selectedVarga === chartCode ? colors.maroon : colors.border, backgroundColor: selectedVarga === chartCode ? colors.beige : '#fff' }}>
            <Text style={{ color: colors.charcoal }}>{chartCode}</Text>
          </Pressable>)}
        </ScrollView>
        {vargaBusy ? <ActivityIndicator color={colors.maroon} /> : selectedVarga && <>
          {k.charts?.[selectedVarga]?.svg ? <SvgXml xml={k.charts[selectedVarga].svg} width="100%" height={320} /> : null}
          <Section title={`${selectedVarga} placements`} rows={rows(k.charts?.[selectedVarga]?.placements)} />
          {k.charts?.[selectedVarga]?.variant && <Text style={{ color: colors.muted }}>Provider variant: {k.charts[selectedVarga].variant}</Text>}
        </>}
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
          D5, D6, D8, and D11 have provider-specific formula variants. Validate those conventions with an astrologer before interpretation.
        </Text>
        <Section title="Planetary positions" rows={planetRows} />
        <Section title="Houses" rows={rows(k.houses)} />
        <Section title="House lords, dignity, and aspects" rows={rows(k.relationships)} />
        <Section title="Combustion" rows={rows(k.combustion)} />
        <Section title="Vimshottari Dasha" rows={rows(k.dasha?.vimshottari)} />
        <Section title="Dasha periods" rows={rows(k.dasha?.periods)} />
        <Section title="Manglik / Mangal Dosha" rows={rows(k.dosha?.manglik)} />
        <Section title="Additional dosha checks" rows={rows(k.dosha?.additional)} />
        <Section title="Cancellation rules not evaluated" rows={(k.notEvaluated ?? []).map((name: string) => [name, 'Not returned by the provider'])} />
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginVertical: 12 }}>Astrological calculations are informational. Verify important interpretations with a qualified practitioner.</Text>
      </>}
      <Button title="Edit birth details" variant="secondary" onPress={() => router.push('/onboarding')} />
      {birth && <Button title="Delete saved birth details" variant="ghost" loading={busy} onPress={() => Alert.alert(
        'Delete Kundli birth details?', 'This removes the saved birth time and location plus generated charts and match reports. Your date of birth remains for account age eligibility.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: deleteBirthDetails },
        ])} />}
    </Screen>
  );
}
