import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { apiPublic } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { colors, radius } from '../../src/theme';

const MANAGED = [['self', 'Myself'], ['parent', 'Parent'], ['family', 'Family Member']] as const;

function ageOf(dob: string) {
  const d = new Date(dob);
  if (isNaN(+d)) return -1;
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

export default function Register() {
  const { completeAuth } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [dob, setDob] = useState('');
  const [managedBy, setManagedBy] = useState<string>('self');
  const [adult, setAdult] = useState(false);
  const [loading, setLoading] = useState(false);
  const kind = identifier.includes('@') ? 'email' : 'phone';
  const isDev = __DEV__ || process.env.EXPO_PUBLIC_ENV === 'development' || process.env.NODE_ENV === 'development';
  const dobError = dob.length === 10 && ageOf(dob) < 18 ? 'You must be 18 or older.' : undefined;

  async function submit() {
    if (identifier.trim().length < 5) return Alert.alert('Enter your phone number or email');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || ageOf(dob) < 18) return Alert.alert('Enter a valid date of birth (YYYY-MM-DD). You must be 18 or older.');
    if (!adult) return Alert.alert('Please confirm that you are 18 or older.');
    setLoading(true);
    try {
      if (isDev) {
        const data = await apiPublic('/auth/register', 'POST', {
          identifier,
          kind,
          code: '123456',
          dateOfBirth: dob,
          ageConfirmed: true,
          managedBy,
          platform: 'web',
        });
        await completeAuth(data);
        router.replace('/(tabs)/home');
        return;
      }
      await apiPublic('/auth/otp/request', 'POST', { identifier, kind });
      router.push({ pathname: '/auth/otp', params: { mode: 'register', identifier, kind, dob, managedBy } });
    } catch (e: any) { Alert.alert('Could not create account', e.message); }
    finally { setLoading(false); }
  }

  return (
    <Screen>
      <Text style={{ fontFamily: 'serif', fontSize: 28, color: colors.maroon, marginVertical: 24 }}>Create your account</Text>
      <Input label="Phone (with country code) or email" value={identifier} onChangeText={setIdentifier}
        autoCapitalize="none" keyboardType="email-address" placeholder="+919876543210" />
      <Input label="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} placeholder="1998-04-21"
        keyboardType="numbers-and-punctuation" maxLength={10} error={dobError} />
      <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>Profile managed by</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        {MANAGED.map(([v, l]) => (
          <Pressable key={v} onPress={() => setManagedBy(v)} accessibilityRole="radio" accessibilityState={{ selected: managedBy === v }}
            style={{ flex: 1, minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderColor: managedBy === v ? colors.maroon : colors.border,
              backgroundColor: managedBy === v ? colors.beige : colors.offWhite }}>
            <Text style={{ color: colors.charcoal, fontSize: 13 }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => setAdult(!adult)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, minHeight: 44 }}>
        <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.maroon,
          backgroundColor: adult ? colors.maroon : 'transparent', marginRight: 12 }} />
        <Text style={{ flex: 1, color: colors.charcoal }}>I confirm that I am 18 years or older and this profile is for marriage.</Text>
      </Pressable>
      <Button title="Send Verification Code" onPress={submit} loading={loading} />
    </Screen>
  );
}
