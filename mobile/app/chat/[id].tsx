import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View, Pressable } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { getSocket } from '../../src/lib/socket';
import { colors } from '../../src/theme';

export default function Chat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [connected, setConnected] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [flag, setFlag] = useState<any>(null);
  const list = useRef<FlatList>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { setMsgs((await api(`/chat/${id}/messages`)).messages); } catch (e: any) { setErr(e.message); }
      const socket = await getSocket();
      if (!mounted) return;
      socket.emit('joinConversation', id, (ok: boolean) => { if (mounted) { setConnected(ok); if (!ok) setErr('Could not open this conversation.'); else socket.emit('messageSeen', id); } });

      const onMsg = (m: any) => { if (m.matchId === id) { setMsgs((s) => [...s, { id: m.id, mine: false, text: m.text, at: m.at, seen: false }]); if (m.flag) setFlag(m.flag); socket.emit('messageSeen', id); } };
      const onSeen = (p: any) => { if (p.matchId === id) setMsgs((s) => s.map((m) => (m.mine ? { ...m, seen: true } : m))); };
      const onTypingStart = (p: any) => p.matchId === id && setPeerTyping(true);
      const onTypingStop = (p: any) => p.matchId === id && setPeerTyping(false);
      socket.on('messageReceived', onMsg); socket.on('messageSeen', onSeen);
      socket.on('typingStart', onTypingStart); socket.on('typingStop', onTypingStop);
      socket.on('connect', () => setConnected(true)); socket.on('disconnect', () => setConnected(false));

      return () => { socket.off('messageReceived', onMsg); socket.off('messageSeen', onSeen); socket.off('typingStart', onTypingStart); socket.off('typingStop', onTypingStop); socket.emit('leaveConversation', id); };
    })();
    return () => { mounted = false; };
  }, [id]);

  async function send() {
    const t = text.trim(); if (!t) return;
    setText('');
    try {
      const socket = await getSocket();
      socket.emit('sendMessage', { matchId: id, text: t }, (res: any) => {
        if (res?.ok) setMsgs((s) => [...s, { id: res.id, mine: true, text: t, at: new Date().toISOString(), seen: false }]);
        else setErr('Message could not be sent.');
      });
    } catch { setErr('Message could not be sent.'); }
  }
  function onChangeText(v: string) {
    setText(v);
    getSocket().then((s) => s.emit(v ? 'typingStart' : 'typingStop', id));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Stack.Screen options={{ headerShown: true, title: name ?? 'Chat', headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.maroon }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {!connected && <Text style={{ textAlign: 'center', color: colors.muted, padding: 4 }}>Connecting…</Text>}
        {flag && (
          <View style={{ backgroundColor: colors.beige, margin: 12, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontWeight: '600', color: colors.maroon, marginBottom: 4 }}>⚠ Safety Reminder</Text>
            <Text style={{ color: colors.charcoal, marginBottom: 8 }}>{flag.label}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setFlag(null)} style={{ paddingVertical: 6 }}><Text style={{ color: colors.muted }}>Continue</Text></Pressable>
            </View>
          </View>
        )}
        <FlatList ref={list} data={msgs} keyExtractor={(m) => m.id} contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 24 }}>Say Namaste 🙏</Text>}
          renderItem={({ item }) => (
            <View style={{ alignSelf: item.mine ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 8, padding: 12, borderRadius: 14,
              backgroundColor: item.mine ? colors.maroon : colors.beige }}>
              <Text style={{ color: item.mine ? '#fff' : colors.charcoal }}>{item.text}</Text>
              {item.mine && <Text style={{ color: '#ddd', fontSize: 10, alignSelf: 'flex-end', marginTop: 2 }}>{item.seen ? 'Seen' : 'Sent'}</Text>}
            </View>)} />
        {peerTyping && <Text style={{ color: colors.muted, paddingHorizontal: 16, paddingBottom: 4 }}>Typing…</Text>}
        {!!err && <Text style={{ color: colors.danger, paddingHorizontal: 16 }}>{err}</Text>}
        <View style={{ flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: colors.border }}>
          <TextInput value={text} onChangeText={onChangeText} onBlur={() => getSocket().then((s) => s.emit('typingStop', id))}
            placeholder="Write a message" style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff' }} />
          <Pressable onPress={send} style={{ minWidth: 64, borderRadius: 12, backgroundColor: colors.maroon, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Send</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
