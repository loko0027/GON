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
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
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

interface RankingItem {
  goleiro_id: string;
  goleiro_nome: string;
  totalJogos: number;
  mediaAvaliacao: number;
}

const tipoLabelMap: Record<UpdateType, { label: string; color: string }> = {
  novidade: { label: 'Novidade', color: '#2563EB' },
  vantagem: { label: 'Vantagem', color: '#10B981' },
  erro: { label: 'Erro Corrigido', color: '#EF4444' },
  manutencao: { label: 'Manutenção', color: '#D97706' },
};

export default function HomeTab() {
  const { user } = useAuth();
  const isAdmin = user?.tipo_usuario === 'admin';

  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [pressAnim] = useState(new Animated.Value(1));

  // Form state
  const [formTipo, setFormTipo] = useState<UpdateType>('novidade');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');

  const fetchUpdates = async () => {
    if (!refreshing) setLoading(true);
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .order('data', { ascending: false });

    if (error) {
      Alert.alert('Erro ao carregar atualizações', error.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setUpdates(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  const fetchRanking = async () => {
    setLoadingRanking(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      // Agora usamos a view
      const { data, error } = await supabase
        .from('avaliacoes_goleiro_view')
        .select('*')
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', endOfMonth.toISOString());

      if (error) throw error;

      const grouped: Record<string, { total: number; sum: number; nome: string }> = {};

      data.forEach((a: any) => {
        const id = a.goleiro_id;
        if (!id) return;
        if (!grouped[id]) grouped[id] = { total: 0, sum: 0, nome: a.goleiro_nome || 'Desconhecido' };
        grouped[id].total += 1;
        grouped[id].sum += a.nota;
      });

      // Só exibe quem jogou mais de 5 partidas
      const rank: RankingItem[] = Object.entries(grouped)
        .filter(([_, v]) => v.total > 5)
        .map(([id, v]) => ({
          goleiro_id: id,
          goleiro_nome: v.nome,
          totalJogos: v.total,
          mediaAvaliacao: v.sum / v.total,
        }))
        .sort((a, b) => b.mediaAvaliacao - a.mediaAvaliacao);

      setRanking(rank);
    } catch (err: any) {
      console.error('Erro fetchRanking', err.message);
    }
    setLoadingRanking(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUpdates();
    await fetchRanking();
  };

  useEffect(() => {
    fetchUpdates();
    fetchRanking();
  }, []);

  useEffect(() => {
    const channel = supabase.channel('realtime_updates');
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'updates' },
      () => fetchUpdates()
    );
    try {
      channel.subscribe();
    } catch (err) {
      console.error(err);
    }
    return () => supabase.removeChannel(channel);
  }, []);

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

    if (error) Alert.alert('Erro ao adicionar atualização', error.message);
    else {
      Alert.alert('Sucesso', 'Atualização adicionada');
      setFormTitulo('');
      setFormDescricao('');
      setFormTipo('novidade');
      fetchUpdates();
    }
    setLoading(false);
  };

  const handleDeleteUpdate = async (id: string) => {
    Alert.alert('Confirmar', 'Deseja realmente excluir esta atualização?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          const { error } = await supabase.from('updates').delete().eq('id', id);
          if (error) Alert.alert('Erro ao deletar', error.message);
          else {
            Alert.alert('Sucesso', 'Atualização removida');
            fetchUpdates();
          }
          setLoading(false);
        },
      },
    ]);
  };

  if (!user) return null;

  const handlePressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Atualizações do App</Text>
        <Text style={styles.subtitle}>
          Fique por dentro das novidades, melhorias e manutenções recentes.
        </Text>

        {loading && !refreshing && <ActivityIndicator size="large" color="#2563EB" />}

        {isAdmin && (
          <View style={styles.form}>
            <Text style={styles.label}>Tipo:</Text>
            <View style={styles.tipoOptions}>
              {(['novidade', 'vantagem', 'erro', 'manutencao'] as UpdateType[]).map(
                (tipo) => (
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
                )
              )}
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

            <TouchableOpacity
              style={styles.button}
              onPress={handleAddUpdate}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Adicionar Atualização</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* ================= RANKING MENSAL ================= */}
        <Text style={[styles.title, { marginTop: 30 }]}>🏆 Ranking Mensal de Goleiros</Text>
        {loadingRanking ? (
          <ActivityIndicator size="large" color="#10B981" />
        ) : (
          ranking.map((g, index) => (
            <Animated.View
              key={g.goleiro_id}
              style={[
                styles.rankCard,
                {
                  transform: [{ scale: pressAnim }],
                  borderColor:
                    index === 0
                      ? '#FFD700'
                      : index === 1
                      ? '#C0C0C0'
                      : index === 2
                      ? '#CD7F32'
                      : '#E5E7EB',
                  borderWidth: index < 3 ? 2 : 1,
                },
              ]}
              onTouchStart={handlePressIn}
              onTouchEnd={handlePressOut}
            >
              <Text style={styles.rankPosition}>
                {index + 1}º {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
              </Text>
              <View style={styles.rankInfo}>
                <Text style={styles.rankNome}>{g.goleiro_nome}</Text>
                <Text style={styles.rankStats}>
                  Jogos: {g.totalJogos} | Avaliação: {g.mediaAvaliacao.toFixed(1)}
                </Text>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6, color: '#374151' },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
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
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  badgeText: { color: 'white', fontWeight: '600', fontSize: 13 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 15, color: '#4B5563', marginBottom: 12 },
  cardDate: { fontSize: 13, color: '#9CA3AF', textAlign: 'right' },
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
  label: { fontWeight: '700', marginBottom: 6, color: '#374151' },
  tipoOptions: { flexDirection: 'row', marginBottom: 12 },
  tipoOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', marginRight: 10 },
  tipoOptionText: { color: '#374151' },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: '#d1d5db', fontSize: 16, color: '#111827' },
  button: { backgroundColor: '#2563EB', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  deleteButton: { marginTop: 10, paddingVertical: 6, backgroundColor: '#EF4444', borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: 'white', fontWeight: '700' },
  rankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, marginBottom: 12, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  rankPosition: { fontSize: 18, fontWeight: '700', marginRight: 12 },
  rankInfo: { flex: 1 },
  rankNome: { fontSize: 16, fontWeight: '700', color: '#111827' },
  rankStats: { fontSize: 14, color: '#6B7280' },
});
