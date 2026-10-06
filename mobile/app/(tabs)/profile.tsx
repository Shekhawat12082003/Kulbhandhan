import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../src/components/Screen';
import { PhotoGrid } from '../../src/components/PhotoGrid';
import { Button } from '../../src/components/Button';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { colors } from '../../src/theme';

const MIME: Record<string, 'image/jpeg' | 'image/png'> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export default function Profile() {
  const { signOut } = useAuth();
  const [photos, setPhotos] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(true);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, { profile }] = await Promise.all([api('/photos/me'), api('/profiles/me')]);
      setPhotos(d.photos); setPending(d.pendingRequests); setPublished(profile?.published ?? false);
    } catch { /* ignore */ }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Photo library permission is needed to add a photo.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true });
    if (result.canceled || !result.assets[0].base64) return;
    const ext = (result.assets[0].uri.split('.').pop() ?? 'jpg').toLowerCase();
    const mimeType = MIME[ext] ?? 'image/jpeg';
    setBusy(true);
    try {
      await api('/photos', 'POST', { dataUri: `data:${mimeType};base64,${result.assets[0].base64}`, mimeType, visibility: 'public' });
      await load();
    } catch (e: any) { Alert.alert('Could not upload photo', e.message); } finally { setBusy(false); }
  }
  async function toggleVisibility(id: string, current: string) {
    try { await api(`/photos/${id}/visibility`, 'PATCH', { visibility: current === 'public' ? 'private' : 'public' }); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  }
  async function removePhoto(id: string) {
    try { await api(`/photos/${id}`, 'DELETE'); await load(); } catch (e: any) { Alert.alert('Error', e.message); }
  }
  async function respond(id: string, action: 'allow' | 'reject') {
    try { await api(`/photo-requests/${id}/respond`, 'POST', { action }); await load(); } catch (e: any) { Alert.alert('Error', e.message); }
  }
  async function toggleProfileVisibility() {
    setVisibilityBusy(true);
    try {
      const result = await api('/profiles/me/visibility', 'PATCH', { published: !published });
      setPublished(result.published);
    } catch (e: any) { Alert.alert('Could not update profile visibility', e.message); }
    finally { setVisibilityBusy(false); }
  }
  async function deleteAccount() {
    setDeleting(true);
    try {
      await api('/account/me', 'DELETE');
      await signOut();
      router.replace('/auth/welcome');
    } catch (e: any) { Alert.alert('Could not delete account', e.message); }
    finally { setDeleting(false); }
  }

  return (
    <Screen>
      <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginVertical: 24 }}>Profile</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>
        Your profile is {published ? 'visible to members in Discover.' : 'paused and hidden from Discover.'}
      </Text>
      <Button title={published ? 'Pause profile' : 'Resume profile'} variant="secondary" loading={visibilityBusy}
        onPress={() => Alert.alert(published ? 'Pause your profile?' : 'Resume your profile?',
          published ? 'Your profile will be hidden from Discover. You can resume it any time.' : 'Your profile will appear in Discover again.', [
            { text: 'Cancel', style: 'cancel' }, { text: published ? 'Pause' : 'Resume', onPress: toggleProfileVisibility },
          ])} />
      <View style={{ height: 20 }} />
      <Text style={{ fontFamily: 'serif', fontSize: 18, color: colors.maroon, marginBottom: 8 }}>Photos</Text>
      <PhotoGrid photos={photos} onPressPhoto={(id) => {
        const p = photos.find((x) => x.id === id);
        Alert.alert(p.visibility === 'public' ? 'Make private?' : 'Make public?', undefined, [
          { text: 'Cancel', style: 'cancel' }, { text: 'Toggle', onPress: () => toggleVisibility(id, p.visibility) },
          { text: 'Delete', style: 'destructive', onPress: () => removePhoto(id) },
        ]);
      }} />
      {busy ? <ActivityIndicator color={colors.maroon} /> : <Button title="Add Photo" variant="secondary" onPress={addPhoto} />}
      {pending.length > 0 && <>
        <Text style={{ fontFamily: 'serif', fontSize: 16, color: colors.maroon, marginTop: 16, marginBottom: 4 }}>Photo Access Requests</Text>
        {pending.map((r) => (
          <View key={r.id} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <Text style={{ flex: 1, color: colors.charcoal, paddingTop: 12 }}>Someone requested access</Text>
            <Button title="Allow" onPress={() => respond(r.id, 'allow')} />
            <Button title="Reject" variant="secondary" onPress={() => respond(r.id, 'reject')} />
          </View>))}
      </>}
      <View style={{ height: 16 }} />
      <Button title="Verification" variant="secondary" onPress={() => router.push('/verification')} />
      <Button title="Premium" onPress={() => router.push('/premium')} />
      <Button title="My Kundli" variant="secondary" onPress={() => router.push('/kundli')} />
      <Button title="Edit Profile" onPress={() => router.push('/onboarding')} />
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 12 }}>
        Deleting your account removes your profile, photos, and login details. Chat content is removed; retained payment, safety, and audit records are anonymized. This cannot be undone.
      </Text>
      <Button title="Delete account" variant="ghost" loading={deleting} onPress={() => Alert.alert('Delete your account permanently?',
        'Your profile, photos, and login details will be deleted. Retained payment, safety, and audit records will be anonymized.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Delete account', style: 'destructive', onPress: deleteAccount },
        ])} />
      <Button title="Log out" variant="ghost" onPress={async () => { try { await signOut(); router.replace('/auth/welcome'); } catch { Alert.alert('Could not log out'); } }} />
    </Screen>
  );
}
