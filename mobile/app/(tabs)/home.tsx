import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { ProfileCard } from '../../src/components/ProfileCard';
import { colors, shadow } from '../../src/theme';

const sandstone = '#C8A77A';
const royal = '#741F32';
const antique = '#B08A45';
const dark = '#2C211B';
const border = '#D6BE98';

const fields = [
  ['Personal details', (p: any) => Boolean(p?.displayName && p?.city)],
  ['Education', (p: any) => Boolean(p?.education)],
  ['Profession', (p: any) => Boolean(p?.profession)],
  ['Family', (p: any) => Boolean(p?.family?.intro)],
  ['Kul & Vansh', (p: any) => Boolean(p?.heritage?.kul && p?.heritage?.vansh)],
  ['Gotra', (p: any) => Boolean(p?.heritage?.gotra)],
  ['Kundli', (p: any) => Boolean(p?.birthDetails?.birthTime)],
  ['Verification', (p: any) => Boolean(p?.badges?.length)],
] as const;

function completion(profile: any) {
  return Math.round(fields.filter(([, test]) => test(profile)).length / fields.length * 100);
}

function Arch({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ borderWidth: 1, borderColor: antique, borderTopLeftRadius: 90, borderTopRightRadius: 90, backgroundColor: colors.ivory }, style]}>{children}</View>;
}

