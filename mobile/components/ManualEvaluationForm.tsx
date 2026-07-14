import { useEffect, useState, useCallback, useRef } from 'react';
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
  Alert,
  Pressable,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, Client } from '../services/api';
import { getScanDraft, clearScanDraft } from '../services/scanDraft';
import { ClientAutocomplete } from './ClientAutocomplete';

export interface EvaluationFormValues {
  examDate: string;
  weight: string;
  skeletalMuscle: string;
  bodyFat: string;
  visceralFat: string;
}

interface ManualEvaluationFormProps {
  initialValues?: Partial<EvaluationFormValues>;
  showHint?: boolean;
  /** Se true, mantém o draft do QR; se false, limpa qualquer draft residual. */
  keepScanDraft?: boolean;
  imagePath?: string;
  rawOcrText?: string;
  onSaved?: (clientId: number) => void;
  onCancel?: () => void;
}

function defaultExamDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDateInput(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function formatDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parsePositiveNumber(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function ManualEvaluationForm({
  initialValues,
  showHint = false,
  keepScanDraft = false,
  imagePath,
  rawOcrText,
  onSaved,
  onCancel,
}: ManualEvaluationFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState<EvaluationFormValues>({
    examDate: initialValues?.examDate || defaultExamDate(),
    weight: initialValues?.weight || '',
    skeletalMuscle: initialValues?.skeletalMuscle || '',
    bodyFat: initialValues?.bodyFat || '',
    visceralFat: initialValues?.visceralFat || '',
  });
  const draftClearedRef = useRef(false);

  useEffect(() => {
    if (draftClearedRef.current) return;
    draftClearedRef.current = true;
    if (!keepScanDraft) {
      clearScanDraft();
    }
  }, [keepScanDraft]);

  const loadClients = useCallback(() => {
    setLoadingClients(true);
    setLoadError(null);
    api.clients
      .list()
      .then(setClients)
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar clientes.');
      })
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

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      setForm((prev) => ({ ...prev, examDate: formatDateInput(selected) }));
    }
  };

  const canSave =
    !!selectedClientId &&
    !!form.examDate &&
    parsePositiveNumber(form.weight) != null &&
    parsePositiveNumber(form.skeletalMuscle) != null &&
    parsePositiveNumber(form.bodyFat) != null;

  const handleCancel = () => {
    clearScanDraft();
    onCancel?.();
  };

  const handleSave = async () => {
    if (!selectedClientId) return;

    const weight = parsePositiveNumber(form.weight);
    const skeletalMuscle = parsePositiveNumber(form.skeletalMuscle);
    const bodyFat = parsePositiveNumber(form.bodyFat);

    if (weight == null) {
      Alert.alert('Dados incompletos', 'Informe o peso (kg).');
      return;
    }
    if (skeletalMuscle == null) {
      Alert.alert('Dados incompletos', 'Informe o músculo esquelético (kg). Não pode ficar vazio nem zero.');
      return;
    }
    if (bodyFat == null) {
      Alert.alert('Dados incompletos', 'Informe a gordura corporal (kg). Não pode ficar vazia nem zero.');
      return;
    }

    const visceralParsed = parseFloat(form.visceralFat.replace(',', '.'));
    const visceralFat = Number.isFinite(visceralParsed) && visceralParsed > 0 ? visceralParsed : undefined;

    setSaving(true);
    try {
      const draft = keepScanDraft ? getScanDraft() : null;
      const rawReportJson = draft?.bodbodyReport
        ? JSON.stringify(draft.bodbodyReport)
        : draft?.rawCodeValue;

      const result = await api.evaluations.create({
        clientId: selectedClientId,
        examDate: new Date(`${form.examDate}T12:00:00`).toISOString(),
        weight,
        skeletalMuscle,
        bodyFat,
        visceralFat:
          visceralFat ??
          draft?.bodbodyReport?.section2.visceralFat?.value ??
          undefined,
        imagePath,
        rawOcrText,
        rawReportJson,
      });
      clearScanDraft();
      onSaved?.(result.clientId);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar a avaliação.');
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

  if (loadError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadClients}>
          <Text style={styles.retryBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
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
            Preencha os dados da seção Muscle Fat Analysis (peso, músculo esquelético, gordura
            corporal e gordura visceral).
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
          <Pressable
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
            disabled={saving}
          >
            <Text style={styles.dateText}>
              {parseDateInput(form.examDate).toLocaleDateString('pt-BR')}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={parseDateInput(form.examDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker ? (
            <TouchableOpacity style={styles.dateDone} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.dateDoneText}>Confirmar data</Text>
            </TouchableOpacity>
          ) : null}

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

          <Text style={styles.fieldLabel}>Músculo esquelético (kg) *</Text>
          <TextInput
            style={styles.input}
            value={form.skeletalMuscle}
            onChangeText={(skeletalMuscle) => setForm((prev) => ({ ...prev, skeletalMuscle }))}
            keyboardType="decimal-pad"
            placeholder="Ex: 31.2"
            placeholderTextColor="#64748b"
            editable={!saving}
          />

          <Text style={styles.fieldLabel}>Gordura corporal (kg) *</Text>
          <TextInput
            style={styles.input}
            value={form.bodyFat}
            onChangeText={(bodyFat) => setForm((prev) => ({ ...prev, bodyFat }))}
            keyboardType="decimal-pad"
            placeholder="Ex: 15.8"
            placeholderTextColor="#64748b"
            editable={!saving}
          />

          <Text style={styles.fieldLabel}>Gordura visceral (índice, opcional)</Text>
          <TextInput
            style={styles.input}
            value={form.visceralFat}
            onChangeText={(visceralFat) => setForm((prev) => ({ ...prev, visceralFat }))}
            keyboardType="number-pad"
            placeholder="Ex: 10"
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
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#f87171', textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
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
    justifyContent: 'center',
  },
  dateText: { color: '#e8edf4', fontSize: 15 },
  dateDone: { alignItems: 'flex-end', marginTop: 8 },
  dateDoneText: { color: '#3b82f6', fontWeight: '600' },
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
