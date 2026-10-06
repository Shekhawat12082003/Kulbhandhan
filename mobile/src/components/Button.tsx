import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../theme';

type Props = { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; loading?: boolean; disabled?: boolean };

export function Button({ title, onPress, variant = 'primary', loading, disabled }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [s.base, s[variant], off && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.maroon} /> : (
        <Text style={[s.text, variant !== 'primary' && { color: colors.maroon }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: colors.maroon },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.maroon },
  ghost: { backgroundColor: 'transparent' },
  text: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
});