function HeritageTile({ icon, title, note, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, minHeight: 126, padding: 12, borderWidth: 1, borderColor: border, backgroundColor: '#FBF5E8', alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
    <Ionicons name={icon} size={28} color={antique} />
    <Text style={{ color: dark, fontFamily: 'serif', fontSize: 16, fontWeight: '700', marginTop: 10 }}>{title}</Text>
    <Text style={{ color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 4 }}>{note}</Text>
  </Pressable>;
}

function Rail({ title, subtitle, profiles, count, onAll }: { title: string; subtitle: string; profiles: any[]; count: number; onAll: () => void }) {
  return <View style={{ marginTop: 26 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
      <View><Text style={{ color: royal, fontFamily: 'serif', fontSize: 23, fontWeight: '700' }}>{title}</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{subtitle}</Text></View>
      <Pressable onPress={onAll}><Text style={{ color: royal, fontWeight: '800', fontSize: 11 }}>VIEW ALL ({count})</Text></Pressable>
    </View>
    {profiles.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{profiles.map((p) => <ProfileCard key={p.userId} p={p} variant="preview" />)}</ScrollView> : <Text style={{ color: colors.muted, borderWidth: 1, borderColor: border, padding: 15 }}>No profiles available yet.</Text>}
  </View>;
}

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [kundli, setKundli] = useState<any>(null);
  const [interests, setInterests] = useState(0);
  const [matches, setMatches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [{ profile: mine }, discovered, photos, received, matched, kd] = await Promise.all([
        api('/profiles/me'), api('/discover?ageMin=18&ageMax=80'), api('/photos/me'),
        api('/interests?box=received'), api('/matches'), api('/kundli/me').catch(() => null),
      ]);
      if (!mine) return router.replace('/onboarding');
      setProfile(mine); setProfiles(discovered.profiles ?? []);
      setPhotoUrl(photos.photos?.find((p: any) => p.visibility === 'public')?.url ?? null);
      setInterests(received.interests?.length ?? 0); setMatches(matched.matches?.filter((m: any) => m.profile).length ?? 0); setKundli(kd?.kundli ?? null);
    } catch (e: any) {
      if (e.code === 'PROFILE_REQUIRED') return router.replace('/onboarding');
      setError(e.message ?? 'Could not load profiles.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const ready = completion(profile);
  const firstName = profile?.displayName?.split(' ')[0] ?? 'there';
  const checklist = fields.map(([label, test]) => ({ label, done: test(profile) }));

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F0E3' }}>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={royal} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 38, height: 44, borderWidth: 2, borderColor: antique, borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="diamond-outline" size={18} color={royal} /></View><View style={{ marginLeft: 9 }}><Text style={{ color: royal, fontFamily: 'serif', fontSize: 21, fontWeight: '700' }}>KULBANDHAN</Text><Text style={{ color: dark, fontFamily: 'serif', fontSize: 10 }}>Do Kul, Ek Bandhan</Text></View></View>
        <View style={{ flexDirection: 'row', gap: 8 }}><Pressable onPress={() => router.push('/(tabs)/discover')}><Ionicons name="search-outline" size={23} color={dark} /></Pressable><Pressable onPress={() => router.push('/(tabs)/interests')}><Ionicons name="notifications-outline" size={23} color={dark} /></Pressable><Pressable onPress={() => router.push('/(tabs)/profile')}><Ionicons name="person-circle-outline" size={25} color={dark} /></Pressable></View>
      </View>

      <Arch style={{ marginTop: 10, padding: 20, minHeight: 255, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -30, top: 36, width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: '#E5D3B3', opacity: 0.7 }} />
        <Text style={{ color: royal, fontFamily: 'serif', fontSize: 16, fontStyle: 'italic' }}>Namaste,</Text>
        <Text style={{ color: dark, fontFamily: 'serif', fontSize: 35, fontWeight: '700', marginTop: 2 }}>{firstName}</Text>
        <Text style={{ color: dark, fontSize: 14, marginTop: 8 }}>जहाँ दो कुल, एक नए बंधन से जुड़ते हैं।</Text>
        <Text style={{ color: colors.muted, lineHeight: 20, marginTop: 12, maxWidth: 255 }}>Your journey toward a meaningful family connection begins here.</Text>
        <Pressable onPress={() => router.push('/(tabs)/discover')} style={{ backgroundColor: royal, alignSelf: 'flex-start', paddingHorizontal: 17, paddingVertical: 11, borderRadius: 6, marginTop: 20 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>DISCOVER PROFILES  →</Text></Pressable>
      </Arch>

      <View style={[{ marginTop: 14, padding: 16, backgroundColor: '#FBF5E8', borderWidth: 1, borderColor: border, borderRadius: 6 }, shadow]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View><Text style={{ color: royal, fontFamily: 'serif', fontSize: 20, fontWeight: '700' }}>Your Family Story</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{ready}% complete</Text></View><Pressable onPress={() => router.push('/onboarding')}><Text style={{ color: royal, fontWeight: '800', fontSize: 11 }}>CONTINUE →</Text></Pressable></View>
        <View style={{ height: 7, backgroundColor: '#E8DCC5', marginTop: 12, borderRadius: 4, overflow: 'hidden' }}><View style={{ width: `${ready}%`, height: '100%', backgroundColor: antique }} /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>{checklist.map((item) => <View key={item.label} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', paddingTop: 8 }}><Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={item.done ? colors.success : antique} /><Text style={{ color: item.done ? colors.muted : dark, fontSize: 11, marginLeft: 5 }}>{item.label}</Text></View>)}</View>
      </View>

      <View style={{ marginTop: 18, backgroundColor: royal, borderRadius: 6, padding: 18, flexDirection: 'row', alignItems: 'center' }}><Ionicons name="compass-outline" size={35} color="#D8B873" /><View style={{ flex: 1, marginLeft: 13 }}><Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 23, fontWeight: '700' }}>Discover Families</Text><Text style={{ color: '#F1E6D8', fontSize: 12, marginTop: 4 }}>Profiles aligned with your values, heritage and preferences.</Text></View><Pressable onPress={() => router.push('/(tabs)/discover')}><Text style={{ color: '#D8B873', fontWeight: '800', fontSize: 11 }}>EXPLORE →</Text></Pressable></View>

      <View style={{ marginTop: 20 }}><Text style={{ color: royal, fontFamily: 'serif', fontSize: 23, fontWeight: '700' }}>From One Kul to Another</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>Explore heritage, lineage and family compatibility.</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}><HeritageTile icon="home-outline" title="Kul" note="Explore compatibility" onPress={() => router.push('/(tabs)/discover')} /><HeritageTile icon="git-branch-outline" title="Vansh" note="Understand lineage" onPress={() => router.push('/(tabs)/discover')} /><HeritageTile icon="grid-outline" title="Gotra" note="Family traditions" onPress={() => router.push('/(tabs)/discover')} /></View></View>

      <View style={{ marginTop: 16, padding: 17, backgroundColor: '#FBF5E8', borderWidth: 1, borderColor: border, borderRadius: 6, flexDirection: 'row' }}><View style={{ flex: 1 }}><Text style={{ color: royal, fontFamily: 'serif', fontSize: 22, fontWeight: '700' }}>Kundli Milan</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Where tradition meets thoughtful compatibility.</Text>{kundli ? <Text style={{ color: dark, fontSize: 13, fontWeight: '700', marginTop: 12 }}>Your calculation is ready</Text> : <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>Complete birth details to calculate.</Text>}<Pressable onPress={() => router.push('/kundli')} style={{ backgroundColor: royal, alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 5, marginTop: 12 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{kundli ? 'VIEW ANALYSIS' : 'COMPLETE KUNDLI'}</Text></Pressable></View><View style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: antique, alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}><Ionicons name="planet-outline" size={34} color={antique} /><Text style={{ color: royal, fontSize: 10, marginTop: 3 }}>MILAN</Text></View></View>

      <View style={{ marginTop: 18, backgroundColor: '#E5D3B3', borderRadius: 6, padding: 17 }}><Text style={{ color: royal, fontFamily: 'serif', fontSize: 20, fontWeight: '700' }}>KULBANDHAN SUGGESTS</Text><Text style={{ color: dark, fontSize: 12, lineHeight: 18, marginTop: 4 }}>Thoughtfully discovered based on your preferences and family values.</Text><Text style={{ color: royal, fontSize: 12, fontWeight: '700', marginTop: 9 }}>We found {profiles.length} profiles matching your preferences.</Text></View>

      <View style={{ flexDirection: 'row', marginTop: 18, backgroundColor: '#FBF5E8', borderWidth: 1, borderColor: border, borderRadius: 6 }}><Pressable onPress={() => router.push('/(tabs)/interests')} style={{ flex: 1, alignItems: 'center', padding: 14, borderRightWidth: 1, borderRightColor: border }}><Text style={{ color: royal, fontFamily: 'serif', fontSize: 22, fontWeight: '700' }}>{interests}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>Rishta & Interests</Text></Pressable><Pressable onPress={() => router.push('/(tabs)/matches')} style={{ flex: 1, alignItems: 'center', padding: 14 }}><Text style={{ color: royal, fontFamily: 'serif', fontSize: 22, fontWeight: '700' }}>{matches}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>Connections</Text></Pressable></View>

      {loading && <ActivityIndicator color={royal} style={{ marginTop: 25 }} />}{!!error && <Text style={{ color: colors.danger, marginTop: 20, textAlign: 'center' }}>{error}</Text>}{!loading && !error && <><Rail title="Recommended for you" subtitle="Profiles matching your preferences." profiles={profiles.slice(0, 8)} count={profiles.length} onAll={() => router.push('/profiles/all?section=joined')} /><Rail title="Trusted Profiles" subtitle="Explore available verification details." profiles={profiles.slice(0, 8)} count={profiles.length} onAll={() => router.push('/profiles/all?section=active')} /><Rail title="Continue Your Search" subtitle="Profiles you may wish to explore." profiles={profiles.slice(0, 8)} count={profiles.length} onAll={() => router.push('/profiles/all?section=active')} /></>}
    </ScrollView>
  </SafeAreaView>;
}
