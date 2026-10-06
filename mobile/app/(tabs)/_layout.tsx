import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/lib/auth';
import { colors } from '../../src/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: string; size: number }) => (
  <Ionicons name={name} color={color} size={size} />
);

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/auth/welcome" />;
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: colors.maroon, tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.ivory, borderTopColor: colors.border },
    }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: icon('search-outline') }} />
      <Tabs.Screen name="interests" options={{ title: 'Interests', tabBarIcon: icon('heart-outline') }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
