import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { ProfileCard } from '../../src/components/ProfileCard';
import { colors, shadow } from '../../src/theme';

const line = '#D8C8B1';

function completion(profile: any) {
  const fields = ['displayName', 'city', 'state', 'heightCm', 'education', 'profession', 'about'];
  return Math.round(fields.filter((field) => profile?.[field]).length / fields.length * 100);
}

function CircleAction({ icon, title, note, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ flex: 1, minHeight: 116, backgroundColor: colors.offWhite, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: line }, pressed && { opacity: 0.7 }]}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.beige, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={19} color={colors.maroon} />
      </View>
      <Text style={{ color: colors.maroon, fontWeight: '800', fontSize: 13, marginTop: 12 }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{note}</Text>
    </Pressable>
  );
}

function ProfileRail({ title, count, profiles, onAll }: { title: string; count: number; profiles: any[]; onAll: () => void }) {
  return (
    <View style={{ marginTop: 26 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
        <View>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>THE CIRCLE</Text>
          <Text style={{ color: colors.charcoal, fontFamily: 'serif', fontSize: 23, fontWeight: '700', marginTop: 3 }}>{title}</Text>
        </View>
        <Pressable onPress={onAll} accessibilityRole="button"><Text style={{ color: colors.maroon, fontWeight: '800', fontSize: 12 }}>VIEW ALL ({count})</Text></Pressable>
      </View>
      {profiles.length > 0
        ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{profiles.map((p) => <ProfileCard key={p.userId} p={p} variant="preview" />)}</ScrollView>
        : <View style={{ borderWidth: 1, borderColor: line, borderRadius: 16, padding: 18 }}><Text style={{ color: colors.muted }}>Your circle is still growing.</Text></View>}
    </View>
  );
}

function Stat({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: line }, pressed && { opacity: 0.65 }]}>
      <Ionicons name={icon} size={19} color={colors.maroon} />
      <Text style={{ color: colors.maroon, fontFamily: 'serif', fontSize: 23, fontWeight: '700', marginTop: 6 }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>{label}</Text>
    </Pressable>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [interestCount, setInterestCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [{ profile: mine }, discovered, photos, received, matches] = await Promise.all([
        api('/profiles/me'),
        api('/discover?ageMin=18&ageMax=80'),
        api('/photos/me'),
        api('/interests?box=received'),
        api('/matches'),
      ]);
      if (!mine) return router.replace('/onboarding');
      setProfile(mine);
      setProfiles(discovered.profiles ?? []);
      setPhotoUrl(photos.photos?.find((photo: any) => photo.visibility === 'public')?.url ?? null);
      setInterestCount(received.interests?.length ?? 0);
      setMatchCount(matches.matches?.filter((match: any) => match.profile).length ?? 0);
    } catch (e: any) {
      if (e.code === 'PROFILE_REQUIRED') return router.replace('/onboarding');
      setError(e.message ?? 'Could not load profiles.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const ready = completion(profile);
  const firstName = profile?.displayName?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 34 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.maroon} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, paddingBottom: 24 }}>
          <View>
            <Text style={{ color: colors.maroon, fontFamily: 'serif', fontSize: 22, fontWeight: '700', letterSpacing: 1 }}>kulbandhan</Text>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Do kul, ek bandhan</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => router.push('/(tabs)/discover')} style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Search profiles">
              <Ionicons name="search-outline" size={20} color={colors.maroon} />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/interests')} style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Open interests">
              <Ionicons name="notifications-outline" size={20} color={colors.maroon} />
            </Pressable>
          </View>
        </View>

        <View style={{ backgroundColor: colors.maroon, borderRadius: 24, padding: 22, ...shadow }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#DDBE77', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>YOUR INTRODUCTION JOURNEY</Text>
              <Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 29, lineHeight: 34, marginTop: 12 }}>Namaste, {firstName}.</Text>
              <Text style={{ color: '#F1E6D8', fontSize: 13, lineHeight: 19, marginTop: 10 }}>A meaningful connection begins with a well-known story.</Text>
            </View>
            <Pressable onPress={() => router.push('/onboarding')} accessibilityRole="button">
              <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: colors.ivory, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#DDBE77' }}>
                {photoUrl ? <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person-outline" size={32} color={colors.maroon} />}
              </View>
              <Text style={{ color: '#DDBE77', fontSize: 10, textAlign: 'center', marginTop: 7 }}>EDIT</Text>
            </Pressable>
          </View>
          <View style={{ marginTop: 22, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 15 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#F1E6D8', fontSize: 11, fontWeight: '700' }}>PROFILE READINESS</Text><Text style={{ color: '#DDBE77', fontSize: 11, fontWeight: '800' }}>{ready}%</Text></View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 8 }}><View style={{ width: `${ready}%`, height: '100%', borderRadius: 3, backgroundColor: '#DDBE77' }} /></View>
          </View>
        </View>

        <Text style={{ color: colors.maroon, fontFamily: 'serif', fontSize: 22, fontWeight: '700', marginTop: 28, marginBottom: 12 }}>Your introductions</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <CircleAction icon="heart-outline" title="Interests" note="Show interest" onPress={() => router.push('/(tabs)/interests')} />
          <CircleAction icon="chatbubble-ellipses-outline" title="Conversations" note="Your matches" onPress={() => router.push('/(tabs)/matches')} />
          <CircleAction icon="person-add-outline" title="Discover" note="Meet families" onPress={() => router.push('/(tabs)/discover')} />
        </View>

        <View style={[{ flexDirection: 'row', backgroundColor: colors.offWhite, borderRadius: 18, marginTop: 16, borderWidth: 1, borderColor: line }, shadow]}>
          <Stat icon="heart-outline" label="Interests" value={interestCount} onPress={() => router.push('/(tabs)/interests')} />
          <Stat icon="people-outline" label="Matches" value={matchCount} onPress={() => router.push('/(tabs)/matches')} />
          <Stat icon="compass-outline" label="Discoveries" value={profiles.length} onPress={() => router.push('/(tabs)/discover')} />
        </View>

        <View style={{ marginTop: 24, backgroundColor: colors.beige, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="sparkles-outline" size={23} color={colors.maroon} />
          <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: colors.maroon, fontWeight: '800', fontSize: 13 }}>A thoughtful profile travels further.</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>Complete your story to help families connect with confidence.</Text></View>
          <Pressable onPress={() => router.push('/onboarding')}><Ionicons name="arrow-forward-circle-outline" size={25} color={colors.maroon} /></Pressable>
        </View>

        <View style={{ marginTop: 24, backgroundColor: colors.offWhite, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: line }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>YOUR STORY</Text><Text style={{ color: colors.maroon, fontFamily: 'serif', fontSize: 21, fontWeight: '700', marginTop: 4 }}>Make your profile memorable</Text></View>
            <Text style={{ color: colors.gold, fontWeight: '800' }}>{ready}%</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.beige, marginTop: 14, overflow: 'hidden' }}><View style={{ width: `${ready}%`, height: '100%', backgroundColor: colors.gold }} /></View>
          {[
            ['Add your photo', Boolean(photoUrl), '/(tabs)/profile'],
            ['Share your profession', Boolean(profile?.profession), '/onboarding'],
            ['Tell families about you', Boolean(profile?.about), '/onboarding'],
          ].map(([label, done, path]) => (
            <Pressable key={String(label)} onPress={() => !done && router.push(path as any)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
              <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={done ? colors.success : colors.gold} />
              <Text style={{ flex: 1, color: done ? colors.muted : colors.charcoal, textDecorationLine: done ? 'line-through' : 'none', marginLeft: 9 }}>{label}</Text>
              {!done && <Ionicons name="arrow-forward" size={16} color={colors.maroon} />}
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 24, padding: 18, borderRadius: 18, backgroundColor: colors.maroonDark, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="shield-checkmark-outline" size={25} color="#DDBE77" />
          <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: '#fff', fontWeight: '700' }}>Private by design</Text><Text style={{ color: '#EADCCD', fontSize: 11, lineHeight: 17, marginTop: 4 }}>Your details are shared thoughtfully and fuller family information stays protected until trust is mutual.</Text></View>
        </View>

        {loading && <ActivityIndicator color={colors.maroon} style={{ marginTop: 28 }} />}
        {!!error && <Text style={{ color: colors.danger, textAlign: 'center', marginTop: 24 }}>{error}</Text>}
        {!loading && !error && <>
          <ProfileRail title="New introductions" count={profiles.length} profiles={profiles.slice(0, 8)} onAll={() => router.push('/profiles/all?section=joined')} />
          <ProfileRail title="People online recently" count={profiles.length} profiles={profiles.slice(0, 8)} onAll={() => router.push('/profiles/all?section=active')} />
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
