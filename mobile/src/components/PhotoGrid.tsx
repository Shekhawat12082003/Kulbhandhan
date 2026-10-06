import { Image, Pressable, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export function PhotoGrid({ photos, onPressPhoto }: { photos: { id: string; url: string | null; visibility: string; locked?: boolean }[]; onPressPhoto?: (id: string) => void }) {
  if (!photos.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {photos.map((p) => (
        <Pressable key={p.id} onPress={() => onPressPhoto?.(p.id)} style={{ width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.beige }}>
          {p.locked || !p.url
            ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>🔒</Text></View>
            : <Image source={{ uri: p.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
        </Pressable>))}
    </View>
  );
}
