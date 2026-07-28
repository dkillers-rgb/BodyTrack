import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { HOME_THEME as T } from '../components/home/theme';
import { PasswordPromptModal } from '../components/PasswordPromptModal';
import {
  BackupInfo,
  MAX_BACKUPS,
  createBackup,
  deleteBackup,
  formatBackupDate,
  formatBytes,
  getBackupStatus,
  importBackupFromUri,
  listBackups,
  restoreBackup,
  saveBackupForPc,
  shareBackup,
} from '../services/backupService';

type PasswordAction =
  | { type: 'share'; item: BackupInfo }
  | { type: 'pc'; item: BackupInfo }
  | { type: 'import'; uri: string };

export default function BackupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [lastBackup, setLastBackup] = useState<BackupInfo | null>(null);
  const [hint, setHint] = useState('');
  const [passwordAction, setPasswordAction] = useState<PasswordAction | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [status, items] = await Promise.all([getBackupStatus(), listBackups()]);
      setLastBackup(status.lastBackup);
      setHint(status.nextAutomaticHint);
      setBackups(items);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível carregar os backups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleCreateBackup = async () => {
    setBusy(true);
    setBusyLabel('Criando backup… não feche o app.');
    try {
      await createBackup();
      Alert.alert('Backup criado', 'Cópia de segurança guardada neste aparelho.');
      await refresh();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao criar backup.');
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const runRestore = async (id: string) => {
    setBusy(true);
    setBusyLabel('Restaurando… não feche o app.');
    try {
      await restoreBackup(id);
      Alert.alert('Restauração concluída', 'Os dados do backup foram aplicados.', [
        {
          text: 'OK',
          onPress: () => router.replace('/' as never),
        },
      ]);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao restaurar.');
      await refresh();
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const handlePasswordConfirm = async (password: string) => {
    const action = passwordAction;
    setPasswordAction(null);
    if (!action) return;

    if (action.type === 'share') {
      setBusy(true);
      setBusyLabel('Preparando arquivo cifrado para enviar…');
      try {
        await shareBackup(action.item.id, password);
      } catch (err) {
        Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao partilhar backup.');
      } finally {
        setBusy(false);
        setBusyLabel('');
      }
      return;
    }

    if (action.type === 'pc') {
      setBusy(true);
      setBusyLabel('Salvando backup cifrado na pasta pública…');
      try {
        const result = await saveBackupForPc(action.item.id, password);
        Alert.alert('Backup guardado', result.hint);
      } catch (err) {
        Alert.alert(
          'Erro',
          err instanceof Error ? err.message : 'Falha ao guardar backup para o PC.'
        );
      } finally {
        setBusy(false);
        setBusyLabel('');
      }
      return;
    }

    setBusy(true);
    setBusyLabel('Importando backup… não feche o app.');
    try {
      const imported = await importBackupFromUri(action.uri, password);
      await refresh();
      Alert.alert(
        'Backup importado',
        `Cópia de ${formatBackupDate(imported.createdAt)} adicionada. DesejRestaurando agora?`,
        [
          { text: 'Depois', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: () => {
              void runRestore(imported.id);
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao importar backup.');
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const handleShare = (item: BackupInfo) => {
    setPasswordAction({ type: 'share', item });
  };

  const handleSaveForPc = (item: BackupInfo) => {
    Alert.alert(
      'Salvar no aparelho (para PC)',
      'O arquivo será cifrado. Depois escolha a pasta Download. Envie a senha por outro canal.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: () => setPasswordAction({ type: 'pc', item }),
        },
      ]
    );
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setPasswordAction({ type: 'import', uri });
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao escolher arquivo.');
    }
  };

  const handleRestore = (item: BackupInfo) => {
    Alert.alert(
      'Restaurar backup',
      `Isto substitui os dados atuais pelos de ${formatBackupDate(item.createdAt)}. Não dá para desfazer depois, a não ser com outro backup.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            void runRestore(item.id);
          },
        },
      ]
    );
  };

  const handleDelete = (item: BackupInfo) => {
    Alert.alert('Apagar backup', 'Remover esta cópia de segurança?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteBackup(item.id);
              await refresh();
            } catch (err) {
              Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao apagar.');
            }
          })();
        },
      },
    ]);
  };

  if (loading && !busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C7A25A" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          Cópias locais neste aparelho. Enviar / Para PC geram arquivo cifrado com senha. Importar
          pede a mesma senha. Após 24 horas sem uso, o app pede login novamente.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Último backup</Text>
          <Text style={styles.statusValue}>
            {lastBackup ? formatBackupDate(lastBackup.createdAt) : 'Nenhum backup ainda'}
          </Text>

          <Text style={[styles.statusLabel, styles.statusGap]}>Próximo automático</Text>
          <Text style={styles.statusValue}>{hint}</Text>

          <Text style={[styles.statusLabel, styles.statusGap]}>Cópias guardadas</Text>
          <Text style={styles.statusValue}>
            {backups.length} de {MAX_BACKUPS}
            {lastBackup ? ` · ${formatBytes(lastBackup.totalBytes)} (mais recente)` : ''}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed || busy) && styles.pressed,
            busy && styles.disabled,
          ]}
          onPress={handleCreateBackup}
          disabled={busy}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#0B1A2E" />
          <Text style={styles.primaryBtnText}>Fazer backup agora</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.importBtn,
            (pressed || busy) && styles.pressed,
            busy && styles.disabled,
          ]}
          onPress={handleImport}
          disabled={busy}
        >
          <Ionicons name="download-outline" size={20} color={T.primary} />
          <Text style={styles.importBtnText}>Importar backup (WhatsApp / e-mail / PC)</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Cópias neste aparelho</Text>

        {backups.length === 0 ? (
          <Text style={styles.empty}>
            Ainda não há cópias. Toque em Fazer backup agora ou importe um arquivo recebido.
          </Text>
        ) : (
          backups.map((item) => (
            <View key={item.id} style={styles.backupCard}>
              <View style={styles.backupHeader}>
                <Ionicons name="folder-outline" size={20} color="#C7A25A" />
                <View style={styles.backupText}>
                  <Text style={styles.backupTitle}>{formatBackupDate(item.createdAt)}</Text>
                  <Text style={styles.backupMeta}>
                    {formatBytes(item.totalBytes)} · {item.clientCount} clientes ·{' '}
                    {item.evaluationCount} avaliações
                  </Text>
                </View>
              </View>
              <View style={styles.backupActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.shareBtn,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                  onPress={() => handleShare(item)}
                  disabled={busy}
                >
                  <Text style={styles.shareBtnText}>Enviar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.pcBtn,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                  onPress={() => handleSaveForPc(item)}
                  disabled={busy}
                >
                  <Text style={styles.pcBtnText}>Para PC</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                  onPress={() => handleRestore(item)}
                  disabled={busy}
                >
                  <Text style={styles.secondaryBtnText}>Restaurar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.dangerBtn,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                  onPress={() => handleDelete(item)}
                  disabled={busy}
                >
                  <Text style={styles.dangerBtnText}>Apagar</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <PasswordPromptModal
        visible={!!passwordAction}
        title={passwordAction?.type === 'import' ? 'Senha do arquivo' : 'Proteger backup com senha'}
        message={
          passwordAction?.type === 'import'
            ? 'Informe a senha usada ao exportar este backup.'
            : 'Defina uma senha para o arquivo. Quem receber precisa desta senha para importar.'
        }
        requireConfirm={passwordAction?.type !== 'import'}
        minLength={passwordAction?.type === 'import' ? 1 : 8}
        confirmLabel={passwordAction?.type === 'import' ? 'Importar' : 'Continuar'}
        onCancel={() => setPasswordAction(null)}
        onConfirm={(pwd) => {
          void handlePasswordConfirm(pwd);
        }}
      />

      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color="#C7A25A" />
          <Text style={styles.busyText}>{busyLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: T.textSecondary,
    marginBottom: 18,
  },
  statusCard: {
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 12,
    color: T.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusValue: {
    fontSize: 15,
    color: T.text,
    marginTop: 4,
    fontWeight: '600',
  },
  statusGap: { marginTop: 14 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#C7A25A',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#0B1A2E',
    fontSize: 16,
    fontWeight: '700',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(91,142,255,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(91,142,255,0.25)',
  },
  importBtnText: {
    color: T.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.text,
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    color: T.textSecondary,
    lineHeight: 20,
  },
  backupCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 12,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backupText: { flex: 1 },
  backupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: T.text,
  },
  backupMeta: {
    fontSize: 12,
    color: T.textSecondary,
    marginTop: 2,
  },
  backupActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  shareBtn: {
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(49,209,88,0.15)',
  },
  shareBtnText: {
    color: T.success,
    fontWeight: '600',
    fontSize: 14,
  },
  pcBtn: {
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(199,162,90,0.18)',
  },
  pcBtnText: {
    color: '#C7A25A',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryBtn: {
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(91,142,255,0.15)',
  },
  secondaryBtnText: {
    color: T.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  dangerBtn: {
    minWidth: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,90,95,0.12)',
  },
  dangerBtnText: {
    color: T.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9,11,16,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  busyText: {
    color: T.text,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
});
