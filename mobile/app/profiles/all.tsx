import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { ProfileCard } from '../../src/components/ProfileCard';
import { colors } from '../../src/theme';

const PAGE_SIZE = 20;

function pairProfiles(profiles: any[]) {
  const columns: any[][] = [];
  for (let index = 0; index < profiles.length; index += 2) {
    columns.push(profiles.slice(index, index + 2));
  }
  return columns;
}

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
  const profileColumns = pairProfiles(profiles);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Stack.Screen options={{ headerShown: true, title, headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.maroon }} />
      <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginHorizontal: 20, marginTop: 20 }}>
        {title} <Text style={{ color: colors.gold }}>({profiles.length})</Text>
      </Text>
      <FlatList
        data={profileColumns}
        keyExtractor={(column) => column[0].userId}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(); }}
        ListEmptyComponent={loading
          ? <ActivityIndicator color={colors.maroon} style={{ marginTop: 40 }} />
          : <Text style={{ color: error ? colors.danger : colors.muted, textAlign: 'center', marginTop: 24 }}>{error || 'No profiles are available yet.'}</Text>}
        renderItem={({ item: column }) => (
          <View style={{ width: 178, marginRight: 12, gap: 12 }}>
            {column.map((profile) => <ProfileCard key={profile.userId} p={profile} variant="grid" />)}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
