import { Text, View } from 'react-native';
import { colors } from '../theme';

const LABEL: Record<string, string> = { phone: 'Mobile Verified', photo: 'Photo Verified', identity: 'ID Verified', education: 'Education Verified', family: 'Family Verified' };

export function VerifiedBadges({ badges }: { badges?: string[] }) {
  if (!badges?.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {badges.map((b) => (
        <View key={b} style={{ backgroundColor: colors.beige, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: colors.maroon, fontSize: 11 }}>✓ {LABEL[b] ?? b}</Text>
        </View>))}
    </View>
  );
}
