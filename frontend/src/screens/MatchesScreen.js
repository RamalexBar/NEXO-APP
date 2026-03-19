// ================================================
// NEXO - Pantalla de Matches y Conversaciones
// Archivo: frontend/src/screens/MatchesScreen.js
// ================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import useStore from '../store/useStore';
import { matchAPI } from '../services/api';

const COLORES = {
  fondo: '#0f0f1a',
  card: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  texto: '#FFFFFF',
  textoMuted: 'rgba(255,255,255,0.5)',
  acento: '#FF6B9D',
  acento2: '#C44DFF',
};

export default function MatchesScreen({ navigation }) {
  const { matches, setMatches } = useStore();
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [tabActiva, setTabActiva] = useState('mensajes'); // 'nuevos' | 'mensajes'
  const insets = useSafeAreaInsets();

  const cargarMatches = useCallback(async () => {
    try {
      const { data } = await matchAPI.getMisMatches();
      setMatches(data.matches);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargarMatches(); }, []);

  const onRefrescar = () => { setRefrescando(true); cargarMatches(); };

  // Separar matches nuevos (sin mensajes) de conversaciones activas
  const matchesNuevos = matches.filter(m => !m.tiene_mensajes);
  const conversaciones = matches.filter(m => m.tiene_mensajes);

  const renderMatchNuevo = ({ item }) => {
    const foto = item.usuario?.profiles?.fotos?.[0];
    return (
      <TouchableOpacity
        style={styles.avatarMatchContenedor}
        onPress={() => navigation.navigate('Chat', { match: item })}
      >
        <View style={styles.avatarMatchWrapper}>
          {foto
            ? <Image source={{ uri: foto }} style={styles.avatarMatch} contentFit="cover" />
            : <View style={[styles.avatarMatch, styles.avatarFallback]}><Text style={{ fontSize: 24 }}>👤</Text></View>
          }
          <View style={[styles.puntitOnline, { backgroundColor: item.usuario?.is_online ? '#4ade80' : '#555' }]} />
          {/* Borde degradado */}
          <View style={styles.avatarBorde} />
        </View>
        <Text style={styles.avatarMatchNombre} numberOfLines={1}>{item.usuario?.nombre}</Text>
      </TouchableOpacity>
    );
  };

  const renderConversacion = ({ item }) => {
    const foto = item.usuario?.profiles?.fotos?.[0];
    const ultimoMsg = item.ultimo_mensaje;
    const esMio = ultimoMsg?.sender_id === item.usuario?.id ? false : true;
    const noLeido = ultimoMsg && !ultimoMsg.leido && !esMio;

    return (
      <TouchableOpacity
        style={styles.convItem}
        onPress={() => navigation.navigate('Chat', { match: item })}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.convAvatarWrapper}>
          {foto
            ? <Image source={{ uri: foto }} style={styles.convAvatar} contentFit="cover" />
            : <View style={[styles.convAvatar, styles.avatarFallback]}><Text style={{ fontSize: 20 }}>👤</Text></View>
          }
          <View style={[styles.puntitOnlineSmall, { backgroundColor: item.usuario?.is_online ? '#4ade80' : '#555' }]} />
        </View>

        {/* Info */}
        <View style={styles.convInfo}>
          <View style={styles.convFila}>
            <Text style={[styles.convNombre, noLeido && styles.convNombreNoLeido]}>
              {item.usuario?.nombre}
            </Text>
            {ultimoMsg && (
              <Text style={styles.convHora}>
                {formatDistanceToNow(new Date(ultimoMsg.sent_at), { locale: es, addSuffix: false })}
              </Text>
            )}
          </View>
          <View style={styles.convFila}>
            <Text
              style={[styles.convPreview, noLeido && styles.convPreviewNoLeido]}
              numberOfLines={1}
            >
              {ultimoMsg
                ? (esMio ? `Tú: ${ultimoMsg.contenido}` : ultimoMsg.contenido)
                : '¡Haz match! Di hola 👋'
              }
            </Text>
            {noLeido && <View style={styles.badgeNoLeido} />}
          </View>
        </View>

        {/* Score */}
        <View style={styles.convScore}>
          <Text style={styles.convScoreTexto}>{item.score}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (cargando) {
    return (
      <View style={[styles.fondo, styles.centrado]}>
        <ActivityIndicator size="large" color="#C44DFF" />
      </View>
    );
  }

  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.titulo}>❤️ Matches</Text>
        <Text style={styles.totalTexto}>{matches.length} conexiones</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tabActiva === 'nuevos' && styles.tabActiva]}
          onPress={() => setTabActiva('nuevos')}
        >
          <Text style={[styles.tabTexto, tabActiva === 'nuevos' && styles.tabTextoActivo]}>
            Nuevos {matchesNuevos.length > 0 && `(${matchesNuevos.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabActiva === 'mensajes' && styles.tabActiva]}
          onPress={() => setTabActiva('mensajes')}
        >
          <Text style={[styles.tabTexto, tabActiva === 'mensajes' && styles.tabTextoActivo]}>
            Mensajes {conversaciones.length > 0 && `(${conversaciones.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab nuevos matches */}
      {tabActiva === 'nuevos' && (
        matchesNuevos.length > 0 ? (
          <FlatList
            data={matchesNuevos}
            keyExtractor={i => i.match_id}
            renderItem={renderMatchNuevo}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, gap: 16 }}
            style={{ maxHeight: 130, flexGrow: 0 }}
          />
        ) : (
          <View style={styles.vacio}>
            <Text style={{ fontSize: 50 }}>💫</Text>
            <Text style={styles.vacioTexto}>Aún no tienes nuevos matches</Text>
            <Text style={styles.vacioSub}>Sigue explorando perfiles en la pantalla principal</Text>
          </View>
        )
      )}

      {/* Tab mensajes */}
      {tabActiva === 'mensajes' && (
        conversaciones.length > 0 ? (
          <FlatList
            data={conversaciones}
            keyExtractor={i => i.match_id}
            renderItem={renderConversacion}
            contentContainerStyle={{ padding: 16, gap: 4 }}
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor="#C44DFF" />}
            ItemSeparatorComponent={() => <View style={styles.separador} />}
          />
        ) : (
          <View style={styles.vacio}>
            <Text style={{ fontSize: 50 }}>💬</Text>
            <Text style={styles.vacioTexto}>Ninguna conversación aún</Text>
            <Text style={styles.vacioSub}>Cuando hagas match, empieza la conversación aquí</Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORES.fondo },
  centrado: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#fff' },
  totalTexto: { color: COLORES.textoMuted, fontSize: 13 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActiva: { backgroundColor: 'rgba(196,77,255,0.25)' },
  tabTexto: { color: COLORES.textoMuted, fontSize: 14 },
  tabTextoActivo: { color: '#C44DFF', fontWeight: '600' },
  avatarMatchContenedor: { alignItems: 'center', width: 72 },
  avatarMatchWrapper: { position: 'relative', marginBottom: 6 },
  avatarMatch: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d1b45' },
  avatarBorde: { position: 'absolute', inset: -2, borderRadius: 34, borderWidth: 2, borderColor: '#C44DFF' },
  puntitOnline: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORES.fondo },
  puntitOnlineSmall: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: COLORES.fondo },
  avatarMatchNombre: { color: '#fff', fontSize: 11, textAlign: 'center' },
  convItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 4 },
  convAvatarWrapper: { position: 'relative' },
  convAvatar: { width: 52, height: 52, borderRadius: 26 },
  convInfo: { flex: 1, gap: 4 },
  convFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convNombre: { fontSize: 15, color: '#fff', fontWeight: '500' },
  convNombreNoLeido: { fontWeight: '700' },
  convHora: { fontSize: 11, color: COLORES.textoMuted },
  convPreview: { flex: 1, fontSize: 13, color: COLORES.textoMuted, marginRight: 8 },
  convPreviewNoLeido: { color: '#fff' },
  badgeNoLeido: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORES.acento },
  convScore: { backgroundColor: 'rgba(196,77,255,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  convScoreTexto: { color: '#C44DFF', fontSize: 11, fontWeight: '600' },
  separador: { height: 1, backgroundColor: COLORES.border, marginVertical: 6 },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  vacioTexto: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  vacioSub: { color: COLORES.textoMuted, fontSize: 14, textAlign: 'center' },
});
