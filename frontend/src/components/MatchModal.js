// ================================================
// NEXO - Modal de nuevo match
// Archivo: frontend/src/components/MatchModal.js
// ================================================

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import useStore from '../store/useStore';

export default function MatchModal({ navigation }) {
  const { nuevoMatch, limpiarNuevoMatch, user } = useStore();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (nuevoMatch) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [nuevoMatch]);

  if (!nuevoMatch) return null;

  const perfil = nuevoMatch.perfil;
  const foto = perfil?.profiles?.fotos?.[0];

  const irAlChat = () => {
    limpiarNuevoMatch();
    navigation.navigate('Chat', { match: {
      match_id: nuevoMatch.match_id,
      usuario: perfil,
      score: nuevoMatch.compatibilidad?.score || 0,
    }});
  };

  return (
    <Modal transparent animationType="none" visible={!!nuevoMatch}>
      <Animated.View style={[styles.fondo, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.contenido, { transform: [{ scale: scaleAnim }] }]}>

          {/* Confetti visual */}
          <View style={styles.confetti}>
            {['💜', '💗', '✨', '⭐', '💫', '🌟'].map((e, i) => (
              <Text key={i} style={[styles.emoji, { top: Math.random() * 80, left: `${i * 16}%` }]}>{e}</Text>
            ))}
          </View>

          <Text style={styles.titulo}>¡ES UN MATCH!</Text>
          <Text style={styles.subtitulo}>
            Tú y {perfil?.nombre} se gustaron mutuamente ✦
          </Text>

          {/* Fotos del match */}
          <View style={styles.fotosContenedor}>
            <View style={styles.fotoWrapper}>
              <View style={[styles.foto, styles.fotoFallback]}>
                <Text style={{ fontSize: 36 }}>👤</Text>
              </View>
              <Text style={styles.fotoLabel}>Tú</Text>
            </View>

            <View style={styles.corazon}>
              <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.corazonGradiente}>
                <Text style={{ fontSize: 28 }}>♥</Text>
              </LinearGradient>
            </View>

            <View style={styles.fotoWrapper}>
              {foto
                ? <Image source={{ uri: foto }} style={styles.foto} contentFit="cover" />
                : <View style={[styles.foto, styles.fotoFallback]}><Text style={{ fontSize: 36 }}>👤</Text></View>
              }
              <Text style={styles.fotoLabel}>{perfil?.nombre}</Text>
            </View>
          </View>

          {/* Score */}
          <View style={styles.scoreContenedor}>
            <Text style={styles.scoreTexto}>
              Compatibilidad: {nuevoMatch.compatibilidad?.score || 0}%
            </Text>
          </View>

          {/* Rompehielo */}
          {nuevoMatch.mensaje_rompehielo && (
            <View style={styles.rompehieloContenedor}>
              <Text style={styles.rompehieloLabel}>💡 Rompehielo sugerido</Text>
              <Text style={styles.rompehieloPregunta}>
                {nuevoMatch.mensaje_rompehielo.pregunta}
              </Text>
            </View>
          )}

          {/* Botones */}
          <TouchableOpacity onPress={irAlChat} style={{ width: '100%' }}>
            <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnChat}>
              <Text style={styles.btnChatTexto}>💬 Enviar mensaje</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={limpiarNuevoMatch} style={styles.btnDespues}>
            <Text style={styles.btnDespuesTexto}>Ahora no</Text>
          </TouchableOpacity>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: 24
  },
  contenido: {
    backgroundColor: '#1a0533', borderRadius: 28, padding: 28,
    alignItems: 'center', width: '100%', gap: 16,
    borderWidth: 1, borderColor: 'rgba(196,77,255,0.3)', overflow: 'hidden'
  },
  confetti: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  emoji: { position: 'absolute', fontSize: 18 },
  titulo: {
    fontSize: 30, fontWeight: '800', color: '#fff',
    letterSpacing: 2, marginTop: 20
  },
  subtitulo: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  fotosContenedor: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 8 },
  fotoWrapper: { alignItems: 'center', gap: 8 },
  foto: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#C44DFF' },
  fotoFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d1b45' },
  fotoLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  corazon: { marginBottom: 20 },
  corazonGradiente: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  scoreContenedor: {
    backgroundColor: 'rgba(196,77,255,0.15)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 6
  },
  scoreTexto: { color: '#C44DFF', fontSize: 14, fontWeight: '600' },
  rompehieloContenedor: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: 14, width: '100%', gap: 6
  },
  rompehieloLabel: { color: '#C44DFF', fontSize: 12, fontWeight: '600' },
  rompehieloPregunta: { color: '#fff', fontSize: 15 },
  btnChat: { borderRadius: 16, height: 52, justifyContent: 'center', alignItems: 'center', width: '100%' },
  btnChatTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnDespues: { paddingVertical: 8 },
  btnDespuesTexto: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});
