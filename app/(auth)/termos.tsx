import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

export default function TermosPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header com botão X para fechar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Termos de Uso - GoleiroON</Text>
      </View>

      {/* Conteúdo dos termos */}
      <ScrollView style={styles.scroll}>
        <Text style={styles.text}>
          1. Aceitação dos Termos{"\n\n"}
          Ao acessar ou utilizar o aplicativo GoleiroON, você concorda em cumprir estes Termos de Uso. 
          Se não concordar, não utilize o App.{"\n\n"}
          
          2. Escopo do Serviço{"\n\n"}
          O App atua exclusivamente como intermediador de contato entre jogadores e goleiros. 
          O App não presta serviços de organização, supervisão ou assistência médica.{"\n\n"}
          
          3. Risco e Assunção de Responsabilidade{"\n\n"}
          A prática de futebol amador envolve riscos inerentes de lesões. Ao utilizar o App, o Usuário 
          assume integralmente esses riscos. O App não é responsável por lesões, óbitos, perdas financeiras 
          ou danos ocorridos durante os jogos.{"\n\n"}
          
          4. Isenção de Garantias{"\n\n"}
          O App não garante condições de segurança, qualidade dos locais ou veracidade das informações 
          fornecidas por terceiros.{"\n\n"}
          
          5. Limitação de Responsabilidade{"\n\n"}
          Em hipótese alguma o App será responsável por danos diretos ou indiretos decorrentes da participação 
          em jogos. A responsabilidade máxima do App será limitada a R$ 1.000,00 ou ao valor pago pelo usuário, 
          o que for menor.{"\n\n"}
          
          6. Obrigações do Usuário{"\n\n"}
          O usuário deve fornecer informações verdadeiras, avaliar condições de segurança e respeitar regras locais.{"\n\n"}
          
          7. Seguro{"\n\n"}
          O App não fornece seguro por padrão. É recomendável que o usuário possua cobertura própria.{"\n\n"}
          
          8. Foro{"\n\n"}
          Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de Santa Rita do Sapucaí/MG 
          para dirimir quaisquer questões.{"\n\n"}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    marginRight: 12,
    padding: 4,
  },
  title: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center', color: '#111827' },
  scroll: { flex: 1 },
  text: { fontSize: 15, lineHeight: 22, color: '#374151' },
});
