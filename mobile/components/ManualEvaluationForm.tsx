import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, Client } from '../services/api';
import { ClientAutocomplete } from './ClientAutocomplete';

export interface EvaluationFormValues {
  examDate: string;
  weight: string;
  skeletalMuscle: string;
  bodyFat: string;
}

interface ManualEvaluationFormProps {
  initialValues?: Partial<EvaluationFormValues>;
  showHint?: boolean;
  imagePath?: string;
  rawOcrText?: string;
  onSaved?: (clientId: number) => void;
  onCancel?: () => void;
}

function defaultExamDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ManualEvaluationForm({
  initialValues,
  showHint = false,
  imagePath,
  rawOcrText,
  onSaved,
  onCancel,
}: ManualEvaluationFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [form, setForm] = useState<EvaluationFormValues>({
    examDate: initialValues?.examDate || defaultExamDate(),
    weight: initialValues?.weight || '',
    skeletalMuscle: initialValues?.skeletalMuscle || '',
    bodyFat: initialValues?.bodyFat || '',
  });

  const loadClients = useCallback(() => {
    setLoadingClients(true);
    api.clients
      .list()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoadingClients(false));
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  const goToRegisterClient = () => {
    router.push({ pathname: '/clients', params: { create: '1' } } as never);
  };

  const canSave =
    !!selectedClientId &&
    !!form.examDate &&
    !!form.weight &&
    Number.isFinite(parseFloat(form.weight.replace(',', '.'))) &&
    parseFloat(form.weight.replace(',', '.')) > 0;

  const handleSave = async () => {
    if (!selectedClientId || !canSave) return;

    const weight = parseFloat(form.weight.replace(',', '.'));
    const skeletalMuscle = parseFloat(form.skeletalMuscle.replace(',', '.')) || 0;
    const bodyFat = parseFloat(form.bodyFat.replace(',', '.')) || 0;

    setSaving(true);
    try {
      const result = await api.evaluations.create({
        clientId: selectedClientId,
        examDate: new Date(`${form.examDate}T12:00:00`).toISOString(),
        weight,
        skeletalMuscle,
        bodyFat,
        imagePath,
        rawOcrText,
      });
      onSaved?.(result.clientId);
    } finally {
      setSaving(false);
    }
  };

  if (loadingClients) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {showHint && (
          <Text style={styles.hint}>
            Preencha os dados da seção Muscle Fat Analysis (peso, músculo esquelético e gordura
            corporal).
          </Text>
        )}

        <ClientAutocomplete
          clients={clients}
          value={selectedClientId}
          onChange={setSelectedClientId}
          onRegisterClient={goToRegisterClient}
          disabled={saving}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Muscle Fat Analysis</Text>

          <Text style={styles.fieldLabel}>Data do exame *</Text>
          <TextInput
            style={styles.input}
            value={form.examDate}
            onChangeText={(examDate) => setForm((prev) => ({ ...prev, examDate }))}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#64748b"
            editable={!saving}
          />

          <Text style={styles.fieldLabel}>Peso (kg) *</Text>
          <TextInput
            style={styles.input}
            value={form.weight}
            onChangeText={(weight) => setForm((prev) => ({ ...prev, weight }))}
            keyboardType="decimal-pad"
            placeholder="Ex: 72.5"
            placeholderTextColor="#64748b"
            editable={!saving}
          />

          <Text style={styles.fieldLabel}>Músculo esquelético (kg)</Text>
          <TextInput
            style={styles.input}
            value={form.skeletalMuscle}
            onChangeText={(skeletalMuscle) => setForm((prev) => ({ ...prev, skeletalMuscle }))}
            keyboardType="decimal-pad"
            placeholder="Ex: 31.2"
            placeholderTextColor="#64748b"
            editable={!saving}
          />

          <Text style={styles.fieldLabel}>Gordura corporal (kg)</Text>
          <TextInput
            style={styles.input}
            value={form.bodyFat}
            onChangeText={(bodyFat) => setForm((prev) => ({ ...prev, bodyFat }))}
            keyboardType="decimal-pad"
            placeholder="Ex: 15.8"
            placeholderTextColor="#64748b"
            editable={!saving}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (!canSave || saving) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar avaliação'}</Text>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    color: '#fbbf24',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d3a4f',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0f1729',
    borderWidth: 1,
    borderColor: '#2d3a4f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e8edf4',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#475569',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: { opacity: 0.5 },
});
