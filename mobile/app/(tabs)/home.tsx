import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
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
    <Pressable onPress={() => router.push(`/view/${profile.userId}`)} style={[{ width: 172, height: 220, marginRight: 10 }, shadow]}>
      <ImageBackground source={require('../../assets/heritage/asset-kit/profile-card-1.png')} resizeMode="stretch" style={{ flex: 1, padding: 9 }}>
      <View style={{ height: 91, width: 91, marginLeft: 31, backgroundColor: '#E6D4B8', borderRadius: 46, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {profile.photoUrl ? <Image source={{ uri: profile.photoUrl }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={48} color={red} />}
      </View>
      <Text numberOfLines={1} style={{ color: ink, fontFamily: 'serif', fontSize: 14, fontWeight: '700', marginTop: 5 }}>{profile.displayName}, {profile.age}</Text>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>{profile.city || 'Heritage family'}</Text>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>{profile.education || profile.profession || 'Profile details'}</Text>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>{profile.heritage?.kul || 'Rajput'} · {profile.heritage?.gotra || 'Family'}</Text>
      <View style={{ backgroundColor: red, borderRadius: 3, paddingVertical: 5, alignItems: 'center', marginTop: 5 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>VIEW PROFILE</Text></View>
      </ImageBackground>
    </Pressable>
  );
}

function HeritageCard({ source, title, note }: { source: any; title: string; note: string }) {
  return <Pressable onPress={() => router.push('/(tabs)/discover')} style={{ flex: 1, height: 175, marginRight: 7 }}>
    <ImageBackground source={source} resizeMode="stretch" style={{ flex: 1, alignItems: 'center', paddingTop: 88 }}>
      <Text style={{ color: ink, fontFamily: 'serif', fontSize: 15, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 3 }}>{note}</Text>
    </ImageBackground>
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
    <ImageBackground source={require('../../assets/heritage/parchment-texture.png')} imageStyle={{ opacity: 0.22 }} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={red} />}>
      <View style={{ height: 76, backgroundColor: paper, borderBottomWidth: 1, borderBottomColor: border, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={require('../../assets/heritage/kulbandhan-mark.png')} resizeMode="contain" style={{ width: 190, height: 58 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}><Pressable onPress={() => router.push('/(tabs)/discover')}><Ionicons name="search-outline" size={22} color={ink} /></Pressable><Pressable onPress={() => router.push('/(tabs)/interests')}><Ionicons name="notifications-outline" size={22} color={ink} /></Pressable><Pressable onPress={() => router.push('/(tabs)/profile')}><Ionicons name="person-circle-outline" size={25} color={ink} /></Pressable></View>
      </View>

      <View style={{ padding: 22, paddingTop: 29, backgroundColor: '#E9D6B5', minHeight: 156, position: 'relative', overflow: 'hidden' }}>
        <Image source={require('../../assets/heritage/jharokha-arch.png')} resizeMode="contain" style={{ position: 'absolute', right: 10, top: 7, width: 105, height: 140, opacity: 0.78 }} />
        <Text style={{ color: ink, fontFamily: 'serif', fontSize: 15, fontStyle: 'italic' }}>Namaste,</Text>
        <Text style={{ color: ink, fontFamily: 'serif', fontSize: 32, fontWeight: '700', marginTop: 1 }}>{firstName}</Text>
        <Text style={{ color: ink, fontSize: 13, marginTop: 6 }}>जहाँ दो कुल, एक नए बंधन से जुड़ते हैं।</Text>
      </View>

      <ImageBackground source={require('../../assets/heritage/asset-kit/family-story-plaque.png')} resizeMode="stretch" style={[{ marginHorizontal: 18, marginTop: -1, minHeight: 145, padding: 15 }, shadow]}>
        <View style={{ marginLeft: 91, marginRight: 165 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 19, fontWeight: '700' }}>Your Family Story</Text><Text style={{ color: ink, fontSize: 11, marginTop: 3 }}>{ready}% complete</Text></View>
        <View style={{ position: 'absolute', left: 127, right: 174, top: 47, height: 7, backgroundColor: '#E8DCC5', borderRadius: 3, overflow: 'hidden' }}><View style={{ width: `${ready}%`, height: '100%', backgroundColor: red }} /></View>
        <Pressable onPress={() => router.push('/onboarding')} style={{ position: 'absolute', right: 29, top: 67, width: 143, height: 35, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>CONTINUE YOUR STORY  →</Text></Pressable>
        <View style={{ marginLeft: 91, marginTop: 25, flexDirection: 'row', flexWrap: 'wrap' }}>{checklist.map((item) => <View key={item.label} style={{ width: '33%', flexDirection: 'row', alignItems: 'center', paddingTop: 6 }}><Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={item.done ? red : gold} /><Text style={{ color: ink, fontSize: 9, marginLeft: 4 }}>{item.label}</Text></View>)}</View>
      </ImageBackground>

      <ImageBackground source={require('../../assets/heritage/asset-kit/heritage-banner.png')} resizeMode="stretch" style={{ marginHorizontal: 18, marginTop: 14, minHeight: 110, padding: 18, flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 48 }} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 22, fontWeight: '700' }}>Discover Families</Text><Text style={{ color: '#F1E6D8', fontSize: 11, marginTop: 3 }}>Explore profiles aligned with your values, heritage and preferences.</Text></View><Pressable onPress={() => router.push('/(tabs)/discover')} style={{ width: 135, height: 38, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>EXPLORE PROFILES  →</Text></Pressable></ImageBackground>

      <View style={{ marginHorizontal: 18, marginTop: 16, flexDirection: 'row' }}><View style={{ flex: 1, padding: 14, backgroundColor: paper, borderWidth: 1, borderColor: border, borderRadius: 6, marginRight: 7 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 20, fontWeight: '700' }}>From One Kul to Another</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>Explore heritage, lineage and family compatibility.</Text><View style={{ flexDirection: 'row', marginTop: 12 }}><HeritageCard source={require('../../assets/heritage/asset-kit/kul-card-template.png')} title="Kul" note="Explore Kul compatibility" /><HeritageCard source={require('../../assets/heritage/asset-kit/vansh-card-template.png')} title="Vansh" note="Understand lineage" /><HeritageCard source={require('../../assets/heritage/asset-kit/gotra-card-template.png')} title="Gotra" note="Review traditions" /></View></View><ImageBackground source={require('../../assets/heritage/asset-kit/kundli-card-template.png')} resizeMode="stretch" style={{ width: 292, minHeight: 245, padding: 14 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 20, fontWeight: '700', marginLeft: 125 }}>Kundli Milan</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 3, marginLeft: 125 }}>Where tradition meets thoughtful compatibility.</Text><Image source={require('../../assets/heritage/asset-kit/kundli-wheel.png')} style={{ position: 'absolute', left: 18, top: 27, width: 107, height: 107 }} /><Pressable onPress={() => router.push('/kundli')} style={{ position: 'absolute', left: 117, bottom: 20, width: 105, height: 30, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{kundli ? 'VIEW ANALYSIS' : 'COMPARE KUNDLI'}</Text></Pressable></ImageBackground></View>

      <ImageBackground source={require('../../assets/heritage/asset-kit/suggestions-plaque.png')} resizeMode="stretch" style={{ marginHorizontal: 18, marginTop: 14, minHeight: 88, padding: 15, flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 70 }} /><View style={{ flex: 1, marginLeft: 10 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 17, fontWeight: '700' }}>KULBANDHAN SUGGESTS</Text><Text style={{ color: ink, fontSize: 10, marginTop: 3 }}>Thoughtfully discovered based on your preferences and family values.</Text></View><Pressable onPress={() => router.push('/(tabs)/discover')} style={{ width: 135, height: 34, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>EXPLORE SUGGESTIONS →</Text></Pressable></ImageBackground>

      {loading && <ActivityIndicator color={red} style={{ marginTop: 25 }} />}
      {!!error && <Text style={{ color: colors.danger, textAlign: 'center', margin: 20 }}>{error}</Text>}
      {!loading && !error && <View style={{ marginTop: 18 }}>
        <View style={{ marginHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}><View><Text style={{ color: red, fontFamily: 'serif', fontSize: 23, fontWeight: '700' }}>Recommended for you</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>Profiles matching your preferences.</Text></View><Pressable onPress={() => router.push('/profiles/all?section=joined')}><Text style={{ color: red, fontSize: 10, fontWeight: '700' }}>VIEW ALL →</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 18, paddingTop: 12 }}>{profiles.slice(0, 8).map((p) => <MiniPortrait key={p.userId} profile={p} />)}</ScrollView>
        <View style={{ flexDirection: 'row', marginHorizontal: 18, marginTop: 15, gap: 8 }}><Pressable onPress={() => router.push('/(tabs)/profile')} style={{ flex: 1, padding: 15, backgroundColor: paper, borderWidth: 1, borderColor: border, borderRadius: 6 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 15, fontWeight: '700' }}>Your Heritage & Family</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>Keep your family's legacy alive.</Text><Text style={{ color: red, fontSize: 10, fontWeight: '700', marginTop: 9 }}>MANAGE DETAILS  →</Text></Pressable><Pressable onPress={() => router.push('/kundli')} style={{ flex: 1, padding: 15, backgroundColor: paper, borderWidth: 1, borderColor: border, borderRadius: 6 }}><Text style={{ color: red, fontFamily: 'serif', fontSize: 15, fontWeight: '700' }}>Your Kundli</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>{kundli ? 'Your astrological profile is ready.' : 'Complete your birth details.'}</Text><Text style={{ color: red, fontSize: 10, fontWeight: '700', marginTop: 9 }}>VIEW KUNDLI  →</Text></Pressable></View>
      </View>}
      <View style={{ marginHorizontal: 18, marginTop: 15, flexDirection: 'row', backgroundColor: maroon, borderRadius: 6 }}><Pressable onPress={() => router.push('/(tabs)/interests')} style={{ flex: 1, alignItems: 'center', padding: 12, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.3)' }}><Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 21 }}>{interestCount}</Text><Text style={{ color: '#E8DCC5', fontSize: 10 }}>INTERESTS</Text></Pressable><Pressable onPress={() => router.push('/(tabs)/matches')} style={{ flex: 1, alignItems: 'center', padding: 12 }}><Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 21 }}>{matchCount}</Text><Text style={{ color: '#E8DCC5', fontSize: 10 }}>CONNECTIONS</Text></Pressable></View>
    </ScrollView>
    </ImageBackground>
  </SafeAreaView>;
}
