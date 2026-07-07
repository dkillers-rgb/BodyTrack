import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { api, Overview } from '../services/api';
import HomeHeader from '../components/home/HomeHeader';
import StatisticCard from '../components/home/StatisticCard';
import QuickActionCard from '../components/home/QuickActionCard';
import SectionTitle from '../components/home/SectionTitle';
import FloatingButton from '../components/home/FloatingButton';
import BottomNavigation from '../components/home/BottomNavigation';
import { HOME_THEME as T } from '../components/home/theme';

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);

  const loadOverview = useCallback(() => {
    api.reports.overview().then(setOverview).catch(console.error);
  }, []);

  useEffect(() => {
    if (user) loadOverview();
  }, [user, loadOverview]);

  useFocusEffect(
    useCallback(() => {
      loadOverview();
    }, [loadOverview])
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader userName={user.name} />

        <View style={styles.statsRow}>
          <StatisticCard
            icon="people-outline"
            value={overview?.totalClients ?? 0}
            label="Clientes"
            subtitle="Cadastrados"
            iconColor={T.primary}
            iconBg="rgba(91,142,255,0.15)"
          />
          <StatisticCard
            icon="clipboard-outline"
            value={overview?.totalEvaluations ?? 0}
            label="Avaliações"
            subtitle="Realizadas"
            iconColor={T.primary}
            iconBg="rgba(91,142,255,0.15)"
          />
        </View>

        <SectionTitle>Ações rápidas</SectionTitle>

        <QuickActionCard
          icon="qr-code-outline"
          title="Ler QR Code"
          subtitle="Escaneie um equipamento"
          iconColor="#5B8EFF"
          iconBg="rgba(91,142,255,0.15)"
          onPress={() => router.push('/scan' as never)}
        />
        <QuickActionCard
          icon="create-outline"
          title="Nova avaliação"
          subtitle="Registrar avaliação corporal"
          iconColor="#31D158"
          iconBg="rgba(49,209,88,0.15)"
          onPress={() => router.push({ pathname: '/manual-entry', params: { showHint: '1' } } as never)}
        />
        <QuickActionCard
          icon="people-outline"
          title="Clientes"
          subtitle="Cadastre e edite clientes"
          iconColor="#A78BFA"
          iconBg="rgba(167,139,250,0.15)"
          onPress={() => router.push('/clients' as never)}
        />
        <QuickActionCard
          icon="bar-chart-outline"
          title="Relatórios"
          subtitle="Visualize gráficos e evolução"
          iconColor="#FB923C"
          iconBg="rgba(251,146,60,0.15)"
          onPress={() => router.push('/reports' as never)}
        />
        <QuickActionCard
          icon="time-outline"
          title="Histórico"
          subtitle="Consulte avaliações anteriores"
          iconColor="#C084FC"
          iconBg="rgba(192,132,252,0.15)"
          onPress={() => router.push('/history' as never)}
        />
        <QuickActionCard
          icon="business-outline"
          title="Empresa"
          subtitle="Gerencie sua empresa"
          iconColor="#2DD4BF"
          iconBg="rgba(45,212,191,0.15)"
          onPress={() => router.push('/company' as never)}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.fabArea} pointerEvents="box-none">
        <FloatingButton
          onPress={() => router.push({ pathname: '/manual-entry', params: { showHint: '1' } } as never)}
        />
      </View>

      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  bottomSpacer: { height: 100 },
  fabArea: {
    position: 'absolute',
    right: 0,
    bottom: 78,
    left: 0,
    height: 90,
  },
});
