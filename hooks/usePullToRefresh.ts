import { ScrollView, RefreshControl, View, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { getConvocacoes } from '@/lib/api';

export default function ConvocacoesPage() {
  const [convocacoes, setConvocacoes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const dados = await getConvocacoes();
    setConvocacoes(dados);
  };

  const onRefresh = async () => {
    setRefreshing(true);   // mostra o spinner
    await loadData();      // recarrega dados
    setRefreshing(false);  // esconde o spinner
  };

  useEffect(() => {
    loadData(); // busca inicial
  }, []);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {convocacoes.map(c => (
        <View key={c.id} style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>{c.status} - {c.goleiro_id}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
