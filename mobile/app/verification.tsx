import { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { Button } from '../src/components/Button';
import { api } from '../src/lib/api';
import { colors, radius } from '../src/theme';

const TYPES: [string, string, string][] = [
  ['photo', 'Photo / Liveness', 'A short selfie or video is matched against your profile photos by an admin reviewer.'],
  ['identity', 'Identity', 'Submit a government ID for an admin reviewer to check (optional, for extra trust).'],
  ['education', 'Education', 'State your degree/institution for an admin reviewer to confirm (optional).'],
  ['family', 'Family Reference', 'A family member or reference is contacted for confirmation (optional).'],
];

export default function Verification() {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [badges, setBadges] = useState<any[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const d = await api('/verification/me').catch(() => ({ requests: [], badges: [] }));
    const s: Record<string, string> = {};
    d.requests.forEach((r: any) => { s[r.type] = r.status; });
    setStatus(s); setBadges(d.badges);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit(type: string) {
    try { await api('/verification/request', 'POST', { type, note: note[type] }); await load(); }
    catch (e: any) { Alert.alert('Could not submit', e.message); }
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Verification', headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.maroon }} />
      <Text style={{ fontFamily: 'serif', fontSize: 24, color: colors.maroon, marginBottom: 4 }}>Verification</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>A badge shows only what was actually checked. It doesn't guarantee everything on a profile is accurate.</Text>
      {badges.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {badges.map((b: any) => <View key={b.type} style={{ backgroundColor: colors.beige, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: colors.maroon, fontSize: 12 }}>✓ {b.type}</Text></View>)}
        </View>
      )}
      {TYPES.map(([type, label, desc]) => (
        <View key={type} style={{ backgroundColor: colors.offWhite, borderRadius: radius.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontWeight: '600', color: colors.charcoal, marginBottom: 4 }}>{label}</Text>
          <Text style={{ color: colors.muted, marginBottom: 8, fontSize: 13 }}>{desc}</Text>
          {status[type] === 'approved' ? <Text style={{ color: colors.gold }}>✓ Verified</Text>
            : status[type] === 'pending' ? <Text style={{ color: colors.muted }}>Pending review</Text>
            : <Button title={status[type] === 'rejected' ? 'Re-submit' : 'Request Verification'} variant="secondary" onPress={() => submit(type)} />}
        </View>))}
    </Screen>
  );
}
