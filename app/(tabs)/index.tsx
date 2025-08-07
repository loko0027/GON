import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type UpdateType = 'novidade' | 'vantagem' | 'erro' | 'manutencao';

interface UpdateItem {
  id: string;
  tipo: UpdateType;
  titulo: string;
  descricao: string;
  data: string; // ISO string
}

const tipoLabelMap: Record<UpdateType, { label: string; color: string }> = {
  novidade: { label: 'Novidade', color: '#2563EB' }, // azul
  vantagem: { label: 'Vantagem', color: '#10B981' }, // verde
  erro: { label: 'Erro Corrigido', color: '#EF4444' }, // vermelho
  manutencao: { label: 'Manutenção', color: '#D97706' }, // laranja
};

export default function HomeTab() {
  const { user } = useAuth();
  const isAdmin = user?.tipo_usuario === 'admin';

  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state (para criar update)
  const [formTipo, setFormTipo] = useState<UpdateType>('novidade');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');

  // Buscar atualizações do supabase
  const fetchUpdates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .order('data', { ascending: false });

    if (error) {
      Alert.alert('Erro ao carregar atualizações', error.message);
      setLoading(false);
      return;
    }
    setUpdates(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  // Adicionar update
  const handleAddUpdate = async () => {
    if (!formTitulo.trim() || !formDescricao.trim()) {
      Alert.alert('Erro', 'Título e descrição são obrigatórios');
      return;
    }

    const newUpdate = {
      tipo: formTipo,
      titulo: formTitulo.trim(),
      descricao: formDescricao.trim(),
      data: new Date().toISOString(),
      criado_por: user?.id,
    };

    setLoading(true);
    const { error } = await supabase.from('updates').insert(newUpdate);

    if (error) {
      Alert.alert('Erro ao adicionar atualização', error.message);
    } else {
      Alert.alert('Sucesso', 'Atualização adicionada');
      setFormTitulo('');
      setFormDescricao('');
      setFormTipo('novidade');
      fetchUpdates();
    }
    setLoading(false);
  };

  // Deletar update
  const handleDeleteUpdate = async (id: string) => {
    Alert.alert('Confirmar', 'Deseja realmente excluir esta atualização?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          const { error } = await supabase.from('updates').delete().eq('id', id);
          if (error) {
            Alert.alert('Erro ao deletar', error.message);
          } else {
            Alert.alert('Sucesso', 'Atualização removida');
            fetchUpdates();
          }
          setLoading(false);
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Atualizações do App</Text>
      <Text style={styles.subtitle}>
        Fique por dentro das novidades, melhorias e manutenções recentes.
      </Text>

      {loading && <ActivityIndicator size="large" color="#2563EB" />}

      {/* Form para admin criar update */}
      {isAdmin && (
        <View style={styles.form}>
          <Text style={styles.label}>Tipo:</Text>
          <View style={styles.tipoOptions}>
            {(['novidade', 'vantagem', 'erro', 'manutencao'] as UpdateType[]).map((tipo) => (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.tipoOption,
                  formTipo === tipo && { backgroundColor: tipoLabelMap[tipo].color },
                ]}
                onPress={() => setFormTipo(tipo)}
              >
                <Text
                  style={[
                    styles.tipoOptionText,
                    formTipo === tipo && { color: 'white', fontWeight: '700' },
                  ]}
                >
                  {tipoLabelMap[tipo].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Título:</Text>
          <TextInput
            style={styles.input}
            value={formTitulo}
            onChangeText={setFormTitulo}
            placeholder="Título da atualização"
          />

          <Text style={styles.label}>Descrição:</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            value={formDescricao}
            onChangeText={setFormDescricao}
            placeholder="Descrição detalhada"
          />

          <TouchableOpacity style={styles.button} onPress={handleAddUpdate} disabled={loading}>
            <Text style={styles.buttonText}>Adicionar Atualização</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de updates */}
      {updates.map(({ id, tipo, titulo, descricao, data }) => {
        const tipoInfo = tipoLabelMap[tipo];
        return (
          <View key={id} style={styles.card}>
            <View style={[styles.badge, { backgroundColor: tipoInfo.color }]}>
              <Text style={styles.badgeText}>{tipoInfo.label}</Text>
            </View>
            <Text style={styles.cardTitle}>{titulo}</Text>
            <Text style={styles.cardDesc}>{descricao}</Text>
            <Text style={styles.cardDate}>{new Date(data).toLocaleDateString()}</Text>

            {isAdmin && (
              <TouchableOpacity
                onPress={() => handleDeleteUpdate(id)}
                style={styles.deleteButton}
                disabled={loading}
              >
                <Text style={styles.deleteButtonText}>Excluir</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    color: '#374151',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'right',
  },

  // Form
  form: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: {
    fontWeight: '700',
    marginBottom: 6,
    color: '#374151',
  },
  tipoOptions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tipoOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 10,
  },
  tipoOptionText: {
    color: '#374151',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteButton: {
    marginTop: 10,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '700',
  },
});
