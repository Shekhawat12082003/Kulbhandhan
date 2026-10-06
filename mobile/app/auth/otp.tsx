import { useState } from 'react';
import { Alert, Platform, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { apiPublic } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { colors } from '../../src/theme';

export default function Otp() {
  const p = useLocalSearchParams<{ mode: string; identifier: string; kind: string; dob?: string; managedBy?: string }>();
  const { completeAuth } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify() {
    const finalCode = process.env.NODE_ENV === 'development' ? (code || '123456') : code;
    if (finalCode.length !== 6) return Alert.alert('Enter the 6-digit code');
    setLoading(true);
    try {
      const device = { platform: Platform.OS };
      const data = p.mode === 'register'
        ? await apiPublic('/auth/register', 'POST', { identifier: p.identifier, kind: p.kind, code: finalCode, dateOfBirth: p.dob,
            ageConfirmed: true, managedBy: p.managedBy, ...device })
        : await apiPublic('/auth/login', 'POST', { identifier: p.identifier, kind: p.kind, code: finalCode, ...device });
      await completeAuth(data);
      router.replace('/(tabs)/home');
    } catch (e: any) { Alert.alert('Verification failed', e.message); }
    finally { setLoading(false); }
  }

  async function resend() {
    try { await apiPublic('/auth/otp/request', 'POST', { identifier: p.identifier, kind: p.kind }); Alert.alert('Code sent'); }
    catch (e: any) { Alert.alert('Could not resend', e.message); }
  }

  return (
    <Screen>
      <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginVertical: 24 }}>Verify</Text>
      <Text style={{ color: colors.muted, marginBottom: 24 }}>Enter the 6-digit code sent to {p.identifier}.</Text>
      <Input label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
      <Button title="Verify & Continue" onPress={verify} loading={loading} />
      <Button title="Resend code" variant="ghost" onPress={resend} />
    </Screen>
  );
}
