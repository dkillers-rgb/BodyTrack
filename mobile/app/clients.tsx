import { useEffect, useState, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import { api, Client, ClientInput } from '../services/api';

const emptyForm: ClientInput = { name: '', gender: 'MALE', age: 0, height: 0 };

function matchesSearch(client: Client, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return (
    client.id.toString().includes(q) ||
    client.name.toLowerCase().includes(q) ||
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
  const router = useRouter();

  const filteredClients = useMemo(
    () => clients.filter((c) => matchesSearch(c, search)),
    [clients, search]
  );

  const loadClients = () => {
    api.clients.list().then(setClients).catch(console.error);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      gender: client.gender,
      age: client.age,
      height: client.height,
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
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      if (editingClient) {
        await api.clients.update(editingClient.id, form);
      } else {
        await api.clients.create(form);
      }
      closeModal();
      loadClients();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newClientBtn} onPress={openCreate}>
        <Text style={styles.newClientBtnText}>+ Cadastrar cliente</Text>
      </TouchableOpacity>
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
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardMain}
              onPress={() => router.push(`/client/${item.id}` as never)}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.id}>ID: {item.id}</Text>
              <Text style={styles.info}>
                {item.age} anos · {item.height} cm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
              <Text style={styles.editBtnText}>Editar</Text>
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
              <Text style={styles.modalTitle}>Editar cliente</Text>

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderLeftWidth: 1,
    borderColor: '#2d3a4f',
  },
  editBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  empty: { color: '#8b9cb3', textAlign: 'center', marginTop: 40 },
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
