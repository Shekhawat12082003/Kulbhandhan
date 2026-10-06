import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { ProfileCard } from '../../src/components/ProfileCard';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/theme';

export default function Interests() {
  const [box, setBox] = useState<'received' | 'sent'>('received');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async (b = box) => {
    setLoading(true);
    try { setItems((await api(`/interests?box=${b}`)).interests); } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, [box]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function respond(id: string, action: 'accept' | 'decline') {
    try {
      const r = await api(`/interests/${id}/respond`, 'POST', { action });
      if (r.status === 'matched') Alert.alert("🎉 You're Matched!", 'You can now start a conversation.', [{ text: 'Open Matches', onPress: () => router.push('/(tabs)/matches') }]);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <FlatList data={items} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 20 }} refreshing={loading} onRefresh={() => load()}
        ListHeaderComponent={<View>
          <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginBottom: 16 }}>Interests</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
            {(['received', 'sent'] as const).map((b) => (
              <Pressable key={b} onPress={() => { setBox(b); load(b); }} style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: box === b ? colors.maroon : colors.beige }}>
                <Text style={{ color: box === b ? '#fff' : colors.charcoal, textTransform: 'capitalize' }}>{b}</Text>
              </Pressable>))}
          </View></View>}
        ListEmptyComponent={!loading ? <Text style={{ color: colors.muted, textAlign: 'center' }}>Nothing here yet.</Text> : null}
        renderItem={({ item }) => (
          <ProfileCard p={item.profile}>
            {box === 'received'
              ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <View style={{ flex: 1 }}><Button title="Accept" onPress={() => respond(item.id, 'accept')} /></View>
                  <View style={{ flex: 1 }}><Button title="Decline" variant="secondary" onPress={() => respond(item.id, 'decline')} /></View>
                </View>
              : <Text style={{ marginTop: 10, color: colors.gold, textTransform: 'capitalize' }}>{item.status}</Text>}
          </ProfileCard>)} />
    </SafeAreaView>
  );
}
