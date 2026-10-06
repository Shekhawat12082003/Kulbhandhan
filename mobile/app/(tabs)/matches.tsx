import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { colors } from '../../src/theme';

export default function Matches() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { setItems((await api('/matches')).matches); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <FlatList data={items.filter((m) => m.profile)} keyExtractor={(m) => m.id} contentContainerStyle={{ padding: 20 }} refreshing={loading} onRefresh={load}
        ListHeaderComponent={<Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginBottom: 16 }}>Matches</Text>}
        ListEmptyComponent={!loading ? <Text style={{ color: colors.muted, textAlign: 'center' }}>Matches appear when both sides accept.</Text> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.profile.displayName } })}
            style={{ padding: 16, borderRadius: 16, backgroundColor: colors.offWhite, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.charcoal }}>{item.profile.displayName}, {item.profile.age}</Text>
            <Text style={{ color: colors.muted }}>{item.profile.city} · Tap to chat</Text>
          </Pressable>)} />
    </SafeAreaView>
  );
}
