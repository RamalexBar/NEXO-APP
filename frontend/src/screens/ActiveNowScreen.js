// ================================================
// NEXO — Mejora 2: Pantalla Activos Ahora
// Archivo: frontend/src/screens/ActiveNowScreen.js
// ================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activeAPI, matchAPI } from '../services/api';

const COLORES = {
  fondo: '#0f0f1a', texto: '#FFFFFF',
  muted: 'rgba(255,255,255,0.5)', verde: '#4ade80',
  card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)',
};

export default function ActiveNowScreen({ navigation }) {
  const [activos, setActivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [contador, setContador] = useState(0);
  const insets = useSafeAreaInsets();

  const cargar = useCallback(async () => {
    try {
      const [resActivos, resContador] = await Promise.all([
        activeAPI.getActivosAhora(30),
        activeAPI.getContador(),
      ]);
      setActivos(resActivos.data.activos || []);
      setContador(resContador.data.total_activos || 0);
    } catch (e) { console.error(e); }
    finally { setCargando(false); setRefrescando(false); }
  }, []);

  useEffect(() => {
    cargar();
    // Refrescar cada 30 segundos
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, []);

  const darLike = async (userId) => {
    try {
      const { data } = await matchAPI.darLike(userId, 'like');
      if (data.es_match && data.es_nuevo) {
        navigation.navigate('Main');
      }
    } catch (e) { console.error(e); }
  };

  const renderActivo = ({ item }) => {
    const foto = item.profiles?.fotos?.[0];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('VerPerfil', { userId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.fotoContenedor}>
          {foto
            ? <Image source={{ uri: foto }} style={styles.foto} contentFit="cover" />
            : <View style={[styles.foto, styles.fotoFallback]}><Text style={{ fontSize: 28 }}>👤</Text></View>
          }
          {/* Indicador online animado */}
          <View style={styles.onlineBadge}>
            <View style={styles.onlinePunto} />
            <Text style={styles.onlineTexto}>Ahora</Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.nombre}>{item.nombre}, {item.edad}</Text>
          {item.profiles?.bio
            ? <Text style={styles.bio} numberOfLines={2}>{item.profiles.bio}</Text>
            : null
          }
          <View style={styles.interesesFila}>
            {item.profiles?.intereses?.slice(0, 2).map((int, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagTexto}>{int}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity onPress={() => darLike(item.id)}>
          <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnLike}>
            <Text style={{ fontSize: 18 }}>♥</Text>
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.titulo}>🔥 Activos ahora</Text>
          <Text style={styles.subtitulo}>{contador} personas conectadas</Text>
        </View>
        <View style={styles.puntoBig}>
          <View style={styles.puntoBigInner} />
        </View>
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#FF6B9D" />
        </View>
      ) : (
        <FlatList
          data={activos}
          keyExtractor={i => i.id}
          renderItem={renderActivo}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refrescando}
              onRefresh={() => { setRefrescando(true); cargar(); }}
              tintColor="#C44DFF" />
          }
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={{ fontSize: 48 }}>😴</Text>
              <Text style={styles.vacioTexto}>Nadie activo ahora</Text>
              <Text style={styles.muted}>Vuelve más tarde o amplía tu búsqueda</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORES.fondo },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitulo: { color: COLORES.muted, fontSize: 13, marginTop: 2 },
  puntoBig: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(74,222,128,0.15)', justifyContent: 'center', alignItems: 'center' },
  puntoBigInner: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORES.verde },
  card: { flexDirection: 'row', gap: 12, backgroundColor: COLORES.card, borderRadius: 16, padding: 12, borderWidth: 0.5, borderColor: COLORES.border, alignItems: 'center' },
  fotoContenedor: { position: 'relative' },
  foto: { width: 64, height: 64, borderRadius: 32 },
  fotoFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d1b45' },
  onlineBadge: { position: 'absolute', bottom: -4, left: '50%', transform: [{ translateX: -24 }], flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#0f0f1a', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  onlinePunto: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORES.verde },
  onlineTexto: { color: COLORES.verde, fontSize: 9, fontWeight: '600' },
  info: { flex: 1, gap: 4 },
  nombre: { fontSize: 15, fontWeight: '600', color: '#fff' },
  bio: { fontSize: 12, color: COLORES.muted, lineHeight: 17 },
  interesesFila: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  tag: { backgroundColor: 'rgba(196,77,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagTexto: { color: '#C44DFF', fontSize: 10 },
  btnLike: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  vacio: { padding: 60, alignItems: 'center', gap: 10 },
  vacioTexto: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center' },
  muted: { color: COLORES.muted, fontSize: 13, textAlign: 'center' },
});
