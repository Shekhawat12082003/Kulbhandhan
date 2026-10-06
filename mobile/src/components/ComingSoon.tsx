import { Text, View } from 'react-native';
import { Screen } from './Screen';
import { colors } from '../theme';

export function ComingSoon({ title, phase, children }: { title: string; phase: string; children?: React.ReactNode }) {
  return (
    <Screen>
      <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginVertical: 24 }}>{title}</Text>
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20, backgroundColor: colors.offWhite }}>
        <Text style={{ color: colors.muted }}>This section is built in {phase}.</Text>
      </View>
      <View style={{ marginTop: 24 }}>{children}</View>
    </Screen>
  );
}
