import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { ProfileCard } from '../../src/components/ProfileCard';
import { colors, shadow } from '../../src/theme';

const RED = colors.maroon;
const YELLOW = '#E7C66A';
const INK = colors.charcoal;

function profileCompletion(profile: any) {
  const fields = ['displayName', 'city', 'state', 'heightCm', 'education', 'profession', 'about'];
  return Math.round(fields.filter((field) => profile?.[field]).length / fields.length * 100);
}

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ alignItems: 'center', width: 92 }, pressed && { opacity: 0.75 }]}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>
      <Text style={{ color: colors.maroon, fontSize: 11, fontWeight: '700', marginTop: 8, letterSpacing: 0.5 }}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, count, subtitle, profiles, onShowAll }: { title: string; count: number; subtitle: string; profiles: any[]; onShowAll: () => void }) {
  return (
    <View style={[{ backgroundColor: '#fff', borderRadius: 24, padding: 18, marginBottom: 16 }, shadow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: INK, fontFamily: 'serif', fontSize: 21, fontWeight: '700' }}>{title} <Text style={{ color: RED }}>({count})</Text></Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{subtitle}</Text>
        </View>
        <Pressable onPress={onShowAll} accessibilityRole="button" style={{ alignItems: 'center', padding: 6 }}>
          <Ionicons name="eye-outline" size={22} color={RED} />
          <Text style={{ color: RED, fontSize: 11, fontWeight: '700' }}>SHOW ALL</Text>
        </Pressable>
      </View>
      {profiles.length > 0
        ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16 }}>
            {profiles.map((profile) => <ProfileCard key={profile.userId} p={profile} variant="preview" />)}
          </ScrollView>
        : <Text style={{ color: colors.muted, marginTop: 18 }}>No profiles are available yet.</Text>}
    </View>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [{ profile: mine }, discovered, photos] = await Promise.all([
        api('/profiles/me'),
        api('/discover?ageMin=18&ageMax=80'),
        api('/photos/me'),
      ]);
      if (!mine) return router.replace('/onboarding');
      setProfile(mine);
      setProfiles(discovered.profiles ?? []);
      setPhotoUrl(photos.photos?.find((photo: any) => photo.visibility === 'public')?.url ?? null);
    } catch (e: any) {
      if (e.code === 'PROFILE_REQUIRED') return router.replace('/onboarding');
      setError(e.message ?? 'Could not load profiles.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const completion = profileCompletion(profile);
  const firstName = profile?.displayName?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={RED} />}>
        <View style={{ backgroundColor: RED, marginHorizontal: 12, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityLabel="Open profile menu"><Ionicons name="grid-outline" size={25} color="#fff" /></Pressable>
          <Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 22, fontWeight: '700' }}>Dashboard</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable onPress={() => router.push('/(tabs)/discover')} accessibilityLabel="Search profiles"><Ionicons name="search-outline" size={24} color="#fff" /></Pressable>
            <Pressable onPress={() => router.push('/(tabs)/interests')} accessibilityLabel="Open interests"><Ionicons name="notifications-outline" size={24} color="#fff" /></Pressable>
          </View>
        </View>

        <View style={{ backgroundColor: YELLOW, marginTop: 12, padding: 24, paddingBottom: 26, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }}>
          <Text style={{ color: colors.maroonDark, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>WELCOME BACK, {firstName.toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
            <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {photoUrl ? <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={48} color={colors.maroon} />}
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ color: INK, fontFamily: 'serif', fontSize: 24, fontWeight: '700' }}>{profile?.displayName}</Text>
              <Text style={{ color: colors.maroonDark, marginTop: 5 }}>{profile?.published ? 'Active profile' : 'Profile paused'}</Text>
              <Text style={{ color: colors.maroonDark, marginTop: 3 }}>{profile?.badges?.length ? 'Verified' : 'Verification pending'}</Text>
            </View>
            <Pressable onPress={() => router.push('/onboarding')} accessibilityRole="button" style={{ backgroundColor: RED, borderRadius: 18, padding: 10 }}>
              <Ionicons name="create-outline" size={21} color="#fff" />
            </Pressable>
          </View>
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#111', fontWeight: '800', fontSize: 12 }}>PROFILE COMPLETION</Text><Text style={{ color: RED, fontWeight: '800' }}>{completion}%</Text></View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.72)', marginTop: 8, overflow: 'hidden' }}><View style={{ width: `${completion}%`, height: '100%', backgroundColor: RED }} /></View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 22 }}>
          <Action icon="chatbubble-ellipses-outline" label="MESSAGE" onPress={() => router.push('/(tabs)/matches')} />
          <Action icon="bookmark-outline" label="SHORTLISTED" onPress={() => router.push('/(tabs)/matches')} />
          <Action icon="heart-outline" label="INTEREST" onPress={() => router.push('/(tabs)/interests')} />
        </View>

        {loading && <ActivityIndicator color={RED} style={{ marginVertical: 20 }} />}
        {!!error && <Text style={{ color: colors.danger, textAlign: 'center', margin: 20 }}>{error}</Text>}
        {!loading && !error && <>
          <Section title="Recently Joined" count={profiles.length} subtitle={`You have ${profiles.length} recently joined profiles.`} profiles={profiles.slice(0, 8)} onShowAll={() => router.push('/(tabs)/discover')} />
          <Section title="Recently Active" count={profiles.length} subtitle={`You have ${profiles.length} recently active profiles.`} profiles={profiles.slice(0, 8)} onShowAll={() => router.push('/(tabs)/discover')} />
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
