import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/theme';

export default function Welcome() {
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View style={{ marginTop: 80, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'serif', fontSize: 34, letterSpacing: 5, color: colors.maroon }}>KULBANDHAN</Text>
          <View style={{ width: 48, height: 2, backgroundColor: colors.gold, marginVertical: 14 }} />
          <Text style={{ fontSize: 16, color: colors.gold, letterSpacing: 1 }}>Do Kul, Ek Bandhan</Text>
          <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 32, lineHeight: 22 }}>
            A private, family-centred matrimonial platform for Rajput families, with thoughtful technology.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <Button title="Create Profile" onPress={() => router.push('/auth/register')} />
          <Button title="I already have an account" variant="secondary" onPress={() => router.push('/auth/login')} />
        </View>
      </View>
    </Screen>
  );
}
