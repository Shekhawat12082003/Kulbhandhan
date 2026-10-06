import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { api } from '../../src/lib/api';
import { colors } from '../../src/theme';

export default function Explain() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/ai/match-explanation/${id}`).then(setD).catch(() => setD({ points: [] })); }, [id]);
  if (!d) return <Screen><ActivityIndicator color={colors.maroon} style={{ marginTop: 80 }} /></Screen>;
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Why this profile?', headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.maroon }} />
      <Text style={{ fontFamily: 'serif', fontSize: 24, color: colors.maroon, marginBottom: 16 }}>Why this profile appeared</Text>
      {d.points.map((p: any, i: number) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 10 }}>
          <Text style={{ marginRight: 8, fontSize: 16 }}>{p.ok ? '✓' : '⚠'}</Text>
          <Text style={{ color: colors.charcoal, flex: 1 }}>{p.text}{!p.ok ? ' — you may want to discuss this' : ''}</Text>
        </View>))}
      {d.points.length === 0 && <Text style={{ color: colors.muted }}>Not enough information to explain this match yet.</Text>}
    </Screen>
  );
}
