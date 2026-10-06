import { Text, View } from 'react-native';
import { colors, radius } from '../theme';

export function Section({ title, rows, locked }: { title: string; rows?: [string, any][]; locked?: string }) {
  return (
    <View style={{ backgroundColor: colors.offWhite, borderRadius: radius.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontFamily: 'serif', fontSize: 18, color: colors.maroon, marginBottom: 8 }}>{locked ? '🔒 ' : ''}{title}</Text>
      {locked ? <Text style={{ color: colors.muted }}>{locked}</Text> :
        rows?.filter(([, v]) => v).map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', marginVertical: 3 }}>
            <Text style={{ width: 110, color: colors.muted }}>{k}</Text><Text style={{ flex: 1, color: colors.charcoal }}>{String(v)}</Text>
          </View>))}
    </View>
  );
}
