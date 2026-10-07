import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/theme';

export default function Welcome() {
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, backgroundColor: colors.ivory, padding: 20, justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.maroon, fontSize: 12, fontWeight: '700', letterSpacing: 2 }}>KULBANDHAN</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold }} />
              <Text style={{ color: colors.muted, fontSize: 11 }}>PRIVATE CIRCLE</Text>
            </View>
          </View>

          <View style={{ marginTop: 34, backgroundColor: colors.maroon, borderRadius: 28, padding: 24, minHeight: 310, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', right: -42, top: -42, width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: 'rgba(231,198,106,0.35)' }} />
            <View style={{ position: 'absolute', right: 14, top: 14, width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: 'rgba(231,198,106,0.35)' }} />
            <Text style={{ color: '#E7C66A', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>A THOUGHTFUL BEGINNING</Text>
            <Text style={{ color: '#fff', fontFamily: 'serif', fontSize: 42, lineHeight: 48, marginTop: 28 }}>Where two{'\n'}families meet.</Text>
            <View style={{ width: 44, height: 2, backgroundColor: colors.gold, marginVertical: 20 }} />
            <Text style={{ color: '#F4E9D8', fontSize: 15, lineHeight: 23, maxWidth: 280 }}>
              Meaningful introductions for Rajput families, built on trust, privacy, and shared values.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {[
              ['heart-outline', 'Shared values'],
              ['shield-checkmark-outline', 'Privacy first'],
              ['people-outline', 'Family centred'],
            ].map(([icon, label]) => (
              <View key={label} style={{ flex: 1, backgroundColor: colors.offWhite, borderRadius: 16, padding: 12, minHeight: 78 }}>
                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.gold} />
                <Text style={{ color: colors.charcoal, fontSize: 11, fontWeight: '600', marginTop: 9 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: 12, paddingTop: 22 }}>
          <Button title="Begin your introduction" onPress={() => router.push('/auth/register')} />
          <Pressable onPress={() => router.push('/auth/login')} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.maroon, fontSize: 14, fontWeight: '600' }}>I already have an account</Text>
          </Pressable>
          <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 2 }}>Respectful connections. Deliberate choices.</Text>
        </View>
      </View>
    </Screen>
  );
}
