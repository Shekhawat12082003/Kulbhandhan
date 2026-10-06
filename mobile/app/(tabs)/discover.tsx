import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { ProfileCard } from '../../src/components/ProfileCard';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/theme';

export default function Discover() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [ageMin, setAgeMin] = useState('21');
  const [ageMax, setAgeMax] = useState('35');
  const [aiQuery, setAiQuery] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');

  const load = useCallback(async (overrides?: { ageMin?: string; ageMax?: string; city?: string }) => {
    setError('');
    try {
      const qs = new URLSearchParams({ ageMin: overrides?.ageMin ?? ageMin, ageMax: overrides?.ageMax ?? ageMax, ...((overrides?.city ?? city) ? { city: overrides?.city ?? city } : {}) });
      setItems((await api(`/discover?${qs}`)).profiles);
    } catch (e: any) {
      if (e.code === 'PROFILE_REQUIRED') return router.replace('/onboarding');
      setError(e.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, [city, ageMin, ageMax]);
  useEffect(() => { load(); }, []);

  async function runAiSearch() {
    if (aiQuery.trim().length < 3) return;
    setAiBusy(true); setAiNote('');
    try {
      const { filters, note } = await api('/ai/search', 'POST', { query: aiQuery });
      const nm = filters.ageMin ? String(filters.ageMin) : ageMin, nx = filters.ageMax ? String(filters.ageMax) : ageMax;
      const nc = filters.cities?.[0] ?? city;
      setAgeMin(nm); setAgeMax(nx); setCity(nc);
      setAiNote(note ?? `Interpreted: age ${nm}-${nx}${nc ? `, ${nc}` : ''}${filters.profession ? `, ${filters.profession}` : ''}. Edit below before applying.`);
      setLoading(true); await load({ ageMin: nm, ageMax: nx, city: nc });
    } catch (e: any) { Alert.alert('AI Search', e.message); } finally { setAiBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <FlatList data={items} keyExtractor={(p) => p.userId} contentContainerStyle={{ padding: 20 }}
        refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
        ListHeaderComponent={<View>
          <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginBottom: 16 }}>Discover</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>✨ Find your preferences</Text>
          <Input label="Describe what you're looking for" value={aiQuery} onChangeText={setAiQuery}
            placeholder="Rajput profiles from Jaipur, 24-28, working professional" />
          <Button title="Find Profiles" variant="secondary" onPress={runAiSearch} loading={aiBusy} />
          {!!aiNote && <Text style={{ color: colors.gold, fontSize: 12, marginTop: 8, marginBottom: 4 }}>{aiNote}</Text>}
          <View style={{ height: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Input label="Age from" value={ageMin} onChangeText={setAgeMin} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label="Age to" value={ageMax} onChangeText={setAgeMax} keyboardType="number-pad" /></View>
          </View>
          <Input label="City" value={city} onChangeText={setCity} placeholder="Any" />
          <Button title="Apply Filters" variant="secondary" onPress={() => { setLoading(true); load(); }} />
          <View style={{ height: 16 }} />
          {loading && <ActivityIndicator color={colors.maroon} />}
          {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
        </View>}
        ListEmptyComponent={!loading ? <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 24 }}>No profiles match these filters yet.</Text> : null}
        renderItem={({ item }) => <ProfileCard p={item} />} />
    </SafeAreaView>
  );
}
