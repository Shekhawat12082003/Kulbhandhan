import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme';
import { VerifiedBadges } from './VerifiedBadges';

export function ProfileCard({ p, children, variant = 'full' }: { p: any; children?: React.ReactNode; variant?: 'full' | 'preview' }) {
  if (variant === 'preview') return (
    <Pressable onPress={() => router.push(`/view/${p.userId}`)} accessibilityRole="button"
      accessibilityLabel={`${p.displayName}, age ${p.age}${p.heightCm ? `, height ${p.heightCm} centimeters` : ''}`}
      style={[{ width: 224, backgroundColor: colors.offWhite, borderRadius: 6, padding: 8, marginRight: 12, borderWidth: 1, borderColor: colors.border }, shadow]}>
      <View style={{ width: '100%', height: 228, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.beige, alignItems: 'center', justifyContent: 'center' }}>
        {p.photoUrl
          ? <Image source={{ uri: p.photoUrl }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          : <Ionicons name="person" size={84} color={colors.maroon} />}
      </View>
      <Text numberOfLines={1} style={{ color: colors.charcoal, fontSize: 17, fontWeight: '600', marginTop: 10 }}>{p.displayName}</Text>
      <Text numberOfLines={1} style={{ color: colors.muted, marginTop: 3 }}>{p.age} years{p.heightCm ? ` · ${p.heightCm} cm` : ''}</Text>
    </Pressable>
  );

  return (
    <Pressable onPress={() => router.push(`/view/${p.userId}`)} accessibilityRole="button"
      style={[{ backgroundColor: colors.offWhite, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }, shadow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.beige, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
          <Text style={{ fontFamily: 'serif', fontSize: 22, color: colors.maroon }}>{p.displayName?.[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.charcoal }}>{p.displayName}, {p.age}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{[p.city, p.education, p.profession].filter(Boolean).join(' · ')}</Text>
          {!!p.heritage?.kul && <Text style={{ color: colors.gold, marginTop: 2 }}>Kul: {p.heritage.kul}{p.heritage.gotra ? ` · Gotra: ${p.heritage.gotra}` : ''}</Text>}
          <VerifiedBadges badges={p.badges} />
        </View>
      </View>
      {children}
    </Pressable>
  );
}
