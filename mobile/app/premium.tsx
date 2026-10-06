import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { Button } from '../src/components/Button';
import { api } from '../src/lib/api';
import { colors } from '../src/theme';

export default function Premium() {
  const [status, setStatus] = useState<any>(null);
  const load = () => api('/payments/status').then(setStatus).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Premium', headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.maroon }} />
      <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginVertical: 16 }}>Premium memberships</Text>
      {!status ? <ActivityIndicator color={colors.maroon} /> : <Text style={{ color: colors.muted, lineHeight: 22, marginBottom: 20 }}>
        {status.premium ? `A subscription record is active until ${new Date(status.expiresAt).toDateString()}, but premium benefits are not enabled yet. ` : ''}
        Premium subscriptions are unavailable until their benefits and secure checkout are ready. Contact details remain private; conversations start after a mutual match.
      </Text>}
      <Text style={{ color: colors.charcoal, lineHeight: 22, marginBottom: 20 }}>
        Detailed profile access is available individually from eligible profile pages during development.
      </Text>
      <Button title="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
