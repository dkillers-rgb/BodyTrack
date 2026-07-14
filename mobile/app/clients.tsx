import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { api, Client, ClientInput } from '../services/api';
import BottomNavigation from '../components/home/BottomNavigation';

const emptyForm: ClientInput = { externalId: '', name: '', gender: 'MALE', age: 0, height: 0 };

function matchesSearch(client: Client, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return (
    client.externalId.toLowerCase().includes(q) ||
    client.id.toString().includes(q) ||
    client.name.toLowerCase().includes(q) ||
    (client.phone?.toLowerCase().includes(q) ?? false) ||
    String(client.age).includes(q) ||
    String(client.height).includes(q)
  );
}

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ create?: string }>();

  const filteredClients = useMemo(
    () => clients.filter((c) => matchesSearch(c, search)),
    [clients, search]
  );

  const loadClients = useCallback(() => {
    setLoadError(null);
    api.clients
      .list()
      .then(setClients)
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar clientes.');
      });
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useFocusEffect(
    useCallback(() => {
      loadClients();
      if (params.create === '1') {
        setEditingClient(null);
        setForm(emptyForm);
        setIsCreating(true);
      }
    }, [params.create, loadClients])
  );

  const confirmDelete = (client: Client) => {
    Alert.alert(
      'Apagar cliente',
      `Tem a certeza que deseja apagar “${client.name}” e todas as avaliações associadas? Esta ação não se desfaz.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await api.clients.delete(client.id);
                loadClients();
                Alert.alert('Cliente apagado', 'O cliente e as avaliações foram removidos.');
              } catch (err) {
                Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao apagar.');
              }
            })();
          },
        },
      ]
    );
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      externalId: client.externalId,
      name: client.name,
      gender: client.gender,
      age: client.age,
      height: client.height,
      phone: client.phone ?? '',
    });
    setIsCreating(false);
  };

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setIsCreating(true);
  };

  const closeModal = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!form.externalId.trim()) {
      Alert.alert('Erro', 'Informe o ID do cliente.');
      return;
    }
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Informe o nome do cliente.');
      return;
    }
    if (!form.age || form.age < 1) {
      Alert.alert('Erro', 'Informe uma idade válida (mínimo 1 ano).');
      return;
    }
    if (!form.height || form.height <= 0) {
      Alert.alert('Erro', 'Informe a altura em centímetros.');
      return;
    }

    setSaving(true);
    try {
      if (editingClient) {
        await api.clients.update(editingClient.id, form);
        closeModal();
        loadClients();
        Alert.alert('Sucesso', 'Cliente atualizado com sucesso.');
      } else {
        await api.clients.create(form);
        closeModal();
        loadClients();
        if (params.create === '1') {
          Alert.alert('Sucesso', 'Cliente cadastrado com sucesso.', [
            { text: 'Voltar à avaliação', onPress: () => router.back() },
          ]);
        } else {
          Alert.alert('Sucesso', 'Cliente cadastrado com sucesso.');
        }
      }
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
    <View style={styles.container}>
      <TouchableOpacity style={styles.newClientBtn} onPress={openCreate}>
        <Text style={styles.newClientBtnText}>+ Cadastrar cliente</Text>
      </TouchableOpacity>
      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={loadClients}>
            <Text style={styles.retry}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <TextInput
        style={styles.search}
        placeholder="Buscar por nome, ID, idade..."
        placeholderTextColor="#8b9cb3"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id.toString()}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={7}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardMain}
              onPress={() => router.push(`/client/${item.id}` as never)}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.id}>ID: {item.externalId}</Text>
              <Text style={styles.info}>
                {item.age} anos · {item.height} cm
                {item.phone ? ` · ${item.phone}` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
              <Text style={styles.editBtnText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
              <Text style={styles.deleteBtnText}>Apagar</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {clients.length === 0
              ? 'Nenhum cliente cadastrado'
              : 'Nenhum cliente encontrado'}
          </Text>
        }
      />

      <Modal visible={isCreating || !!editingClient} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editingClient ? 'Editar cliente' : 'Cadastrar cliente'}</Text>

              <Text style={styles.label}>ID *</Text>
              <TextInput
                style={styles.input}
                value={form.externalId}
                onChangeText={(externalId) => setForm({ ...form, externalId })}
                placeholder="Ex.: 164"
                placeholderTextColor="#8b9cb3"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(name) => setForm({ ...form, name })}
              />

              <Text style={styles.label}>Sexo</Text>
              <View style={styles.genderRow}>
                {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                    onPress={() => setForm({ ...form, gender: g })}
                  >
                    <Text style={styles.genderBtnText}>
                      {g === 'MALE' ? 'M' : g === 'FEMALE' ? 'F' : 'Outro'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Idade</Text>
              <TextInput
                style={styles.input}
                value={form.age ? String(form.age) : ''}
                onChangeText={(v) => setForm({ ...form, age: parseInt(v) || 0 })}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Altura (cm)</Text>
              <TextInput
                style={styles.input}
                value={form.height ? String(form.height) : ''}
                onChangeText={(v) => setForm({ ...form, height: parseFloat(v) || 0 })}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Telefone (opcional)</Text>
              <TextInput
                style={styles.input}
                value={form.phone ?? ''}
                onChangeText={(phone) => setForm({ ...form, phone })}
                keyboardType="phone-pad"
                placeholder="Ex.: (18) 99999-9999"
                placeholderTextColor="#8b9cb3"
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : editingClient ? 'Salvar alterações' : 'Cadastrar cliente'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
    <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090B10' },
  container: { flex: 1, padding: 16, backgroundColor: '#090B10' },
  search: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#2d3a4f',
    borderRadius: 8,
    padding: 12,
    color: '#e8edf4',
    marginBottom: 12,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2d3a4f',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMain: { flex: 1, padding: 16 },
  name: { fontSize: 16, fontWeight: '600', color: '#e8edf4' },
  id: { fontSize: 11, color: '#8b9cb3', marginTop: 4, fontFamily: 'monospace' },
  info: { fontSize: 13, color: '#8b9cb3', marginTop: 4 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 20,
    borderLeftWidth: 1,
    borderColor: '#2d3a4f',
  },
  editBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 20,
    borderLeftWidth: 1,
    borderColor: '#2d3a4f',
  },
  deleteBtnText: { color: '#f87171', fontWeight: '600', fontSize: 14 },
  empty: { color: '#8b9cb3', textAlign: 'center', marginTop: 40 },
  errorBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  errorText: { color: '#f87171', marginBottom: 6 },
  retry: { color: '#3b82f6', fontWeight: '600' },
  newClientBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  newClientBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a2332',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { color: '#e8edf4', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#0f1729',
    borderWidth: 1,
    borderColor: '#2d3a4f',
    borderRadius: 8,
    padding: 12,
    color: '#e8edf4',
    marginBottom: 16,
    fontSize: 16,
  },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  genderBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d3a4f',
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  genderBtnText: { color: '#e8edf4', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#22c55e',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 16 },
  btnDisabled: { opacity: 0.5 },
});
