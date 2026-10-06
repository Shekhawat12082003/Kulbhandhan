import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { api } from '../src/lib/api';
import { colors, radius } from '../src/theme';

const F: [string, string, string?][] = [
  ['displayName', 'Full name'], ['city', 'City'], ['state', 'State'], ['heightCm', 'Height (cm)', 'number-pad'],
  ['education', 'Education'], ['profession', 'Profession'], ['about', 'About me'],
  ['famIntro', 'Family introduction'], ['famType', 'Family type (Joint / Nuclear)'], ['famValues', 'Family values'],
  ['kul', 'Kul'], ['vansh', 'Vansh'], ['gotra', 'Gotra'], ['nativePlace', 'Native place'],
  ['paternal', 'Paternal lineage (Dada / Dadera)'], ['maternal', 'Maternal lineage (Nana / Nanihal)'],
  ['birthTime', 'Exact birth time (HH:MM)'], ['birthPlace', 'Birthplace / hospital'], ['birthCity', 'Birth city'],
  ['birthState', 'Birth state / province'], ['birthCountry', 'Birth country'],
  ['latitude', 'Birth latitude', 'decimal-pad'], ['longitude', 'Birth longitude', 'decimal-pad'],
  ['timezone', 'IANA timezone (e.g. Asia/Kolkata)'], ['utcOffsetHours', 'UTC offset at birth (e.g. 5.5)', 'decimal-pad'],
  ['ageMin', 'Preferred age from', 'number-pad'], ['ageMax', 'Preferred age to', 'number-pad'],
];
const GROUPS: [string, number, number][] = [['Personal', 0, 7], ['Family', 7, 10], ['Rajput Heritage', 10, 14], ['Lineage', 14, 16], ['Kundli', 16, 25], ['Partner Preferences', 25, 27]];

export default function Onboarding() {
  const [v, setV] = useState<Record<string, string>>({});
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (t: string) => setV((s) => ({ ...s, [k]: t }));

  useEffect(() => { api('/profiles/me').then(({ profile: p }) => {
    if (!p) return;
    setGender(p.gender);
    setV({ displayName: p.displayName, city: p.city, state: p.state, heightCm: p.heightCm && String(p.heightCm), education: p.education, profession: p.profession, about: p.about,
      famIntro: p.family?.intro, famType: p.family?.type, famValues: p.family?.values, kul: p.heritage?.kul, vansh: p.heritage?.vansh, gotra: p.heritage?.gotra,
      nativePlace: p.heritage?.nativePlace, paternal: p.lineage?.paternal, maternal: p.lineage?.maternal,
      birthTime: p.birthDetails?.birthTime, birthPlace: p.birthDetails?.birthPlace, birthCity: p.birthDetails?.city,
      birthState: p.birthDetails?.state, birthCountry: p.birthDetails?.country,
      latitude: p.birthDetails?.latitude != null ? String(p.birthDetails.latitude) : '',
      longitude: p.birthDetails?.longitude != null ? String(p.birthDetails.longitude) : '',
      timezone: p.birthDetails?.timezone,
      utcOffsetHours: p.birthDetails?.utcOffsetHours != null ? String(p.birthDetails.utcOffsetHours) : '',
      ageMin: p.prefs?.ageMin && String(p.prefs.ageMin), ageMax: p.prefs?.ageMax && String(p.prefs.ageMax) } as any);
  }).catch(() => {}); }, []);

  async function save() {
    if (!v.displayName || v.displayName.length < 2) return Alert.alert('Please enter your name');
    if (!gender) return Alert.alert('Please select gender');
    const o = (x?: string) => (x?.trim() ? x.trim() : undefined);
    const n = (x?: string) => (x?.trim() ? Number(x) : undefined);
    setLoading(true);
    try {
      await api('/profiles/me', 'PUT', {
        displayName: v.displayName, gender, heightCm: n(v.heightCm), city: o(v.city), state: o(v.state), education: o(v.education), profession: o(v.profession), about: o(v.about),
        family: { intro: o(v.famIntro), type: o(v.famType), values: o(v.famValues) },
        heritage: { kul: o(v.kul), vansh: o(v.vansh), gotra: o(v.gotra), nativePlace: o(v.nativePlace) },
        lineage: { paternal: o(v.paternal), maternal: o(v.maternal) },
        kundli: {
          birthTime: o(v.birthTime), birthPlace: o(v.birthPlace), city: o(v.birthCity), state: o(v.birthState), country: o(v.birthCountry),
          latitude: n(v.latitude), longitude: n(v.longitude), timezone: o(v.timezone), utcOffsetHours: n(v.utcOffsetHours),
        },
        prefs: { ageMin: n(v.ageMin), ageMax: n(v.ageMax) },
      });
      router.replace('/(tabs)/home');
    } catch (e: any) { Alert.alert('Could not save', e.message); } finally { setLoading(false); }
  }
  const chip = (val: string, cur: string, set: (s: string) => void, label: string) => (
    <Pressable key={val} onPress={() => set(val)} style={{ flex: 1, minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
      borderColor: cur === val ? colors.maroon : colors.border, backgroundColor: cur === val ? colors.beige : '#fff' }}><Text>{label}</Text></Pressable>);

  return (
    <Screen>
      <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginVertical: 20 }}>Your Profile</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>Kundli and lineage details stay hidden until a mutual match.</Text>
      {GROUPS.map(([title, a, b]) => (
        <View key={title} style={{ marginBottom: 8 }}>
          <Text style={{ fontFamily: 'serif', fontSize: 20, color: colors.maroon, marginVertical: 10 }}>{title}</Text>
          {title === 'Personal' && <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>{chip('male', gender, setGender, 'Male')}{chip('female', gender, setGender, 'Female')}</View>}
          {F.slice(a, b).map(([k, l, kb]) => (
            <View key={k}>
              <Input label={l} value={v[k] ?? ''} onChangeText={set(k)} keyboardType={kb as any} multiline={k === 'about'} />
              {k === 'timezone' && <Text style={{ color: colors.muted, fontSize: 12, marginTop: -8, marginBottom: 12 }}>Use an IANA name such as Asia/Kolkata; the UTC offset is validated for the birth date.</Text>}
              {k === 'about' && v.about?.trim() && (
                <Button title="✨ Polish with AI" variant="ghost" onPress={async () => {
                  try { const r = await api('/ai/profile-assist', 'POST', { field: 'about', facts: v.about }); set('about')(r.text); }
                  catch (e: any) { Alert.alert('AI Assistant', e.message); }
                }} />
              )}
            </View>))}
        </View>))}
      <Button title="Save & Publish Profile" onPress={save} loading={loading} />
    </Screen>
  );
}
