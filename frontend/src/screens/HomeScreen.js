// ================================================
// NEXO - Pantalla principal de Swipe
// Archivo: frontend/src/screens/HomeScreen.js
// ================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, ActivityIndicator
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';
import { matchAPI, activeAPI } from '../services/api';
import MatchModal from '../components/MatchModal';
import AnuncioCard from '../components/AnuncioCard';

const COLORES = {
  fondo: '#0f0f1a',
  gradiente1: '#FF6B9D',
  gradiente2: '#C44DFF',
  texto: '#FFFFFF',
  textoMuted: 'rgba(255,255,255,0.6)',
  botonPasar: '#FF6464',
  botonLike: '#FF6B9D',
  botonSuperLike: '#FFD700',
  botonBoost: '#FF9B6B',
};

export default function HomeScreen({ navigation }) {
  const { user, perfilesFeed, setPerfilesFeed, removerPerfilFeed, setNuevoMatch } = useStore();
  const [cargando, setCargando] = useState(true);
  const [contadorPerfiles, setContadorPerfiles] = useState(0);
  const [mostrarAnuncio, setMostrarAnuncio] = useState(false);
  const [anuncioActual, setAnuncioActual] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const swiperRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Cargar perfiles al iniciar
  const [contadorActivos, setContadorActivos] = useState(0);

  useEffect(() => {
    cargarFeed();
    // Mejora 2: Cargar contador de activos
    activeAPI.getContador()
      .then(r => setContadorActivos(r.data.total_activos || 0))
      .catch(() => {});
  }, []);

  const cargarFeed = async () => {
    try {
      setCargando(true);
      const { data } = await matchAPI.getFeed(20);
      setPerfilesFeed(data.perfiles);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los perfiles.');
    } finally {
      setCargando(false);
    }
  };

  // Mostrar anuncio cada 5 perfiles
  const verificarAnuncio = (index) => {
    if ((index + 1) % 5 === 0) {
      setAnuncioActual({
        tipo: 'banner',
        titulo: 'Nexo Premium',
        descripcion: 'Sin límites, sin anuncios. Conéctate mejor.',
      });
      setMostrarAnuncio(true);
    }
  };

  // Animación al presionar botón
  const animarBoton = (callback) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(callback);
  };

  // Procesar acción de swipe
  const procesarAccion = useCallback(async (perfilId, tipo) => {
    if (procesando) return;
    setProcesando(true);
    try {
      const { data } = await matchAPI.darLike(perfilId, tipo);

      if (data.es_match && data.es_nuevo) {
        const perfil = perfilesFeed.find(p => p.id === perfilId);
        setNuevoMatch({ ...data, perfil });
      }

      setContadorPerfiles(prev => {
        const nuevo = prev + 1;
        verificarAnuncio(prev);
        return nuevo;
      });

    } catch (error) {
      if (error.response?.status === 402) {
        Alert.alert('Monedas insuficientes', error.response.data.error);
      }
    } finally {
      setProcesando(false);
    }
  }, [procesando, perfilesFeed]);

  const onSwipeLeft = (index) => {
    const perfil = perfilesFeed[index];
    if (perfil) procesarAccion(perfil.id, 'dislike');
  };

  const onSwipeRight = (index) => {
    const perfil = perfilesFeed[index];
    if (perfil) procesarAccion(perfil.id, 'like');
  };

  const onSwipeTop = (index) => {
    const perfil = perfilesFeed[index];
    if (perfil) procesarAccion(perfil.id, 'superlike');
  };

  // Botones de acción manual
  const btnPasar = () => { animarBoton(() => swiperRef.current?.swipeLeft()); };
  const btnLike = () => { animarBoton(() => swiperRef.current?.swipeRight()); };
  const btnSuperLike = () => { animarBoton(() => swiperRef.current?.swipeTop()); };
  const btnBoost = () => {
    Alert.alert(
      '⚡ Activar Boost',
      'Tu perfil aparecerá primero durante 30 minutos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Activar (150 monedas)', onPress: activarBoost }
      ]
    );
  };

  const activarBoost = async () => {
    try {
      const { monetizationAPI } = await import('../services/api');
      await monetizationAPI.usarBoost();
      Alert.alert('⚡ ¡Boost activado!', 'Tu perfil aparece primero por 30 min.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'No se pudo activar.');
    }
  };

  // Renderizar tarjeta de perfil
  const renderCard = (perfil) => {
    if (!perfil) return null;
    const foto = perfil.profiles?.fotos?.[0];
    const intereses = perfil.profiles?.intereses?.slice(0, 3) || [];
    const score = perfil.compatibilidad?.score || 0;

    return (
      <View style={styles.tarjeta}>
        {/* Foto principal */}
        {foto ? (
          <Image source={{ uri: foto }} style={styles.fotoTarjeta} contentFit="cover" />
        ) : (
          <View style={[styles.fotoTarjeta, styles.fotoPlaceholder]}>
            <Text style={{ fontSize: 80 }}>👤</Text>
          </View>
        )}

        {/* Gradiente inferior */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.gradienteTarjeta}
        >
          {/* Info del usuario */}
          <View style={styles.infoTarjeta}>
            <View style={styles.filaHeader}>
              <Text style={styles.nombreEdad}>
                {perfil.nombre}, {perfil.edad}
              </Text>
              <View style={[styles.puntito, { backgroundColor: perfil.is_online ? '#4ade80' : '#888' }]} />
            </View>

            <Text style={styles.ubicacion}>
              📍 {perfil.profiles?.ciudad || 'Cerca de ti'}
            </Text>

            {/* Barra de compatibilidad */}
            <View style={styles.filaCompatibilidad}>
              <Text style={styles.textoCompat}>Compatibilidad</Text>
              <View style={styles.barraFondo}>
                <View style={[styles.barraRelleno, { width: `${score}%` }]} />
              </View>
              <Text style={[styles.numCompatibilidad, score >= 60 && styles.altoMatch]}>
                {score}%
              </Text>
            </View>

            {/* Intereses */}
            {intereses.length > 0 && (
              <View style={styles.filaIntereses}>
                {intereses.map((interes, i) => (
                  <View key={i} style={styles.tagInteres}>
                    <Text style={styles.textoInteres}>{interes}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Badge alto match */}
        {score >= 60 && (
          <View style={styles.badgeMatch}>
            <Text style={styles.textoBadge}>⚡ Alto match</Text>
          </View>
        )}
      </View>
    );
  };

  if (cargando) {
    return (
      <View style={[styles.contenedor, styles.centrado]}>
        <ActivityIndicator size="large" color={COLORES.gradiente1} />
        <Text style={[styles.textoMuted, { marginTop: 12 }]}>Buscando personas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoTexto}>✦ NEXO</Text>
        <View style={styles.headerDerecha}>
          {/* Mejora 2: Badge activos ahora */}
          {contadorActivos > 0 && (
            <TouchableOpacity
              style={styles.activosBadge}
              onPress={() => navigation.navigate('ActivosAhora')}
            >
              <View style={styles.puntitoVerde} />
              <Text style={styles.activosTexto}>{contadorActivos} activos</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.monedasTexto}>💰 {user?.coins_balance || 0}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Configuracion')}>
            <Ionicons name="settings-outline" size={22} color={COLORES.texto} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Swiper de tarjetas */}
      {perfilesFeed.length > 0 ? (
        <Swiper
          ref={swiperRef}
          cards={perfilesFeed}
          renderCard={renderCard}
          onSwipedLeft={onSwipeLeft}
          onSwipedRight={onSwipeRight}
          onSwipedTop={onSwipeTop}
          onSwipedAll={cargarFeed}
          stackSize={3}
          stackScale={8}
          stackSeparation={16}
          animateOverlayLabelsOpacity
          overlayLabels={{
            left: {
              title: 'PASAR',
              style: {
                label: { color: COLORES.botonPasar, fontSize: 40, fontWeight: 'bold', borderColor: COLORES.botonPasar, borderWidth: 3, padding: 8, borderRadius: 8 },
                wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 40, marginLeft: -30 }
              }
            },
            right: {
              title: 'LIKE ♥',
              style: {
                label: { color: COLORES.botonLike, fontSize: 40, fontWeight: 'bold', borderColor: COLORES.botonLike, borderWidth: 3, padding: 8, borderRadius: 8 },
                wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 40, marginLeft: 30 }
              }
            },
            top: {
              title: 'SUPER ★',
              style: {
                label: { color: COLORES.botonSuperLike, fontSize: 30, fontWeight: 'bold', borderColor: COLORES.botonSuperLike, borderWidth: 3, padding: 8, borderRadius: 8 },
                wrapper: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 30 }
              }
            }
          }}
          backgroundColor="transparent"
          cardVerticalMargin={0}
          cardHorizontalMargin={16}
        />
      ) : (
        <View style={styles.sinPerfiles}>
          <Text style={{ fontSize: 60 }}>🔍</Text>
          <Text style={styles.textoSinPerfiles}>No hay más perfiles por ahora</Text>
          <Text style={styles.textoMuted}>Vuelve más tarde o amplía tu radio de búsqueda</Text>
          <TouchableOpacity style={styles.btnRecargar} onPress={cargarFeed}>
            <Text style={styles.textoBtnRecargar}>Recargar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botones de acción */}
      <Animated.View style={[styles.botonesAccion, { transform: [{ scale: scaleAnim }] }]}>
        {/* Pasar */}
        <TouchableOpacity style={[styles.botonRedondo, styles.botonGrande, { borderColor: COLORES.botonPasar }]} onPress={btnPasar}>
          <Ionicons name="close" size={28} color={COLORES.botonPasar} />
        </TouchableOpacity>

        {/* Super Like */}
        <TouchableOpacity style={[styles.botonRedondo, styles.botonMediano, { borderColor: COLORES.botonSuperLike }]} onPress={btnSuperLike}>
          <Ionicons name="star" size={20} color={COLORES.botonSuperLike} />
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity onPress={btnLike}>
          <LinearGradient colors={[COLORES.gradiente1, COLORES.gradiente2]} style={[styles.botonRedondo, styles.botonPrincipal]}>
            <Ionicons name="heart" size={32} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Boost */}
        <TouchableOpacity style={[styles.botonRedondo, styles.botonMediano, { borderColor: COLORES.botonBoost }]} onPress={btnBoost}>
          <Ionicons name="flash" size={20} color={COLORES.botonBoost} />
        </TouchableOpacity>

        {/* Volver */}
        <TouchableOpacity style={[styles.botonRedondo, styles.botonGrande, { borderColor: 'rgba(100,150,255,0.8)' }]} onPress={() => swiperRef.current?.swipeBack()}>
          <Ionicons name="arrow-undo" size={22} color="rgba(100,150,255,0.8)" />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal de nuevo match */}
      <MatchModal onClose={() => setNuevoMatch(null)} navigation={navigation} />

      {/* Modal de anuncio */}
      {mostrarAnuncio && (
        <AnuncioCard
          anuncio={anuncioActual}
          onCerrar={() => setMostrarAnuncio(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  centrado: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10
  },
  logoTexto: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 2 },
  activosBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  puntitoVerde: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  activosTexto: { color: '#4ade80', fontSize: 11, fontWeight: '600' },
  headerDerecha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monedasTexto: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  tarjeta: {
    height: '100%', borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#1a1a2e'
  },
  fotoTarjeta: { width: '100%', height: '100%', position: 'absolute' },
  fotoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d1b45' },
  gradienteTarjeta: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
    justifyContent: 'flex-end', padding: 20
  },
  infoTarjeta: { gap: 6 },
  filaHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nombreEdad: { fontSize: 24, fontWeight: '700', color: '#fff' },
  puntito: { width: 10, height: 10, borderRadius: 5 },
  ubicacion: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  filaCompatibilidad: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  textoCompat: { fontSize: 11, color: 'rgba(255,255,255,0.6)', width: 80 },
  barraFondo: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  barraRelleno: { height: '100%', borderRadius: 2, backgroundColor: COLORES.gradiente1 },
  numCompatibilidad: { fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 35, textAlign: 'right' },
  altoMatch: { color: COLORES.gradiente1, fontWeight: '600' },
  filaIntereses: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  tagInteres: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4
  },
  textoInteres: { fontSize: 12, color: '#fff' },
  badgeMatch: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(196,77,255,0.85)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4
  },
  textoBadge: { color: '#fff', fontSize: 11, fontWeight: '600' },
  botonesAccion: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 14, paddingBottom: 100, paddingTop: 16
  },
  botonRedondo: {
    borderRadius: 50, borderWidth: 2, justifyContent: 'center', alignItems: 'center'
  },
  botonGrande: { width: 52, height: 52 },
  botonMediano: { width: 44, height: 44 },
  botonPrincipal: { width: 68, height: 68, borderWidth: 0 },
  sinPerfiles: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 30 },
  textoSinPerfiles: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center' },
  textoMuted: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  btnRecargar: {
    marginTop: 20, backgroundColor: COLORES.gradiente1, borderRadius: 20,
    paddingHorizontal: 30, paddingVertical: 12
  },
  textoBtnRecargar: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
