import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { PhotoGrid } from '../../src/components/PhotoGrid';
import { Section } from '../../src/components/Section';
import { VerifiedBadges } from '../../src/components/VerifiedBadges';
import { Button } from '../../src/components/Button';
import { api } from '../../src/lib/api';
import { colors } from '../../src/theme';

export default function ViewProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const load = () => api(`/profiles/${id}`).then(setData).catch((e) => Alert.alert('Error', e.message, [{ text: 'OK', onPress: () => router.back() }]));
  useEffect(() => { load(); }, [id]);
  const [photoData, setPhotoData] = useState<any>(null);
  useEffect(() => { if (id) api(`/photos/user/${id}`).then(setPhotoData).catch(() => {}); }, [id]);
  async function report(reason: string) {
    try { await api('/reports', 'POST', { reportedUserId: p.userId, reason }); Alert.alert('Thank you', 'Your report has been submitted.'); }
    catch (e: any) { Alert.alert('Error', e.message); }
  }
  async function block() {
    try { await api('/blocks', 'POST', { userId: p.userId }); Alert.alert('Blocked'); router.back(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  }
  async function requestPhotos() {
    try { await api(`/photos/user/${id}/request-access`, 'POST'); const d = await api(`/photos/user/${id}`); setPhotoData(d); }
    catch (e: any) { Alert.alert('Error', e.message); }
  }
  if (!data) return <Screen><ActivityIndicator color={colors.maroon} style={{ marginTop: 80 }} /></Screen>;
  const { profile: p, interest } = data;
  const lvl = p.access;
  const primaryPhoto = photoData?.photos?.find((photo: any) => !photo.locked && photo.url);

  async function interestTap() {
    setBusy(true);
    try {
      const r = await api('/interests', 'POST', { toUserId: p.userId });
      if (r.status === 'matched') Alert.alert("🎉 You're Matched!", 'You can now start a conversation.');
      await load();
    } catch (e: any) { Alert.alert('Could not send interest', e.message); } finally { setBusy(false); }
  }
  async function unlockTap() {
    setUnlocking(true);
    try {
      const order = await api('/payments/orders', 'POST', { product: 'profile_unlock', targetUserId: p.userId });
      if (order.mock) { await api('/payments/dev-confirm', 'POST', { orderId: order.orderId }); await load(); }
      else Alert.alert('Razorpay checkout not wired into this screen yet.', 'Open Razorpay Checkout with this order and call /payments/verify.');
    } catch (e: any) { Alert.alert('Could not unlock', e.message); } finally { setUnlocking(false); }
  }
  const action = lvl === 'matched' ? <Button title="Matched" variant="secondary" onPress={() => router.push('/(tabs)/matches')} />
    : interest?.status === 'pending' ? <Button title={interest.direction === 'sent' ? 'Interest Sent' : 'Respond in Interests'} variant="secondary"
        onPress={() => interest.direction === 'received' && router.push('/(tabs)/interests')} />
    : <Button title="❤️ Send Interest" onPress={interestTap} loading={busy} />;
  const unlockAction = lvl === 'basic' && (
    <Button title="🔓 Unlock Detailed Profile — ₹99" variant="secondary" onPress={unlockTap} loading={unlocking} />
  );

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: '', headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.maroon }} />
      <View style={{ height: 300, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.beige, marginBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
        {primaryPhoto
          ? <Image source={{ uri: primaryPhoto.url }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          : <Text style={{ color: colors.muted }}>Profile image unavailable</Text>}
      </View>
      <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon }}>{p.displayName}, {p.age}</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{[p.city, p.profession].filter(Boolean).join(' · ')}</Text>
<VerifiedBadges badges={p.badges} />
      {p.isTestData && <Text style={{ color: colors.gold, marginBottom: 8 }}>Development test profile</Text>}
      {photoData && <>
        <PhotoGrid photos={photoData.photos} />
        {photoData.photos.some((ph: any) => ph.locked) && photoData.accessStatus === 'none' && (
          <Button title="Request Photo Access" variant="secondary" onPress={requestPhotos} />
        )}
        {photoData.accessStatus === 'pending' && <Text style={{ color: colors.muted, marginBottom: 12 }}>Photo access request pending.</Text>}
      </>}
      {action}
      {unlockAction ? <><View style={{ height: 8 }} />{unlockAction}</> : null}
      {lvl === 'matched' && <><View style={{ height: 8 }} /><Button title="View Compatibility" variant="secondary" onPress={() => router.push(`/compat/${p.userId}`)} /></>}
      {lvl !== 'self' && <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View style={{ flex: 1 }}><Button title="Report" variant="ghost" onPress={() => Alert.alert('Report profile', 'Reason?', [
          { text: 'Fake profile', onPress: () => report('fake_profile') }, { text: 'Scam', onPress: () => report('scam') },
          { text: 'Harassment', onPress: () => report('harassment') }, { text: 'Cancel', style: 'cancel' }])} /></View>
        <View style={{ flex: 1 }}><Button title="Block" variant="ghost" onPress={() => Alert.alert('Block this user?', 'You will no longer see or be contacted by them.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Block', style: 'destructive', onPress: block }])} /></View>
      </View>}
      <Text style={{ height: 16 }} />
      <Section title="Personal" rows={[['Education', p.education], ['Profession', p.profession], ['Height', p.heightCm && `${p.heightCm} cm`], ['About', p.about]]} />
      <Section title="Rajput Heritage" rows={[['Kul', p.heritage?.kul], ['Gotra', p.heritage?.gotra], ['Vansh', p.heritage?.vansh], ['Native place', p.heritage?.nativePlace]]} />
      {lvl === 'basic'
        ? <Section title="Family" locked="Send interest, or unlock this profile, to view family details." />
        : <Section title="Family" rows={[['Introduction', p.family?.intro], ['Type', p.family?.type], ['Values', p.family?.values]]} />}
      {lvl === 'matched' || lvl === 'self'
        ? <><Section title="Lineage" rows={[['Paternal', p.lineage?.paternal], ['Maternal', p.lineage?.maternal]]} />
            </>
          : <Section title="Lineage" locked="Visible after a mutual match." />}
    </Screen>
  );
}
