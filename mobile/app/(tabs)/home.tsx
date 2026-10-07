import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { ProfileCard } from '../../src/components/ProfileCard';
import { colors, shadow } from '../../src/theme';

const RED = colors.maroon;
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={RED} />}>
        <View style={{ paddingTop: 14, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: colors.maroon, fontSize: 12, fontWeight: '800', letterSpacing: 2 }}>KULBANDHAN</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Your trusted circle</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={() => router.push('/(tabs)/discover')} accessibilityLabel="Search profiles" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="search-outline" size={21} color={colors.maroon} />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/interests')} accessibilityLabel="Open interests" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="notifications-outline" size={21} color={colors.maroon} />
            </Pressable>
          </View>
        </View>

        <View style={[{ backgroundColor: RED, borderRadius: 28, padding: 22, overflow: 'hidden' }, shadow]}>
          <View style={{ position: 'absolute', right: -44, top: -54, width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: 'rgba(231,198,106,0.35)' }} />
          <View style={{ position: 'absolute', right: 14, top: 14, width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: 'rgba(231,198,106,0.35)' }} />
          <Text style={{ color: '#E7C66A', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>GOOD TO SEE YOU, {firstName.toUpperCase()}</Text>
          <Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 30, marginTop: 14 }}>Your circle starts here.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22 }}>
            <View style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: colors.ivory, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E7C66A' }}>
              {photoUrl ? <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={48} color={colors.maroon} />}
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700' }}>{profile?.displayName}</Text>
              <Text style={{ color: '#F4E9D8', marginTop: 5 }}>{profile?.published ? 'Profile is visible' : 'Profile is paused'}</Text>
            </View>
            <Pressable onPress={() => router.push('/onboarding')} accessibilityRole="button" style={{ backgroundColor: '#E7C66A', borderRadius: 16, padding: 11 }}>
              <Ionicons name="create-outline" size={21} color="#fff" />
            </Pressable>
          </View>
          <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#F4E9D8', fontSize: 11, fontWeight: '700' }}>PROFILE READINESS</Text><Text style={{ color: '#E7C66A', fontSize: 11, fontWeight: '800' }}>{completion}%</Text></View>
              <View style={{ height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 8, overflow: 'hidden' }}><View style={{ width: `${completion}%`, height: '100%', backgroundColor: '#E7C66A' }} /></View>
            </View>
            <View style={{ width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <View><Text style={{ color: '#F4E9D8', fontSize: 10 }}>STATUS</Text><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 3 }}>{profile?.badges?.length ? 'VERIFIED' : 'ACTIVE'}</Text></View>
          </View>
        </View>

        <Text style={{ color: colors.maroon, fontFamily: 'serif', fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 12 }}>Your next step</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.offWhite, borderRadius: 20, paddingVertical: 17, ...shadow }}>
          <Action icon="chatbubble-ellipses-outline" label="MESSAGE" onPress={() => router.push('/(tabs)/matches')} />
          <Action icon="bookmark-outline" label="SHORTLISTED" onPress={() => router.push('/(tabs)/matches')} />
          <Action icon="heart-outline" label="INTEREST" onPress={() => router.push('/(tabs)/interests')} />
        </View>

        {loading && <ActivityIndicator color={RED} style={{ marginVertical: 20 }} />}
        {!!error && <Text style={{ color: colors.danger, textAlign: 'center', margin: 20 }}>{error}</Text>}
        {!loading && !error && <>
          <Section title="Recently Joined" count={profiles.length} subtitle={`You have ${profiles.length} recently joined profiles.`} profiles={profiles.slice(0, 8)} onShowAll={() => router.push('/profiles/all?section=joined')} />
          <Section title="Recently Active" count={profiles.length} subtitle={`You have ${profiles.length} recently active profiles.`} profiles={profiles.slice(0, 8)} onShowAll={() => router.push('/profiles/all?section=active')} />
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
