import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, RefreshControl, Modal, FlatList } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { User, Star, Target, Plus, Filter, Search, Calendar, Clock, MapPin, DollarSign, ChevronDown, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function GoleirosTab() {
  const { user } = useAuth();
  const { criarConvocacao, getSaldo, calcularTaxaConvocacao, calcularValorGoleiro, calcularTaxaApp } = useApp();

  const [goleiros, setGoleiros] = useState<any[]>([]);
  const [locais, setLocais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLocais, setLoadingLocais] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocalQuery, setSearchLocalQuery] = useState('');
  const [filterByRating, setFilterByRating] = useState('');
  const [showConvocacaoForm, setShowConvocacaoForm] = useState(false);
  const [showLocaisModal, setShowLocaisModal] = useState(false);
  const [selectedGoleiro, setSelectedGoleiro] = useState<any>(null);
  const [convocacaoData, setConvocacaoData] = useState({
    data: '',
    hora_inicio: '',
    hora_fim: '',
    local: '',
    local_id: null,
    latitude: null,
    longitude: null
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showHoraInicioPicker, setShowHoraInicioPicker] = useState(false);
  const [showHoraFimPicker, setShowHoraFimPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHoraInicio, setSelectedHoraInicio] = useState<Date | null>(null);
  const [selectedHoraFim, setSelectedHoraFim] = useState<Date | null>(null);

  const [valorCalculado, setValorCalculado] = useState<{
    total: number;
    valorGoleiro: number;
    taxaApp: number;
    taxaDia: number;
    taxaHorario: number;
  } | null>(null);

  // Buscar locais
  const fetchLocais = async (searchTerm = '') => {
    setLoadingLocais(true);
    let query = supabase
      .from('locais')
      .select('id, nome, latitude, longitude')
      .order('nome');

    if (searchTerm) {
      query = query.ilike('nome', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar locais:', error);
    } else {
      setLocais(data || []);
    }
    setLoadingLocais(false);
  };

  const fetchGoleiros = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, nota_media, jogos_realizados, foto_url')
      .eq('tipo_usuario', 'goleiro')
      .eq('status_aprovacao', 'aprovado');

    if (error) {
      console.error('Erro ao buscar goleiros:', error);
    } else {
      const goleirosComTags = (data || []).map((g) => {
        let tags = [];
        
        if (g.nota_media >= 4.5) {
          tags.push('Elite');
        } else if (g.nota_media >= 4.0) {
          tags.push('Veterano');
        } else if (g.nota_media >= 3.5) {
          tags.push('Intermediário');
        } else if (g.nota_media >= 3.0) {
          tags.push('Promissor');
        } else {
          tags.push('Iniciante');
        }

        if (g.jogos_realizados > 20) {
          tags.push('Experiente');
        } else if (g.jogos_realizados > 10) {
          tags.push('Confiável');
        }

        if (g.nota_media >= 4.8 && g.jogos_realizados > 15) {
          tags.push('⭐ Premium');
        }

        return {
          ...g,
          tags: tags
        };
      });
      setGoleiros(goleirosComTags);
    }
    setLoading(false);
  };

  const refreshGoleiros = async () => {
    setRefreshing(true);
    await fetchGoleiros();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchGoleiros();
    fetchLocais();
  }, []);

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

  useEffect(() => {
    if (selectedGoleiro && selectedDate && selectedHoraInicio) {
      calcularValorEmTempoReal();
    } else {
      setValorCalculado(null);
    }
  }, [selectedGoleiro, selectedDate, selectedHoraInicio]);

  const calcularValorEmTempoReal = () => {
    if (!selectedGoleiro || !selectedDate || !selectedHoraInicio) return;

    const dataHora = new Date(selectedDate);
    dataHora.setHours(selectedHoraInicio.getHours());
    dataHora.setMinutes(selectedHoraInicio.getMinutes());

    let nivel: 'iniciante' | 'intermediario' | 'veterano' = 'iniciante';
    if (selectedGoleiro.nota_media < 3) {
      nivel = 'iniciante';
    } else if (selectedGoleiro.nota_media < 4) {
      nivel = 'intermediario';
    } else {
      nivel = 'veterano';
    }

    const valorGoleiro = calcularValorGoleiro(nivel, dataHora);
    const taxaApp = calcularTaxaApp(0);
    const total = valorGoleiro + taxaApp;

    const diaSemana = dataHora.getDay();
    const diasValorizados = [0, 1, 5, 6];
    const taxaDia = diasValorizados.includes(diaSemana) ? 5 : 0;

    const hora = dataHora.getHours();
    let taxaHorario = 0;
    if (hora >= 9 && hora < 14) {
      taxaHorario = 6;
    }

    setValorCalculado({
      total,
      valorGoleiro,
      taxaApp,
      taxaDia,
      taxaHorario
    });
  };

  const custoPorGoleiro = (nota?: number) => {
    const dataHora = new Date();
    let nivel: 'iniciante' | 'intermediario' | 'veterano' = 'iniciante';
    
    if (!nota) {
      return calcularTaxaConvocacao(nivel, dataHora);
    }
    
    if (nota < 3) {
      nivel = 'iniciante';
    } else if (nota < 4) {
      nivel = 'intermediario';
    } else {
      nivel = 'veterano';
    }
    
    return calcularTaxaConvocacao(nivel, dataHora);
  };

  const saldo = getSaldo(user?.id || '');

  const filteredGoleiros = goleiros.filter((goleiro) => {
    const matchesSearch = goleiro.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = filterByRating ? goleiro.nota_media >= parseFloat(filterByRating) : true;
    return matchesSearch && matchesRating;
  });

  const handleConvocar = (goleiro: any) => {
    setSelectedGoleiro(goleiro);
    setShowConvocacaoForm(true);
  };

  const onChangeDate = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const onChangeHoraInicio = (event: any, date?: Date) => {
    setShowHoraInicioPicker(false);
    if (date) setSelectedHoraInicio(date);
  };

  const onChangeHoraFim = (event: any, date?: Date) => {
    setShowHoraFimPicker(false);
    if (date) setSelectedHoraFim(date);
  };

  const selectLocal = (local: any) => {
    setConvocacaoData({
      ...convocacaoData,
      local: local.nome,
      local_id: local.id,
      latitude: local.latitude,
      longitude: local.longitude
    });
    setShowLocaisModal(false);
    setSearchLocalQuery('');
  };

  const handleSubmitConvocacao = () => {
    if (!valorCalculado) return;

    const currentSaldo = getSaldo(user?.id || '');
    const custo = valorCalculado.total;

    if (currentSaldo.saldo_coins < custo) {
      Alert.alert(
        'Saldo Alterado',
        `Seu saldo foi alterado e agora é insuficiente para esta convocação.\n\n` +
        `Saldo atual: ${currentSaldo.saldo_coins} coins\n` +
        'Por favor, adicione mais coins para continuar.'
      );
      return;
    }

    const { data, hora_inicio, hora_fim, local, local_id, latitude, longitude } = convocacaoData;

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
      local_id,
      latitude,
      longitude,
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
    setConvocacaoData({ 
      data: '', 
      hora_inicio: '', 
      hora_fim: '', 
      local: '', 
      local_id: null,
      latitude: null,
      longitude: null
    });
    setSelectedGoleiro(null);
    setSelectedDate(null);
    setSelectedHoraInicio(null);
    setSelectedHoraFim(null);
    setValorCalculado(null);
  };

  const renderLocalInput = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Local</Text>
      <TouchableOpacity
        style={[styles.input, styles.localInput]}
        onPress={() => {
          setShowLocaisModal(true);
          fetchLocais();
        }}
      >
        <Text style={{ color: convocacaoData.local ? '#374151' : '#9ca3af', fontSize: 14, flex: 1 }}>
          {convocacaoData.local || 'Selecione um local'}
        </Text>
        <ChevronDown size={20} color="#6b7280" />
      </TouchableOpacity>
      
      {convocacaoData.latitude && convocacaoData.longitude && (
        <Text style={styles.coordenadasText}>
          📍 Coordenadas: {convocacaoData.latitude.toFixed(6)}, {convocacaoData.longitude.toFixed(6)}
        </Text>
      )}
    </View>
  );

  const renderLocaisModal = () => (
    <Modal
      visible={showLocaisModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowLocaisModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Local</Text>
            <TouchableOpacity onPress={() => setShowLocaisModal(false)}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainerModal}>
            <Search size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInputModal}
              placeholder="Buscar local..."
              value={searchLocalQuery}
              onChangeText={(text) => {
                setSearchLocalQuery(text);
                fetchLocais(text);
              }}
            />
          </View>

          {loadingLocais ? (
            <ActivityIndicator size="small" color="#10B981" style={styles.loadingIndicator} />
          ) : (
            <FlatList
              data={locais}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.localItem}
                  onPress={() => selectLocal(item)}
                >
                  <MapPin size={16} color="#10B981" style={styles.localIcon} />
                  <View style={styles.localInfo}>
                    <Text style={styles.localNome}>{item.nome}</Text>
                    {item.latitude && item.longitude && (
                      <Text style={styles.localCoordenadas}>
                        📍 {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {searchLocalQuery ? 'Nenhum local encontrado' : 'Nenhum local cadastrado'}
                </Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );

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
    const custoEstimado = custoPorGoleiro(selectedGoleiro.nota_media);
    const custoReal = valorCalculado?.total || custoEstimado;

    return (
      <View style={styles.container}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Convocar {selectedGoleiro.nome}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowConvocacaoForm(false)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data do Jogo</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: convocacaoData.data ? '#374151' : '#9ca3af', fontSize: 14 }}>
                {convocacaoData.data || 'Selecione a data'}
              </Text>
              <Calendar size={20} color="#10B981" />
            </TouchableOpacity>
            {showDatePicker && <DateTimePicker mode="date" value={selectedDate || new Date()} display="default" onChange={onChangeDate} minimumDate={new Date()} />}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hora de Início</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => setShowHoraInicioPicker(true)}
            >
              <Text style={{ color: convocacaoData.hora_inicio ? '#374151' : '#9ca3af', fontSize: 14 }}>
                {convocacaoData.hora_inicio || 'Selecione a hora'}
              </Text>
              <Clock size={20} color="#10B981" />
            </TouchableOpacity>
            {showHoraInicioPicker && <DateTimePicker mode="time" value={selectedHoraInicio || new Date()} display="spinner" is24Hour={true} onChange={onChangeHoraInicio} />}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hora de Fim</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => setShowHoraFimPicker(true)}
            >
              <Text style={{ color: convocacaoData.hora_fim ? '#374151' : '#9ca3af', fontSize: 14 }}>
                {convocacaoData.hora_fim || 'Selecione a hora'}
              </Text>
              <Clock size={20} color="#10B981" />
            </TouchableOpacity>
            {showHoraFimPicker && <DateTimePicker mode="time" value={selectedHoraFim || new Date()} display="spinner" is24Hour={true} onChange={onChangeHoraFim} />}
          </View>

          {renderLocalInput()}
          {renderLocaisModal()}

          {valorCalculado && (
            <View style={styles.valorDetalhado}>
              <Text style={styles.valorTitulo}>💵 Detalhamento do Valor</Text>
              
              <View style={styles.valorItem}>
                <Text style={styles.valorLabel}>Valor Base do Goleiro:</Text>
                <Text style={styles.valorNumero}>{valorCalculado.valorGoleiro - valorCalculado.taxaDia - valorCalculado.taxaHorario} coins</Text>
              </View>

              {valorCalculado.taxaDia > 0 && (
                <View style={styles.valorItem}>
                  <Text style={styles.valorLabel}>➕ Taxa de Dia (Fim de Semana):</Text>
                  <Text style={styles.valorNumero}>+{valorCalculado.taxaDia} coins</Text>
                </View>
              )}

              {valorCalculado.taxaHorario > 0 && (
                <View style={styles.valorItem}>
                  <Text style={styles.valorLabel}>➕ Taxa de Horário (09h-14h):</Text>
                  <Text style={styles.valorNumero}>+{valorCalculado.taxaHorario} coins</Text>
                </View>
              )}

              <View style={styles.valorItem}>
                <Text style={styles.valorLabel}>💎 Valor Total para o Goleiro:</Text>
                <Text style={[styles.valorNumero, styles.valorGoleiro]}>
                  {valorCalculado.valorGoleiro} coins
                </Text>
              </View>

              <View style={styles.valorItem}>
                <Text style={styles.valorLabel}>📱 Taxa Fixa do App:</Text>
                <Text style={[styles.valorNumero, styles.taxaApp]}>
                  +{valorCalculado.taxaApp} coins
                </Text>
              </View>

              <View style={[styles.valorItem, styles.valorTotal]}>
                <Text style={styles.valorLabel}>💰 VALOR TOTAL:</Text>
                <Text style={[styles.valorNumero, styles.valorTotalNumero]}>
                  {valorCalculado.total} coins
                </Text>
              </View>
            </View>
          )}

          <View style={styles.valorInfo}>
            <Text style={styles.valorText}>💳 Seu saldo disponível: {saldo.saldo_coins} coins</Text>
            {saldo.saldo_retido > 0 && <Text style={styles.saldoRetido}>Saldo retido: {saldo.saldo_retido} coins</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saldo.saldo_coins < custoReal && styles.disabledButton]}
            onPress={handleSubmitConvocacao}
            disabled={saldo.saldo_coins < custoReal || !valorCalculado}
          >
            <Text style={styles.submitButtonText}>
              {!valorCalculado ? 'Calculando...' : 
                saldo.saldo_coins < custoReal ? 'Saldo Insuficiente' : 
                `Confirmar Convocação - ${custoReal} coins`}
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
        {saldo.saldo_retido > 0 && <Text style={styles.saldoRetido}>Saldo retido: {saldo.saldo_retido} coins</Text>}
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

      <ScrollView
        style={styles.goleirosList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshGoleiros}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
      >
        {filteredGoleiros.map((goleiro) => {
          const custo = custoPorGoleiro(goleiro.nota_media);

          return (
            <View key={goleiro.id} style={styles.goleiroCard}>
              <View style={styles.goleiroHeader}>
                <View style={styles.goleiroInfo}>
                  <View style={styles.goleiroAvatar}>
                    {goleiro.foto_url ? <Image source={{ uri: goleiro.foto_url }} style={styles.avatarImage} /> : <User size={24} color="#10B981" />}
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
                  style={styles.convocarButton}
                  onPress={() => handleConvocar(goleiro)}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.convocarText}>
                    Convocar
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
  container: { flex: 1, backgroundColor: '#ffffffff' },
  header: { paddingVertical: 24, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  saldoCard: { backgroundColor: '#10B981', padding: 12, margin: 12, borderRadius: 12 },
  saldoText: { color: '#000', fontWeight: '600', fontSize: 14 },
  saldoRetido: { color: '#000000ff', fontWeight: '500', fontSize: 12, marginTop: 2 },
  filters: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 12, justifyContent: 'space-between' },
  searchContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, alignItems: 'center', flex: 1, marginRight: 6 },
  searchInput: { marginLeft: 6, flex: 1, height: 36 },
  filterContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, alignItems: 'center', flex: 1, marginLeft: 6 },
  filterInput: { marginLeft: 6, flex: 1, height: 36 },
  goleirosList: { paddingHorizontal: 12, marginBottom: 12 },
  goleiroCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  goleiroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goleiroInfo: { flexDirection: 'row', alignItems: 'center' },
  goleiroAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  goleiroNome: { fontWeight: '700', fontSize: 16, color: '#0f172a' },
  goleiroStats: { flexDirection: 'row', marginTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  statText: { fontSize: 12, marginLeft: 4, color: '#6b7280' },
  convocarButton: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  convocarText: { color: '#fff', fontWeight: '600', marginLeft: 4, fontSize: 12 },
  disabledButton: { backgroundColor: '#94a3b8' },
  goleiroTags: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  tag: { backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, marginBottom: 4, flexDirection: 'row', alignItems: 'center' },
  tagText: { fontSize: 10, color: '#065f46', fontWeight: '500' },
  priceTag: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center' },
  priceText: { color: '#fff', marginLeft: 2 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f1f5f9' },
  formTitle: { fontWeight: '700', fontSize: 18, color: '#0f172a' },
  closeButton: { padding: 6 },
  closeButtonText: { fontSize: 18, fontWeight: '700', color: '#ef4444' },
  form: { paddingHorizontal: 12 },
  inputGroup: { marginBottom: 12 },
  label: { fontWeight: '500', color: '#0f172a', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#d1d5db', fontSize: 14 },
  
  valorDetalhado: { backgroundColor: '#ffffffff', padding: 12, borderRadius: 8, marginVertical: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  valorTitulo: { fontWeight: '700', color: '#0f172a', marginBottom: 8, fontSize: 16 },
  valorItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  valorLabel: { color: '#64748b', fontSize: 12 },
  valorNumero: { fontWeight: '600', color: '#0f172a', fontSize: 12 },
  valorGoleiro: { color: '#10B981', fontWeight: '700' },
  taxaApp: { color: '#ef4444' },
  valorTotal: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 4 },
  valorTotalNumero: { color: '#10B981', fontWeight: '700', fontSize: 14 },
  
  valorInfo: { marginVertical: 12 },
  valorText: { fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  submitButton: { backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 16, textAlign: 'center', marginTop: 24 },

  localInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordenadasText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  searchContainerModal: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
    height: 40,
  },
  searchInputModal: {
    marginLeft: 6,
    flex: 1,
    height: 40,
  },
  localItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  localIcon: {
    marginRight: 12,
  },
  localInfo: {
    flex: 1,
  },
  localNome: {
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  localCoordenadas: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 20,
  },
});