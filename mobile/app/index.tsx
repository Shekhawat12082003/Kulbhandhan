import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { colors } from '../src/theme';

export default function Splash() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.maroon, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.ivory, fontSize: 32, letterSpacing: 6, fontFamily: 'serif' }}>KULBANDHAN</Text>
        <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
      </View>
    );
  }
  return <Redirect href={user ? '/(tabs)/home' : '/auth/welcome'} />;
}
