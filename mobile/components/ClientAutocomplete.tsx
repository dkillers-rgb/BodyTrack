import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  type ListRenderItem,
} from 'react-native';
import type { Client } from '../services/api';

interface ClientAutocompleteProps {
  clients: Client[];
  value: number | null;
  onChange: (clientId: number | null) => void;
  onRegisterClient?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function ClientAutocomplete({
  clients,
  value,
  onChange,
  onRegisterClient,
  disabled = false,
  placeholder = 'Buscar cliente por nome...',
}: ClientAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = clients.find((c) => c.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return clients;
    return clients.filter((client) => normalizeSearch(client.name).includes(q));
  }, [clients, query]);

  const handleSelect = (client: Client) => {
    onChange(client.id);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  const renderItem: ListRenderItem<Client> = ({ item }) => {
    const isSelected = item.id === value;
    return (
      <TouchableOpacity
        style={[styles.option, isSelected && styles.optionSelected]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.optionTextWrap}>
          <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>{item.name}</Text>
          <Text style={styles.optionMeta}>
            {item.age} anos · {item.height} cm
          </Text>
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Cliente *</Text>

      {!open ? (
        <TouchableOpacity
          style={[styles.trigger, disabled && styles.triggerDisabled, selected && styles.triggerSelected]}
          onPress={() => !disabled && setOpen(true)}
          activeOpacity={0.8}
          disabled={disabled}
        >
          <View style={styles.triggerContent}>
            {selected ? (
              <>
                <Text style={styles.triggerName}>{selected.name}</Text>
                <Text style={styles.triggerMeta}>
                  {selected.age} anos · {selected.height} cm
                </Text>
              </>
            ) : (
              <Text style={styles.triggerPlaceholder}>{placeholder}</Text>
            )}
          </View>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.dropdown}>
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor="#64748b"
              autoFocus
              autoCorrect={false}
              autoCapitalize="words"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Text style={styles.clearQuery}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {clients.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>Nenhum cliente cadastrado.</Text>
              {onRegisterClient && (
                <TouchableOpacity style={styles.registerBtn} onPress={onRegisterClient}>
                  <Text style={styles.registerBtnText}>+ Cadastrar cliente</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>Nenhum cliente encontrado para &quot;{query}&quot;</Text>
              {onRegisterClient && (
                <TouchableOpacity style={styles.registerBtn} onPress={onRegisterClient}>
                  <Text style={styles.registerBtnText}>+ Cadastrar novo cliente</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              nestedScrollEnabled
            />
          )}

          <View style={styles.dropdownActions}>
            {selected && (
              <TouchableOpacity style={styles.linkBtn} onPress={handleClear}>
                <Text style={styles.linkBtnText}>Limpar seleção</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.linkBtn} onPress={() => setOpen(false)}>
              <Text style={styles.linkBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {open && (
        <TouchableOpacity
          style={styles.backdropTap}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    zIndex: 20,
  },
  backdropTap: {
    position: 'absolute',
    top: -400,
    left: -40,
    right: -40,
    bottom: -400,
    zIndex: -1,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1729',
    borderWidth: 1,
    borderColor: '#2d3a4f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  triggerSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerContent: {
    flex: 1,
  },
  triggerName: {
    color: '#e8edf4',
    fontSize: 16,
    fontWeight: '600',
  },
  triggerMeta: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  triggerPlaceholder: {
    color: '#64748b',
    fontSize: 15,
  },
  chevron: {
    color: '#94a3b8',
    fontSize: 16,
    marginLeft: 8,
  },
  dropdown: {
    backgroundColor: '#0f1729',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2d3a4f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
    opacity: 0.8,
  },
  searchInput: {
    flex: 1,
    color: '#e8edf4',
    fontSize: 15,
    paddingVertical: 8,
  },
  clearQuery: {
    color: '#94a3b8',
    fontSize: 16,
    padding: 4,
  },
  list: {
    maxHeight: 220,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2d3a4f',
  },
  optionSelected: {
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionName: {
    color: '#e8edf4',
    fontSize: 15,
    fontWeight: '500',
  },
  optionNameSelected: {
    color: '#93c5fd',
    fontWeight: '600',
  },
  optionMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  empty: {
    color: '#94a3b8',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    textAlign: 'center',
  },
  emptyWrap: {
    paddingBottom: 12,
    alignItems: 'center',
  },
  registerBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2d3a4f',
    backgroundColor: '#1a2332',
  },
  linkBtn: {
    paddingVertical: 4,
  },
  linkBtnText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
});
