import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { colors, shadow } from '../../src/theme';

const red = '#741F32';
const maroon = '#5A1726';
const gold = '#B08A45';
const sandstone = '#C8A77A';
const ink = '#2C211B';
const paper = '#FBF5E8';
const border = '#D6BE98';

const storyFields = [
  ['Personal Details', (p: any) => Boolean(p?.displayName && p?.city)],
  ['Education', (p: any) => Boolean(p?.education)],
  ['Profession', (p: any) => Boolean(p?.profession)],
  ['Family', (p: any) => Boolean(p?.family?.intro)],
  ['Kul & Vansh', (p: any) => Boolean(p?.heritage?.kul && p?.heritage?.vansh)],
  ['Gotra', (p: any) => Boolean(p?.heritage?.gotra)],
  ['Kundli', (p: any) => Boolean(p?.birthDetails?.birthTime)],
  ['Verification', (p: any) => Boolean(p?.badges?.length)],
] as const;

function percent(profile: any) {
  return Math.round(storyFields.filter(([, check]) => check(profile)).length / storyFields.length * 100);
}

function MiniPortrait({ profile }: { profile: any }) {
  return (
    <Pressable onPress={() => router.push(`/view/${profile.userId}`)} style={[{ width: 132, backgroundColor: paper, borderWidth: 1, borderColor: border, borderRadius: 5, padding: 6, marginRight: 10 }, shadow]}>
      <View style={{ height: 132, backgroundColor: '#E6D4B8', borderRadius: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {profile.photoUrl ? <Image source={{ uri: profile.photoUrl }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={48} color={red} />}
      </View>
      <Text numberOfLines={1} style={{ color: red, fontFamily: 'serif', fontSize: 14, fontWeight: '700', marginTop: 7 }}>{profile.displayName}</Text>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>{profile.age}{profile.city ? ` · ${profile.city}` : ''}</Text>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>{profile.profession || profile.education || 'Profile details'}</Text>
      <View style={{ backgroundColor: red, borderRadius: 3, paddingVertical: 6, alignItems: 'center', marginTop: 7 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>VIEW PROFILE</Text></View>
    </Pressable>
  );
}

function HeritageCard({ icon, title, note }: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string }) {
  return <Pressable onPress={() => router.push('/(tabs)/discover')} style={{ flex: 1, minHeight: 108, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: border, backgroundColor: paper, marginRight: 7 }}>
    <Ionicons name={icon} size={25} color={gold} />
    <Text style={{ color: ink, fontFamily: 'serif', fontSize: 15, fontWeight: '700', marginTop: 8 }}>{title}</Text>
    <Text style={{ color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 3 }}>{note}</Text>
  </Pressable>;
}

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [kundli, setKundli] = useState<any>(null);
  const [interestCount, setInterestCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [{ profile: mine }, discovered, photos, received, matches, kundliResponse] = await Promise.all([
        api('/profiles/me'), api('/discover?ageMin=18&ageMax=80'), api('/photos/me'),
        api('/interests?box=received'), api('/matches'), api('/kundli/me').catch(() => null),
      ]);
      if (!mine) return router.replace('/onboarding');
      setProfile(mine); setProfiles(discovered.profiles ?? []);
      setPhotoUrl(photos.photos?.find((p: any) => p.visibility === 'public')?.url ?? null);
      setInterestCount(received.interests?.length ?? 0);
      setMatchCount(matches.matches?.filter((m: any) => m.profile).length ?? 0);
      setKundli(kundliResponse?.kundli ?? null);
    } catch (e: any) {
      if (e.code === 'PROFILE_REQUIRED') return router.replace('/onboarding');
      setError(e.message ?? 'Could not load your dashboard.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const ready = percent(profile);
  const firstName = profile?.displayName?.split(' ')[0] ?? 'there';
  const checklist = storyFields.map(([label, check]) => ({ label, done: check(profile) }));

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F0E3' }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={red} />}>
      <View style={{ height: 76, backgroundColor: paper, borderBottomWidth: 1, borderBottomColor: border, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 36, height: 45, borderWidth: 2, borderColor: gold, borderTopLeftRadius: 19, borderTopRightRadius: 19, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="home-outline" size={18} color={red} /></View>
          <View style={{ marginLeft: 9 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 20, fontWeight: '700' }}>KULBANDHAN</Text><Text style={{ color: ink, fontFamily: 'serif', fontSize: 10 }}>Do Kul, Ek Bandhan</Text></View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}><Pressable onPress={() => router.push('/(tabs)/discover')}><Ionicons name="search-outline" size={22} color={ink} /></Pressable><Pressable onPress={() => router.push('/(tabs)/interests')}><Ionicons name="notifications-outline" size={22} color={ink} /></Pressable><Pressable onPress={() => router.push('/(tabs)/profile')}><Ionicons name="person-circle-outline" size={25} color={ink} /></Pressable></View>
      </View>

      <View style={{ padding: 22, paddingTop: 29, backgroundColor: '#E9D6B5', minHeight: 156, position: 'relative', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -15, top: -80, width: 250, height: 250, borderWidth: 13, borderColor: 'rgba(90,23,38,0.25)', borderRadius: 125 }} />
        <Text style={{ color: ink, fontFamily: 'serif', fontSize: 15, fontStyle: 'italic' }}>Namaste,</Text>
        <Text style={{ color: ink, fontFamily: 'serif', fontSize: 32, fontWeight: '700', marginTop: 1 }}>{firstName}</Text>
        <Text style={{ color: ink, fontSize: 13, marginTop: 6 }}>जहाँ दो कुल, एक नए बंधन से जुड़ते हैं।</Text>
      </View>

      <View style={[{ marginHorizontal: 18, marginTop: -1, padding: 15, backgroundColor: paper, borderWidth: 1, borderColor: border, borderRadius: 7 }, shadow]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={{ color: red, fontFamily: 'serif', fontSize: 19, fontWeight: '700' }}>Your Family Story</Text><Text style={{ color: ink, fontSize: 11, marginTop: 3 }}>{ready}% complete</Text></View><Pressable onPress={() => router.push('/onboarding')} style={{ backgroundColor: red, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 5 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>CONTINUE YOUR STORY  →</Text></Pressable></View>
        <View style={{ height: 7, backgroundColor: '#E8DCC5', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}><View style={{ width: `${ready}%`, height: '100%', backgroundColor: red }} /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>{checklist.map((item) => <View key={item.label} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', paddingTop: 7 }}><Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={item.done ? red : gold} /><Text style={{ color: ink, fontSize: 10, marginLeft: 5 }}>{item.label}</Text></View>)}</View>
      </View>

      <View style={{ marginHorizontal: 18, marginTop: 14, padding: 18, backgroundColor: maroon, borderRadius: 7, flexDirection: 'row', alignItems: 'center' }}><Ionicons name="compass-outline" size={38} color="#D8B873" /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 22, fontWeight: '700' }}>Discover Families</Text><Text style={{ color: '#F1E6D8', fontSize: 11, marginTop: 3 }}>Explore profiles aligned with your values, heritage and preferences.</Text></View><Pressable onPress={() => router.push('/(tabs)/discover')}><Text style={{ color: '#D8B873', fontSize: 11, fontWeight: '700' }}>EXPLORE  →</Text></Pressable></View>

      <View style={{ marginHorizontal: 18, marginTop: 16, flexDirection: 'row' }}><View style={{ flex: 1, padding: 14, backgroundColor: paper, borderWidth: 1, borderColor: border, borderRadius: 6, marginRight: 7 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 20, fontWeight: '700' }}>From One Kul to Another</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>Explore heritage, lineage and family compatibility.</Text><View style={{ flexDirection: 'row', marginTop: 12 }}><HeritageCard icon="home-outline" title="Kul" note="Compatibility" /><HeritageCard icon="git-branch-outline" title="Vansh" note="Lineage" /><HeritageCard icon="grid-outline" title="Gotra" note="Traditions" /></View></View><View style={{ width: 155, padding: 14, backgroundColor: paper, borderWidth: 1, borderColor: border, borderRadius: 6 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 20, fontWeight: '700' }}>Kundli Milan</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>Where tradition meets thoughtful compatibility.</Text><View style={{ alignItems: 'center', marginTop: 12 }}><View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: gold, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="planet-outline" size={27} color={gold} /><Text style={{ color: red, fontSize: 9, marginTop: 2 }}>{kundli ? 'READY' : 'MILAN'}</Text></View></View><Pressable onPress={() => router.push('/kundli')} style={{ backgroundColor: red, paddingVertical: 8, borderRadius: 4, alignItems: 'center', marginTop: 11 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{kundli ? 'VIEW ANALYSIS' : 'COMPARE KUNDLI'}</Text></Pressable></View></View>

      <View style={{ marginHorizontal: 18, marginTop: 14, padding: 15, backgroundColor: '#E5D3B3', borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}><Ionicons name="sparkles-outline" size={26} color={red} /><View style={{ flex: 1, marginLeft: 10 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 17, fontWeight: '700' }}>KULBANDHAN SUGGESTS</Text><Text style={{ color: ink, fontSize: 10, marginTop: 3 }}>Thoughtfully discovered based on your preferences and family values.</Text></View><Pressable onPress={() => router.push('/(tabs)/discover')}><Text style={{ color: red, fontSize: 10, fontWeight: '700' }}>EXPLORE →</Text></Pressable></View>

      {loading && <ActivityIndicator color={red} style={{ marginTop: 25 }} />}
      {!!error && <Text style={{ color: colors.danger, textAlign: 'center', margin: 20 }}>{error}</Text>}
      {!loading && !error && <View style={{ marginTop: 18 }}>
        <View style={{ marginHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}><View><Text style={{ color: red, fontFamily: 'serif', fontSize: 23, fontWeight: '700' }}>Recommended for you</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>Profiles matching your preferences.</Text></View><Pressable onPress={() => router.push('/profiles/all?section=joined')}><Text style={{ color: red, fontSize: 10, fontWeight: '700' }}>VIEW ALL →</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 18, paddingTop: 12 }}>{profiles.slice(0, 8).map((p) => <MiniPortrait key={p.userId} profile={p} />)}</ScrollView>
        <View style={{ flexDirection: 'row', marginHorizontal: 18, marginTop: 15, gap: 8 }}><Pressable onPress={() => router.push('/(tabs)/profile')} style={{ flex: 1, padding: 15, backgroundColor: paper, borderWidth: 1, borderColor: border, borderRadius: 6 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 15, fontWeight: '700' }}>Your Heritage & Family</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>Keep your family's legacy alive.</Text><Text style={{ color: red, fontSize: 10, fontWeight: '700', marginTop: 9 }}>MANAGE DETAILS  →</Text></Pressable><Pressable onPress={() => router.push('/kundli')} style={{ flex: 1, padding: 15, backgroundColor: paper, borderWidth: 1, borderColor: border, borderRadius: 6 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 15, fontWeight: '700' }}>Your Kundli</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>{kundli ? 'Your astrological profile is ready.' : 'Complete your birth details.'}</Text><Text style={{ color: red, fontSize: 10, fontWeight: '700', marginTop: 9 }}>VIEW KUNDLI  →</Text></Pressable></View>
      </View>}
      <View style={{ marginHorizontal: 18, marginTop: 15, flexDirection: 'row', backgroundColor: maroon, borderRadius: 6 }}><Pressable onPress={() => router.push('/(tabs)/interests')} style={{ flex: 1, alignItems: 'center', padding: 12, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.3)' }}><Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 21 }}>{interestCount}</Text><Text style={{ color: '#E8DCC5', fontSize: 10 }}>INTERESTS</Text></Pressable><Pressable onPress={() => router.push('/(tabs)/matches')} style={{ flex: 1, alignItems: 'center', padding: 12 }}><Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 21 }}>{matchCount}</Text><Text style={{ color: '#E8DCC5', fontSize: 10 }}>CONNECTIONS</Text></Pressable></View>
    </ScrollView>
  </SafeAreaView>;
}
