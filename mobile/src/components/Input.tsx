import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius } from '../theme';

export function Input({ label, error, ...rest }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[s.input, !!error && { borderColor: colors.danger }]}
        accessibilityLabel={label}
        {...rest}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, color: colors.muted, marginBottom: 6, fontWeight: '500' },
  input: {
    minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, fontSize: 16, color: colors.charcoal, backgroundColor: colors.offWhite,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
