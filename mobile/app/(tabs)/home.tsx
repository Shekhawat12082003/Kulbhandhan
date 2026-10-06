import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { ProfileCard } from '../../src/components/ProfileCard';
import { colors } from '../../src/theme';

export default function Home() {
  const [name, setName] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { profile } = await api('/profiles/me');
      if (!profile) return router.replace('/onboarding');
      setName(profile.displayName);
      const ageMin = profile.prefs?.ageMin ?? 18;
      const ageMax = profile.prefs?.ageMax ?? 60;
      const query = new URLSearchParams({ ageMin: String(ageMin), ageMax: String(ageMax) });
      setProfiles((await api(`/discover?${query}`)).profiles ?? []);
    } catch (e: any) {
      if (e.code === 'PROFILE_REQUIRED') return router.replace('/onboarding');
      setError(e.message ?? 'Could not load profiles.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.maroon} />}>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontFamily: 'serif', fontSize: 30, color: colors.maroon, marginTop: 8 }}>Namaste{name ? `, ${name.split(' ')[0]}` : ''}</Text>
          <View style={{ height: 2, width: 40, backgroundColor: colors.gold, marginVertical: 12 }} />
          <Text style={{ fontFamily: 'serif', fontSize: 22, color: colors.maroon, marginBottom: 12 }}>Profiles for you</Text>
          {loading && <ActivityIndicator color={colors.maroon} />}
          {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
          {!loading && !error && profiles.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {profiles.map((profile) => <ProfileCard key={profile.userId} p={profile} variant="preview" />)}
          </ScrollView>}
          {!loading && !error && profiles.length === 0 && <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 24 }}>No profiles are available for your preferences yet.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
