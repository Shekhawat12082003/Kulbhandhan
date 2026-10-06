import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { ProfileCard } from '../../src/components/ProfileCard';
import { colors } from '../../src/theme';

const PAGE_SIZE = 20;

export default function AllProfiles() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const title = section === 'active' ? 'Recently Active' : 'Recently Joined';
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const all: any[] = [];
      let page = 1;
      let batch: any[] = [];
      do {
        const result = await api(`/discover?ageMin=18&ageMax=80&page=${page}`);
        batch = result.profiles ?? [];
        all.push(...batch);
        page += 1;
      } while (batch.length === PAGE_SIZE);
      setProfiles(all);
    } catch (e: any) {
      setError(e.message ?? 'Could not load profiles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Stack.Screen options={{ headerShown: true, title, headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.maroon }} />
      <FlatList
        data={profiles}
        keyExtractor={(profile) => profile.userId}
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(); }}
        ListHeaderComponent={
          <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginBottom: 16 }}>
            {title} <Text style={{ color: colors.gold }}>({profiles.length})</Text>
          </Text>
        }
        ListEmptyComponent={loading
          ? <ActivityIndicator color={colors.maroon} style={{ marginTop: 40 }} />
          : <Text style={{ color: error ? colors.danger : colors.muted, textAlign: 'center', marginTop: 24 }}>{error || 'No profiles are available yet.'}</Text>}
        renderItem={({ item }) => <ProfileCard p={item} />}
      />
    </SafeAreaView>
  );
}
