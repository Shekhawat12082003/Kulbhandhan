import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { apiPublic } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { colors } from '../../src/theme';

export default function Login() {
  const { completeAuth } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const kind = identifier.includes('@') ? 'email' : 'phone';
  const isDev = __DEV__ || process.env.EXPO_PUBLIC_ENV === 'development' || process.env.NODE_ENV === 'development';

  async function submit() {
    if (identifier.trim().length < 5) return Alert.alert('Enter your phone number or email');
    setLoading(true);
    try {
      if (isDev) {
        const data = await apiPublic('/auth/login', 'POST', {
          identifier,
          kind,
          code: '123456',
          platform: 'web',
        });
        await completeAuth(data);
        router.replace('/(tabs)/home');
        return;
      }
      await apiPublic('/auth/otp/request', 'POST', { identifier, kind });
      router.push({ pathname: '/auth/otp', params: { mode: 'login', identifier, kind } });
    } catch (e: any) { Alert.alert('Could not log in', e.message); }
    finally { setLoading(false); }
  }

  return (
    <Screen>
      <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginVertical: 24 }}>Welcome back</Text>
      <Input label="Phone (with country code) or email" value={identifier} onChangeText={setIdentifier}
        autoCapitalize="none" keyboardType="email-address" placeholder="+919876543210" />
      <Button title="Send Verification Code" onPress={submit} loading={loading} />
    </Screen>
  );
}
