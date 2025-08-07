import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { User, Star, Target, Plus, Filter, Search, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function GoleirosTab() {
  const { user } = useAuth();
  const { criarConvocacao, getSaldo } = useApp();

  const [goleiros, setGoleiros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByRating, setFilterByRating] = useState('');
  const [showConvocacaoForm, setShowConvocacaoForm] = useState(false);
  const [selectedGoleiro, setSelectedGoleiro] = useState<any>(null);
  const [convocacaoData, setConvocacaoData] = useState({
    data: '',
    hora_inicio: '',
    hora_fim: '',
    local: ''
  });

  // Estados para DateTimePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showHoraInicioPicker, setShowHoraInicioPicker] = useState(false);
  const [showHoraFimPicker, setShowHoraFimPicker] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHoraInicio, setSelectedHoraInicio] = useState<Date | null>(null);
  const [selectedHoraFim, setSelectedHoraFim] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchGoleiros() {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, nota_media, jogos_realizados, foto_url')
        .eq('tipo_usuario', 'goleiro')
        .eq('status_aprovacao', 'aprovado');

      if (error) {
        console.error('Erro ao buscar goleiros:', error);
      } else {
        const goleirosComTags = (data || []).map((g) => ({
          ...g,
          tags: g.jogos_realizados > 15 ? ['Veterano', 'Confiável'] : ['Promissor']
        }));
        setGoleiros(goleirosComTags);
      }
      setLoading(false);
    }

    fetchGoleiros();
  }, []);

  // Função para calcular custo dinâmico baseado na nota média
  const custoPorGoleiro = (nota?: number) => {
    if (!nota) return 10;
    if (nota < 3) return 10;
    if (nota < 4) return 20;
    return 30;
  };

  const saldo = getSaldo(user?.id || '');

  useEffect(() => {
    if (selectedDate) {
      const dataStr = selectedDate.toISOString().split('T')[0];
      setConvocacaoData(prev => ({ ...prev, data: dataStr }));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedHoraInicio) {
      const h = selectedHoraInicio.getHours().toString().padStart(2, '0');
      const m = selectedHoraInicio.getMinutes().toString().padStart(2, '0');
      setConvocacaoData(prev => ({ ...prev, hora_inicio: `${h}:${m}` }));
    }
  }, [selectedHoraInicio]);

  useEffect(() => {
    if (selectedHoraFim) {
      const h = selectedHoraFim.getHours().toString().padStart(2, '0');
      const m = selectedHoraFim.getMinutes().toString().padStart(2, '0');
      setConvocacaoData(prev => ({ ...prev, hora_fim: `${h}:${m}` }));
    }
  }, [selectedHoraFim]);

  const filteredGoleiros = goleiros.filter((goleiro) => {
    const matchesSearch = goleiro.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = filterByRating ? goleiro.nota_media >= parseFloat(filterByRating) : true;
    return matchesSearch && matchesRating;
  });

  const handleConvocar = (goleiro: any) => {
    const custo = custoPorGoleiro(goleiro.nota_media);
    if (saldo.saldo_coins < custo) {
      Alert.alert(
        'Saldo Insuficiente',
        `Você precisa de ${custo} coins para convocar este goleiro.\n\n` +
        `Seu saldo atual: ${saldo.saldo_coins} coins\n` +
        `Saldo retido: ${saldo.saldo_retido} coins`,
        [
          { text: 'Entendi', style: 'cancel' },
          { text: 'Adicionar Coins', onPress: () => { /* navegação para adicionar coins */ } },
        ]
      );
      return;
    }
    setSelectedGoleiro(goleiro);
    setShowConvocacaoForm(true);
  };

  const onChangeDate = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const onChangeHoraInicio = (event: any, date?: Date) => {
    setShowHoraInicioPicker(false);
    if (date) {
      setSelectedHoraInicio(date);
    }
  };

  const onChangeHoraFim = (event: any, date?: Date) => {
    setShowHoraFimPicker(false);
    if (date) {
      setSelectedHoraFim(date);
    }
  };

  const handleSubmitConvocacao = () => {
    const currentSaldo = getSaldo(user?.id || '');
    const custo = custoPorGoleiro(selectedGoleiro?.nota_media);

    if (currentSaldo.saldo_coins < custo) {
      Alert.alert(
        'Saldo Alterado',
        `Seu saldo foi alterado e agora é insuficiente para esta convocação.\n\n` +
        `Saldo atual: ${currentSaldo.saldo_coins} coins\n` +
        'Por favor, adicione mais coins para continuar.'
      );
      return;
    }

    const { data, hora_inicio, hora_fim, local } = convocacaoData;

    if (!data || !hora_inicio || !hora_fim || !local) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      Alert.alert('Erro', 'Formato de data inválido. Use YYYY-MM-DD');
      return;
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(hora_inicio) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(hora_fim)) {
      Alert.alert('Erro', 'Formato de hora inválido. Use HH:MM');
      return;
    }

    const dataInicio = new Date(`${data}T${hora_inicio}`);
    const dataFim = new Date(`${data}T${hora_fim}`);

    criarConvocacao({
      organizador_id: user?.id || '',
      goleiro_id: selectedGoleiro.id,
      data_hora_inicio: dataInicio,
      data_hora_fim: dataFim,
      local,
      valor_retido: custo,
      status: 'pendente'
    });

    Alert.alert(
      'Convocação Enviada!',
      `Você convocou ${selectedGoleiro.nome} com sucesso!\n\n` +
      `${custo} coins foram retidos do seu saldo.\n` +
      `Saldo disponível: ${currentSaldo.saldo_coins - custo} coins`
    );

    setShowConvocacaoForm(false);
    setConvocacaoData({ data: '', hora_inicio: '', hora_fim: '', local: '' });
    setSelectedGoleiro(null);
    setSelectedDate(null);
    setSelectedHoraInicio(null);
    setSelectedHoraFim(null);
  };

  if (user?.tipo_usuario !== 'organizador' && user?.tipo_usuario !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Acesso restrito a organizadores e administradores.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (showConvocacaoForm && selectedGoleiro) {
    const custo = custoPorGoleiro(selectedGoleiro.nota_media);

    return (
      <View style={styles.container}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Convocar {selectedGoleiro.nome}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowConvocacaoForm(false)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>

          {/* Data do Jogo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data do Jogo</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: convocacaoData.data ? '#374151' : '#9ca3af', fontSize: 14 }}>
                {convocacaoData.data || 'Selecione a data'}
              </Text>
              <Calendar size={20} color="#10B981" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                mode="date"
                value={selectedDate || new Date()}
                display="default"
                onChange={onChangeDate}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Hora de Início */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hora de Início</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setShowHoraInicioPicker(true)}
            >
              <Text style={{ color: convocacaoData.hora_inicio ? '#374151' : '#9ca3af', fontSize: 14 }}>
                {convocacaoData.hora_inicio || 'Selecione a hora'}
              </Text>
              <Star size={20} color="#10B981" />
            </TouchableOpacity>
            {showHoraInicioPicker && (
              <DateTimePicker
                mode="time"
                value={selectedHoraInicio || new Date()}
                display="spinner"
                is24Hour={true}
                onChange={onChangeHoraInicio}
              />
            )}
          </View>

          {/* Hora de Fim */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hora de Fim</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setShowHoraFimPicker(true)}
            >
              <Text style={{ color: convocacaoData.hora_fim ? '#374151' : '#9ca3af', fontSize: 14 }}>
                {convocacaoData.hora_fim || 'Selecione a hora'}
              </Text>
              <Star size={20} color="#10B981" />
            </TouchableOpacity>
            {showHoraFimPicker && (
              <DateTimePicker
                mode="time"
                value={selectedHoraFim || new Date()}
                display="spinner"
                is24Hour={true}
                onChange={onChangeHoraFim}
              />
            )}
          </View>

          {/* Local */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Local</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o local do jogo"
              value={convocacaoData.local}
              onChangeText={(text) => setConvocacaoData({ ...convocacaoData, local: text })}
            />
          </View>

          <View style={styles.valorInfo}>
            <Text style={styles.valorText}>💰 Valor: {custo} coins (será retido até o fim do jogo)</Text>
            <Text style={styles.saldoText}>Seu saldo disponível: {saldo.saldo_coins} coins</Text>
            {saldo.saldo_retido > 0 && (
              <Text style={styles.saldoRetido}>Saldo retido: {saldo.saldo_retido} coins</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              saldo.saldo_coins < custo && styles.disabledButton
            ]}
            onPress={handleSubmitConvocacao}
            disabled={saldo.saldo_coins < custo}
          >
            <Text style={styles.submitButtonText}>
              {saldo.saldo_coins < custo ? 'Saldo Insuficiente' : 'Confirmar Convocação'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧤 Goleiros Disponíveis</Text>
        <Text style={styles.subtitle}>Encontre o goleiro ideal para seu jogo</Text>
      </View>

      <View style={styles.saldoCard}>
        <Text style={styles.saldoText}>💰 Seu saldo disponível: {saldo.saldo_coins} coins</Text>
        {saldo.saldo_retido > 0 && (
          <Text style={styles.saldoRetido}>Saldo retido: {saldo.saldo_retido} coins</Text>
        )}
      </View>

      <View style={styles.filters}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar goleiro..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterContainer}>
          <Filter size={20} color="#6b7280" />
          <TextInput
            style={styles.filterInput}
            placeholder="Nota mín."
            value={filterByRating}
            onChangeText={setFilterByRating}
            keyboardType="numeric"
          />
        </View>
      </View>

      <ScrollView style={styles.goleirosList}>
        {filteredGoleiros.map((goleiro) => {
          const custo = custoPorGoleiro(goleiro.nota_media);
          const saldoInsuficiente = saldo.saldo_coins < custo;

          return (
            <View key={goleiro.id} style={styles.goleiroCard}>
              <View style={styles.goleiroHeader}>
                <View style={styles.goleiroInfo}>
                  <View style={styles.goleiroAvatar}>
                    {goleiro.foto_url ? (
                      <Image source={{ uri: goleiro.foto_url }} style={styles.avatarImage} />
                    ) : (
                      <User size={24} color="#10B981" />
                    )}
                  </View>
                  <View>
                    <Text style={styles.goleiroNome}>{goleiro.nome}</Text>
                    <View style={styles.goleiroStats}>
                      <View style={styles.statItem}>
                        <Star size={14} color="#F59E0B" />
                        <Text style={styles.statText}>{goleiro.nota_media?.toFixed(1) ?? '0.0'}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Target size={14} color="#6b7280" />
                        <Text style={styles.statText}>{goleiro.jogos_realizados} jogos</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.convocarButton,
                    saldoInsuficiente && styles.disabledButton
                  ]}
                  onPress={() => handleConvocar(goleiro)}
                  disabled={saldoInsuficiente}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.convocarText}>
                    Convocar {saldoInsuficiente && `(${custo} coins)`}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.goleiroTags}>
                {goleiro.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    letterSpacing: 0.3,
  },
  saldoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  saldoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
  },
  saldoRetido: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#f97316',
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    paddingHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#334155',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    width: 100,
    paddingHorizontal: 8,
  },
  filterInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#334155',
  },
  goleirosList: {
    paddingHorizontal: 20,
  },
  goleiroCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  goleiroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goleiroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goleiroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  goleiroNome: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  goleiroStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    marginLeft: 4,
    color: '#64748b',
    fontWeight: '600',
  },
  convocarButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#a7f3d0',
  },
  convocarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  goleiroTags: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
  },
  closeButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    color: '#10b981',
  },
  form: {
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#334155',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  valorInfo: {
    marginBottom: 20,
  },
  valorText: {
    fontWeight: '700',
    color: '#065f46',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    marginTop: 30,
    textAlign: 'center',
    color: 'red',
    fontWeight: '700',
    fontSize: 18,
  },
});
