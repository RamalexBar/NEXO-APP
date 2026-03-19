// ================================================
// NEXO — Pantalla de Gamificación: logros y ranking
// Archivo: frontend/src/screens/GamificationScreen.js
// ================================================

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import useStore from '../store/useStore';

const COLORES = {
  fondo: '#0f0f1a', card: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
};

export default function GamificationScreen({ navigation }) {
  const [datos, setDatos]         = useState(null);
  const [ranking, setRanking]     = useState([]);
  const [tab, setTab]             = useState('logros'); // logros | ranking | racha
  const [cargando, setCargando]   = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const { user } = useStore();
  const insets = useSafeAreaInsets();

  const cargar = async () => {
    try {
      const [resLogros, resRanking] = await Promise.all([
        api.get('/gamification/mis-logros'),
        api.get('/gamification/ranking?limite=20'),
      ]);
      setDatos(resLogros.data);
      setRanking(resRanking.data.ranking || []);
    } catch (e) { console.error(e); }
    finally { setCargando(false); setRefrescando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const LogroCard = ({ logro }) => (
    <View style={[styles.logroCard, !logro.obtenido && styles.logroCardPendiente]}>
      <View style={[styles.logroIcono, !logro.obtenido && { opacity: 0.35 }]}>
        <Text style={{ fontSize: 28 }}>{logro.emoji}</Text>
      </View>
      <View style={styles.logroInfo}>
        <Text style={[styles.logroTitulo, !logro.obtenido && { color: 'rgba(255,255,255,0.4)' }]}>
          {logro.titulo}
        </Text>
        <Text style={styles.logroDesc}>{logro.descripcion}</Text>
        {logro.obtenido && logro.fecha_obtenido && (
          <Text style={styles.logroFecha}>
            Obtenido el {new Date(logro.fecha_obtenido).toLocaleDateString('es-CO')}
          </Text>
        )}
      </View>
      <View style={[styles.logroMonedas, !logro.obtenido && { opacity: 0.35 }]}>
        <Text style={styles.logroMonedasTexto}>💰 {logro.monedas}</Text>
      </View>
      {logro.obtenido && <View style={styles.logroBadge}><Text style={{ fontSize: 10 }}>✓</Text></View>}
    </View>
  );

  const RankingItem = ({ item, index }) => {
    const foto = item.profiles?.fotos?.[0];
    const medallas = ['🥇', '🥈', '🥉'];
    return (
      <TouchableOpacity
        style={styles.rankingItem}
        onPress={() => navigation.navigate('VerPerfil', { userId: item.id })}
      >
        <Text style={styles.rankingPos}>
          {index < 3 ? medallas[index] : `${index + 1}`}
        </Text>
        <View style={styles.rankingFoto}>
          {foto
            ? <Image source={{ uri: foto }} style={styles.rankingImg} contentFit="cover" />
            : <View style={[styles.rankingImg, { backgroundColor: '#2d1b45', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 18 }}>👤</Text>
              </View>
          }
        </View>
        <View style={styles.rankingInfo}>
          <Text style={styles.rankingNombre}>{item.nombre}, {item.edad}</Text>
          <Text style={styles.rankingLikes}>❤️ {item.likes_semana} likes esta semana</Text>
        </View>
        <View style={[styles.rankingBadge, { backgroundColor: index < 3 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.08)' }]}>
          <Text style={[styles.rankingBadgeTexto, { color: index < 3 ? '#FFD700' : 'rgba(255,255,255,0.4)' }]}>
            {item.badge_reputacion === 'oro' ? '⭐' : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (cargando) {
    return (
      <View style={[styles.fondo, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <ActivityIndicator size="large" color="#C44DFF" />
      </View>
    );
  }

  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.titulo}>🏆 Logros y ranking</Text>
      </View>

      {/* Resumen de racha */}
      {datos && (
        <LinearGradient colors={['rgba(196,77,255,0.2)', 'rgba(255,107,157,0.1)']} style={styles.resumenCard}>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenNum}>{datos.racha_dias}</Text>
            <Text style={styles.resumenLabel}>🔥 Racha días</Text>
          </View>
          <View style={styles.separador} />
          <View style={styles.resumenItem}>
            <Text style={styles.resumenNum}>{datos.obtenidos_total}</Text>
            <Text style={styles.resumenLabel}>🏆 Logros</Text>
          </View>
          <View style={styles.separador} />
          <View style={styles.resumenItem}>
            <Text style={styles.resumenNum}>{datos.reputacion}</Text>
            <Text style={styles.resumenLabel}>⭐ Reputación</Text>
          </View>
        </LinearGradient>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {['logros', 'ranking'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActivo]} onPress={() => setTab(t)}>
            <Text style={[styles.tabTexto, tab === t && styles.tabTextoActivo]}>
              {t === 'logros' ? '🏆 Logros' : '🌟 Ranking'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor="#C44DFF" />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
      >
        {tab === 'logros' && datos?.logros?.map(logro => (
          <LogroCard key={logro.id} logro={logro} />
        ))}

        {tab === 'ranking' && ranking.map((item, i) => (
          <RankingItem key={item.id} item={item} index={i} />
        ))}

        {tab === 'ranking' && ranking.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 48 }}>🌟</Text>
            <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
              Sé el primero en el ranking esta semana
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORES.fondo },
  header: { padding: 20, paddingBottom: 12 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#fff' },
  resumenCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  resumenItem: { alignItems: 'center', gap: 4 },
  resumenNum: { fontSize: 28, fontWeight: '700', color: '#fff' },
  resumenLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  separador: { width: 0.5, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActivo: { backgroundColor: 'rgba(196,77,255,0.25)' },
  tabTexto: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  tabTextoActivo: { color: '#C44DFF', fontWeight: '600' },
  logroCard: { flexDirection: 'row', gap: 12, backgroundColor: COLORES.card, borderRadius: 14, padding: 12, borderWidth: 0.5, borderColor: COLORES.border, alignItems: 'center' },
  logroCardPendiente: { borderColor: 'rgba(255,255,255,0.04)' },
  logroIcono: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(196,77,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  logroInfo: { flex: 1, gap: 2 },
  logroTitulo: { fontSize: 14, fontWeight: '600', color: '#fff' },
  logroDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  logroFecha: { fontSize: 11, color: '#4ade80', marginTop: 2 },
  logroMonedas: { backgroundColor: 'rgba(255,165,0,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  logroMonedasTexto: { fontSize: 11, color: '#FFA500' },
  logroBadge: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#4ade80', justifyContent: 'center', alignItems: 'center' },
  rankingItem: { flexDirection: 'row', gap: 12, backgroundColor: COLORES.card, borderRadius: 14, padding: 12, borderWidth: 0.5, borderColor: COLORES.border, alignItems: 'center' },
  rankingPos: { fontSize: 20, width: 28, textAlign: 'center' },
  rankingFoto: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  rankingImg: { width: '100%', height: '100%' },
  rankingInfo: { flex: 1, gap: 3 },
  rankingNombre: { fontSize: 14, fontWeight: '600', color: '#fff' },
  rankingLikes: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  rankingBadge: { borderRadius: 10, padding: 6 },
  rankingBadgeTexto: { fontSize: 14 },
});
