import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, RefreshControl, Modal, FlatList } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { User, Star, Target, Plus, Filter, Search, Calendar, Clock, MapPin, ChevronDown, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function GoleirosTab() {
    const { user } = useAuth();
    // ===== INÍCIO DA MODIFICAÇÃO 1 =====
    // Trocamos as funções antigas pela nova função centralizada 'calcularDetalhesConvocacao'.
    const { criarConvocacao, getSaldo, calcularDetalhesConvocacao } = useApp();
    // ===== FIM DA MODIFICAÇÃO 1 =====

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

    // ===== INÍCIO DA MODIFICAÇÃO 2 =====
    // O estado agora armazena todos os detalhes do cálculo para exibição.
    const [valorCalculado, setValorCalculado] = useState<{
        total: number;
        valorGoleiro: number;
        taxaApp: number;
        taxaDia: number;
        taxaHora: number;
        valorBaseGoleiro: number;
    } | null>(null);
    // ===== FIM DA MODIFICAÇÃO 2 =====

    const formatarDataSemFuso = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchLocais = async (searchTerm = '') => {
        setLoadingLocais(true);
        let query = supabase.from('locais').select('id, nome, latitude, longitude').order('nome');
        if (searchTerm) {
            query = query.ilike('nome', `%${searchTerm}%`);
        }
        const { data, error } = await query;
        if (error) console.error('Erro ao buscar locais:', error);
        else setLocais(data || []);
        setLoadingLocais(false);
    };

    const fetchGoleiros = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('usuarios').select('id, nome, nota_media, jogos_realizados, foto_url').eq('tipo_usuario', 'goleiro').eq('status_aprovacao', 'aprovado');
        if (error) {
            console.error('Erro ao buscar goleiros:', error);
        } else {
            const goleirosComTags = (data || []).map((g) => {
                let tags = [];
                if (g.nota_media >= 4.5) tags.push('Elite');
                else if (g.nota_media >= 4.0) tags.push('Veterano');
                else if (g.nota_media >= 3.5) tags.push('Intermediário');
                else if (g.nota_media >= 3.0) tags.push('Promissor');
                else tags.push('Iniciante');
                if (g.jogos_realizados > 20) tags.push('Experiente');
                else if (g.jogos_realizados > 10) tags.push('Confiável');
                if (g.nota_media >= 4.8 && g.jogos_realizados > 15) tags.push('⭐ Premium');
                return { ...g, tags: tags };
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
            const dataStr = formatarDataSemFuso(selectedDate);
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

    // ===== INÍCIO DA MODIFICAÇÃO 3 =====
    // O useEffect agora chama a nova função única e armazena todos os detalhes retornados.
    useEffect(() => {
        if (selectedGoleiro && selectedDate && selectedHoraInicio && selectedHoraFim) {
            const dataHoraInicio = new Date(selectedDate);
            dataHoraInicio.setHours(selectedHoraInicio.getHours(), selectedHoraInicio.getMinutes());

            const duracaoHoras = Math.abs(selectedHoraFim.getTime() - selectedHoraInicio.getTime()) / 36e5;

            if (duracaoHoras > 0) {
                let nivelJogador: 'iniciante' | 'intermediario' | 'veterano' = 'iniciante';
                const nota = selectedGoleiro.nota_media;
                if (nota >= 4.0) {
                    nivelJogador = 'veterano';
                } else if (nota >= 3.5) {
                    nivelJogador = 'intermediario';
                }

                // A chamada agora é uma só e retorna o objeto completo com todos os detalhes.
                const detalhes = calcularDetalhesConvocacao(nivelJogador, dataHoraInicio, duracaoHoras);
                setValorCalculado(detalhes);

            } else {
                setValorCalculado(null);
            }
        } else {
            setValorCalculado(null);
        }
    }, [selectedGoleiro, selectedDate, selectedHoraInicio, selectedHoraFim, calcularDetalhesConvocacao]);
    // ===== FIM DA MODIFICAÇÃO 3 =====

    const saldo = getSaldo(user?.id || '');

    const filteredGoleiros = goleiros.filter((goleiro) => {
        const matchesSearch = goleiro.nome.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRating = filterByRating ? goleiro.nota_media >= parseFloat(filterByRating) : true;
        return matchesSearch && matchesRating;
    });

    const handleConvocar = (goleiro: any) => {
        setSelectedGoleiro(goleiro);
        setSelectedDate(null);
        setSelectedHoraInicio(null);
        setSelectedHoraFim(null);
        setValorCalculado(null);
        setConvocacaoData({
            data: '', hora_inicio: '', hora_fim: '', local: '',
            local_id: null, latitude: null, longitude: null
        });
        setShowConvocacaoForm(true);
    };

    const onChangeDate = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) setSelectedDate(date);
    };

    const onChangeHoraInicio = (event: any, date?: Date) => {
        setShowHoraInicioPicker(false);
        if (date) {
            setSelectedHoraInicio(date);
            const horaFimSugerida = new Date(date.getTime() + 60 * 60 * 1000);
            setSelectedHoraFim(horaFimSugerida);
        }
    };

    const onChangeHoraFim = (event: any, date?: Date) => {
        setShowHoraFimPicker(false);
        if (date) setSelectedHoraFim(date);
    };

    const selectLocal = (local: any) => {
        setConvocacaoData(prev => ({ ...prev, local: local.nome, local_id: local.id, latitude: local.latitude, longitude: local.longitude }));
        setShowLocaisModal(false);
        setSearchLocalQuery('');
    };

    const handleSubmitConvocacao = () => {
        if (!valorCalculado) return;
        const currentSaldo = getSaldo(user?.id || '');
        const custo = valorCalculado.total;
        if (currentSaldo.saldo_coins < custo) {
            Alert.alert('Saldo Insuficiente', 'Seu saldo é insuficiente para esta convocação.');
            return;
        }
        const { data, hora_inicio, hora_fim, local, local_id, latitude, longitude } = convocacaoData;
        if (!data || !hora_inicio || !hora_fim || !local) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }
        const dataInicio = new Date(`${data}T${hora_inicio}`);
        const dataFim = new Date(`${data}T${hora_fim}`);

        const diferencaMinutos = (dataFim.getTime() - dataInicio.getTime()) / 60000;
        if (diferencaMinutos < 60 || diferencaMinutos > 90) {
            Alert.alert('Intervalo Inválido', 'A duração do jogo deve ser entre 1 hora e 1 hora e 30 minutos.');
            return;
        }

        criarConvocacao({
            organizador_id: user?.id || '',
            goleiro_id: selectedGoleiro.id,
            data_hora_inicio: dataInicio,
            data_hora_fim: dataFim,
            local, local_id, latitude, longitude,
            valor_retido: custo,
            status: 'pendente'
        });
        Alert.alert('Convocação Enviada!', `Você convocou ${selectedGoleiro.nome} com sucesso!`);
        setShowConvocacaoForm(false);
    };

    const renderLocalInput = () => (
        <View style={styles.inputGroup}><Text style={styles.label}>Local</Text><TouchableOpacity style={[styles.input, styles.localInput]} onPress={() => { setShowLocaisModal(true); fetchLocais(); }}><Text style={{ color: convocacaoData.local ? '#374151' : '#9ca3af', fontSize: 14, flex: 1 }}>{convocacaoData.local || 'Selecione um local'}</Text><ChevronDown size={20} color="#6b7280" /></TouchableOpacity>{convocacaoData.latitude && convocacaoData.longitude && (<Text style={styles.coordenadasText}>📍 Coordenadas: {convocacaoData.latitude.toFixed(6)}, {convocacaoData.longitude.toFixed(6)}</Text>)}</View>
    );

    const renderLocaisModal = () => (
        <Modal visible={showLocaisModal} animationType="slide" transparent={true} onRequestClose={() => setShowLocaisModal(false)}><View style={styles.modalContainer}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Selecionar Local</Text><TouchableOpacity onPress={() => setShowLocaisModal(false)}><X size={24} color="#374151" /></TouchableOpacity></View><View style={styles.searchContainerModal}><Search size={20} color="#6b7280" /><TextInput style={styles.searchInputModal} placeholder="Buscar local..." value={searchLocalQuery} onChangeText={(text) => { setSearchLocalQuery(text); fetchLocais(text); }}/></View>{loadingLocais ? (<ActivityIndicator size="small" color="#10B981" style={styles.loadingIndicator} />) : (<FlatList data={locais} keyExtractor={(item) => item.id.toString()} renderItem={({ item }) => (<TouchableOpacity style={styles.localItem} onPress={() => selectLocal(item)}><MapPin size={16} color="#10B981" style={styles.localIcon} /><View style={styles.localInfo}><Text style={styles.localNome}>{item.nome}</Text>{item.latitude && item.longitude && (<Text style={styles.localCoordenadas}>📍 {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}</Text>)}</View></TouchableOpacity>)} ListEmptyComponent={<Text style={styles.emptyText}>{searchLocalQuery ? 'Nenhum local encontrado' : 'Nenhum local cadastrado'}</Text>} />)}</View></View></Modal>
    );

    const renderInfoIntervalo = () => {
        if (!selectedHoraInicio || !selectedHoraFim) return null;
        const diferencaMs = selectedHoraFim.getTime() - selectedHoraInicio.getTime();
        const diferencaMinutos = Math.round(diferencaMs / 60000);
        const horas = Math.floor(diferencaMinutos / 60);
        const minutos = diferencaMinutos % 60;
        return (
            <View style={styles.intervaloInfo}>
                <Text style={styles.intervaloText}>
                    ⏱️ Duração: {horas > 0 ? `${horas}h` : ''}{minutos > 0 ? `${minutos}min` : ''}
                </Text>
                <Text style={styles.intervaloSubtext}>
                    (Intervalo permitido: 1h a 1h30)
                </Text>
            </View>
        );
    };

    if (user?.tipo_usuario !== 'organizador' && user?.tipo_usuario !== 'admin') {
        return (<View style={styles.container}><Text style={styles.errorText}>Acesso restrito a organizadores e administradores.</Text></View>);
    }
    if (loading) {
        return (<View style={styles.container}><ActivityIndicator size="large" color="#10B981" /></View>);
    }
    if (showConvocacaoForm && selectedGoleiro) {
        const custoReal = valorCalculado?.total || 0;
        return (
            <View style={styles.container}>
                <View style={styles.formHeader}><Text style={styles.formTitle}>Convocar {selectedGoleiro.nome}</Text><TouchableOpacity style={styles.closeButton} onPress={() => setShowConvocacaoForm(false)}><Text style={styles.closeButtonText}>✕</Text></TouchableOpacity></View>
                <ScrollView style={styles.form}>
                    <View style={styles.inputGroup}><Text style={styles.label}>Data do Jogo</Text><TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setShowDatePicker(true)}><Text style={{ color: convocacaoData.data ? '#374151' : '#9ca3af', fontSize: 14 }}>{convocacaoData.data || 'Selecione a data'}</Text><Calendar size={20} color="#10B981" /></TouchableOpacity>{showDatePicker && <DateTimePicker mode="date" value={selectedDate || new Date()} display="default" onChange={onChangeDate} minimumDate={new Date()} />}</View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Hora de Início</Text><TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setShowHoraInicioPicker(true)}><Text style={{ color: convocacaoData.hora_inicio ? '#374151' : '#9ca3af', fontSize: 14 }}>{convocacaoData.hora_inicio || 'Selecione a hora'}</Text><Clock size={20} color="#10B981" /></TouchableOpacity>{showHoraInicioPicker && <DateTimePicker mode="time" value={selectedHoraInicio || new Date()} display="spinner" is24Hour={true} onChange={onChangeHoraInicio} />}</View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Hora de Fim</Text><TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setShowHoraFimPicker(true)}><Text style={{ color: convocacaoData.hora_fim ? '#374151' : '#9ca3af', fontSize: 14 }}>{convocacaoData.hora_fim || 'Selecione a hora'}</Text><Clock size={20} color="#10B981" /></TouchableOpacity>{showHoraFimPicker && <DateTimePicker mode="time" value={selectedHoraFim || new Date()} display="spinner" is24Hour={true} onChange={onChangeHoraFim} />}</View>
                    
                    {renderInfoIntervalo()}
                    {renderLocalInput()}

                    {/* ===== INÍCIO DA MODIFICAÇÃO 4 ===== */}
                    {/* Este é o novo bloco de JSX que exibe o detalhamento completo das taxas. */}
                    {valorCalculado && (
                        <View style={styles.valorDetalhado}>
                            <Text style={styles.valorTitulo}>💵 Detalhamento do Valor</Text>
                            
                            <View style={styles.valorItem}>
                                <Text style={styles.valorLabel}>Valor base (Goleiro + Nível):</Text>
                                <Text style={styles.valorNumero}>{valorCalculado.valorBaseGoleiro.toFixed(2)} coins</Text>
                            </View>
                            
                            {valorCalculado.taxaDia > 0 && (
                                <View style={styles.valorItem}>
                                    <Text style={styles.valorLabel}>📅 Taxa do Dia (Fim de Semana/Seg):</Text>
                                    <Text style={[styles.valorNumero, styles.taxaExtra]}>+{valorCalculado.taxaDia.toFixed(2)} coins</Text>
                                </View>
                            )}

                            {valorCalculado.taxaHora > 0 && (
                                <View style={styles.valorItem}>
                                    <Text style={styles.valorLabel}>⏰ Taxa de Horário Nobre:</Text>
                                    <Text style={[styles.valorNumero, styles.taxaExtra]}>+{valorCalculado.taxaHora.toFixed(2)} coins</Text>
                                </View>
                            )}
                            
                             <View style={[styles.valorItem, styles.subTotal]}>
                                <Text style={styles.valorLabel}>Subtotal para o Goleiro:</Text>
                                <Text style={[styles.valorNumero, styles.subTotalNumero]}>{valorCalculado.valorGoleiro.toFixed(2)} coins</Text>
                            </View>

                            <View style={styles.valorItem}>
                                <Text style={styles.valorLabel}>📱 Taxa de Serviço do App:</Text>
                                <Text style={[styles.valorNumero, styles.taxaApp]}>+{valorCalculado.taxaApp.toFixed(2)} coins</Text>
                            </View>
                            
                            <View style={[styles.valorItem, styles.valorTotal]}>
                                <Text style={styles.valorLabel}>💰 CUSTO TOTAL:</Text>
                                <Text style={[styles.valorNumero, styles.valorTotalNumero]}>{valorCalculado.total.toFixed(2)} coins</Text>
                            </View>
                        </View>
                    )}
                    {/* ===== FIM DA MODIFICAÇÃO 4 ===== */}
                    
                    <View style={styles.valorInfo}><Text style={styles.valorText}>💳 Seu saldo disponível: {saldo.saldo_coins} coins</Text>{saldo.saldo_retido > 0 && <Text style={styles.saldoRetido}>Saldo retido: {saldo.saldo_retido} coins</Text>}</View>
                    <TouchableOpacity style={[styles.submitButton, saldo.saldo_coins < custoReal && styles.disabledButton]} onPress={handleSubmitConvocacao} disabled={saldo.saldo_coins < custoReal || !valorCalculado}><Text style={styles.submitButtonText}>{!valorCalculado ? 'Preencha os campos' : saldo.saldo_coins < custoReal ? 'Saldo Insuficiente' : `Confirmar Convocação - ${custoReal.toFixed(2)} coins`}</Text></TouchableOpacity>
                </ScrollView>
                {renderLocaisModal()}
            </View>
        );
    }
    return (
        <View style={styles.container}>
            <View style={styles.header}><Text style={styles.title}>🧤 Goleiros Disponíveis</Text><Text style={styles.subtitle}>Encontre o goleiro ideal para seu jogo</Text></View>
            <View style={styles.saldoCard}><Text style={styles.saldoText}>💰 Seu saldo disponível: {saldo.saldo_coins} coins</Text>{saldo.saldo_retido > 0 && <Text style={styles.saldoRetido}>Saldo retido: {saldo.saldo_retido} coins</Text>}</View>
            <View style={styles.filters}><View style={styles.searchContainer}><Search size={20} color="#6b7280" /><TextInput style={styles.searchInput} placeholder="Buscar goleiro..." value={searchQuery} onChangeText={setSearchQuery} /></View><View style={styles.filterContainer}><Filter size={20} color="#6b7280" /><TextInput style={styles.filterInput} placeholder="Nota mín." value={filterByRating} onChangeText={setFilterByRating} keyboardType="numeric" /></View></View>
            <ScrollView style={styles.goleirosList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshGoleiros} tintColor="#10B981" colors={['#10B981']}/>}>
                {filteredGoleiros.map((goleiro) => (
                    <View key={goleiro.id} style={styles.goleiroCard}>
                        <View style={styles.goleiroHeader}>
                            <View style={styles.goleiroInfo}>
                                <View style={styles.goleiroAvatar}>
                                    {goleiro.foto_url ? <Image source={{ uri: goleiro.foto_url }} style={styles.avatarImage} /> : <User size={24} color="#10B981" />}
                                </View>
                                <View>
                                    <Text style={styles.goleiroNome}>{goleiro.nome}</Text>
                                    <View style={styles.goleiroStats}>
                                        <View style={styles.statItem}><Star size={14} color="#F59E0B" /><Text style={styles.statText}>{goleiro.nota_media?.toFixed(1) ?? '0.0'}</Text></View>
                                        <View style={styles.statItem}><Target size={14} color="#6b7280" /><Text style={styles.statText}>{goleiro.jogos_realizados} jogos</Text></View>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.convocarButton} onPress={() => handleConvocar(goleiro)}><Plus size={16} color="#fff" /><Text style={styles.convocarText}>Convocar</Text></TouchableOpacity>
                        </View>
                        <View style={styles.goleiroTags}>{goleiro.tags.map((tag: string, index: number) => (<View key={index} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>))}</View>
                    </View>
                ))}
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
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f1f5f9' },
    formTitle: { fontWeight: '700', fontSize: 18, color: '#0f172a' },
    closeButton: { padding: 6 },
    closeButtonText: { fontSize: 18, fontWeight: '700', color: '#ef4444' },
    form: { paddingHorizontal: 12, flex: 1 },
    inputGroup: { marginBottom: 12 },
    label: { fontWeight: '500', color: '#0f172a', marginBottom: 4 },
    input: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#d1d5db', fontSize: 14 },
    valorDetalhado: { backgroundColor: '#ffffffff', padding: 12, borderRadius: 8, marginVertical: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    valorTitulo: { fontWeight: '700', color: '#0f172a', marginBottom: 8, fontSize: 16 },
    valorItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    valorLabel: { color: '#64748b', fontSize: 14 },
    valorNumero: { fontWeight: '600', color: '#0f172a', fontSize: 14 },
    taxaApp: { color: '#ef4444' },
    valorTotal: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 4 },
    valorTotalNumero: { color: '#10B981', fontWeight: '700', fontSize: 16 },
    valorInfo: { marginVertical: 12 },
    valorText: { fontWeight: '600', color: '#0f172a', marginBottom: 2 },
    submitButton: { backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 6 },
    submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    errorText: { color: '#ef4444', fontSize: 16, textAlign: 'center', marginTop: 24 },
    localInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    coordenadasText: { fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 16, width: '90%', maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    searchContainerModal: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 12, alignItems: 'center', marginBottom: 16, height: 40 },
    searchInputModal: { marginLeft: 6, flex: 1, height: 40 },
    localItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    localIcon: { marginRight: 12 },
    localInfo: { flex: 1 },
    localNome: { fontWeight: '600', color: '#0f172a', marginBottom: 2 },
    localCoordenadas: { fontSize: 10, color: '#64748b', fontStyle: 'italic' },
    loadingIndicator: { marginVertical: 20 },
    emptyText: { textAlign: 'center', color: '#64748b', marginTop: 20 },
    intervaloInfo: {
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 6,
        marginVertical: 4,
    },
    intervaloText: {
        textAlign: 'center',
        color: '#475569',
        fontWeight: '600',
        fontSize: 12,
    },
    intervaloSubtext: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: 10,
        marginTop: 2,
    },
    // ===== INÍCIO DA MODIFICAÇÃO 5 =====
    // Adicionamos os novos estilos necessários para o detalhamento.
    taxaExtra: {
        color: '#f97316', // Um laranja para destacar as taxas extras
    },
    subTotal: {
        paddingTop: 6,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopStyle: 'dashed',
        borderTopColor: '#e2e8f0',
    },
    subTotalNumero: {
        fontWeight: '700',
    },
    // ===== FIM DA MODIFICAÇÃO 5 =====
});