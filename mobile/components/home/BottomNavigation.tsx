import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { HOME_THEME as T } from './theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', route: '/' },
  { key: 'clients', label: 'Clientes', icon: 'people-outline', route: '/clients' },
  { key: 'evaluations', label: 'Avaliações', icon: 'clipboard-outline', route: '/history' },
  { key: 'reports', label: 'Relatórios', icon: 'bar-chart-outline', route: '/reports' },
  { key: 'more', label: 'Mais', icon: 'ellipsis-horizontal', route: '/more' },
];

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(route);
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const active = isActive(tab.route);
        return (
          <Pressable
            key={tab.key}
            style={styles.item}
            onPress={() => {
              if (tab.route === '/') router.replace('/' as never);
              else router.push(tab.route as never);
            }}
          >
            <Ionicons name={tab.icon} size={22} color={active ? T.primary : T.textDisabled} />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18,24,38,0.96)',
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: T.textDisabled,
  },
  labelActive: {
    color: T.primary,
    fontWeight: '600',
  },
});
