// ================================================
// NEXO — Mejora 1: Pantalla de Verificación de Perfil
// Archivo: frontend/src/screens/VerificationScreen.js
// ================================================

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verificationAPI } from '../services/api';
import useStore from '../store/useStore';

export default function VerificationScreen({ navigation }) {
  const [permiso, setPermiso] = useState(null);
  const [capturando, setCapturando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const cameraRef = useRef(null);
  const { user, actualizarUsuario } = useStore();
  const insets = useSafeAreaInsets();

  const solicitarPermiso = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setPermiso(status === 'granted');
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para verificar tu identidad.');
    }
  };

  const tomarSelfie = async () => {
    if (!cameraRef.current) return;
    try {
      setCapturando(true);
      const foto = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: Platform.OS === 'android',
      });
      await enviarVerificacion(foto.uri);
    } catch (e) {
      Alert.alert('Error', 'No se pudo tomar la foto. Intenta de nuevo.');
    } finally {
      setCapturando(false);
    }
  };

  const enviarVerificacion = async (uri) => {
    setProcesando(true);
    try {
      const formData = new FormData();
      formData.append('selfie', { uri, type: 'image/jpeg', name: 'selfie.jpg' });
      const { data } = await verificationAPI.enviarSelfie(formData);
      setResultado(data);
      if (data.aprobado) {
        actualizarUsuario({ is_verified: true });
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Error al verificar.');
    } finally {
      setProcesando(false);
    }
  };

  // Pantalla de resultado
  if (resultado) {
    return (
      <View style={[styles.fondo, styles.centrado, { paddingTop: insets.top }]}>
        <View style={styles.resultadoCard}>
          <Text style={{ fontSize: 64 }}>{resultado.aprobado ? '✅' : '❌'}</Text>
          <Text style={styles.resultadoTitulo}>
            {resultado.aprobado ? '¡Verificado!' : 'No verificado'}
          </Text>
          <Text style={styles.resultadoTexto}>{resultado.mensaje}</Text>
          {resultado.aprobado && (
            <View style={styles.selloBadge}>
              <Text style={styles.selloTexto}>✓ Perfil verificado — confianza del {resultado.confianza}%</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.btnVolver}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnVolverTexto}>
              {resultado.aprobado ? 'Ir a mi perfil' : 'Intentar de nuevo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Si ya está verificado
  if (user?.is_verified) {
    return (
      <View style={[styles.fondo, styles.centrado, { paddingTop: insets.top }]}>
        <Text style={{ fontSize: 64 }}>✅</Text>
        <Text style={styles.tituloGrande}>Ya estás verificado</Text>
        <Text style={styles.muted}>Tu perfil tiene el sello de confianza azul</Text>
        <TouchableOpacity style={styles.btnSecundario} onPress={() => navigation.goBack()}>
          <Text style={styles.btnSecundarioTexto}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Verificar identidad</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.contenido}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitulo}>¿Cómo funciona?</Text>
          <Text style={styles.infoTexto}>
            Toma una selfie en vivo. La comparamos con tu foto de perfil
            para confirmar que eres una persona real. El proceso dura menos de 5 segundos.
          </Text>
          <View style={styles.beneficiosFila}>
            {['Sello azul en tu perfil', 'Más matches y likes', 'Mayor confianza'].map((b, i) => (
              <View key={i} style={styles.beneficioTag}>
                <Text style={styles.beneficioTexto}>✓ {b}</Text>
              </View>
            ))}
          </View>
        </View>

        {permiso === null && (
          <TouchableOpacity onPress={solicitarPermiso}>
            <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnPrincipal}>
              <Ionicons name="camera-outline" size={22} color="#fff" />
              <Text style={styles.btnTexto}>Activar cámara</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {permiso === false && (
          <Text style={[styles.muted, { textAlign: 'center', padding: 20 }]}>
            Permiso de cámara denegado. Ve a Configuración del teléfono para activarlo.
          </Text>
        )}

        {permiso === true && !procesando && (
          <View style={styles.cameraContenedor}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              type={Camera.Constants.Type.front}
              ratio="1:1"
            />
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraMarco} />
            </View>
            <TouchableOpacity onPress={tomarSelfie} disabled={capturando}>
              <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnCapturar}>
                {capturando
                  ? <ActivityIndicator color="#fff" />
                  : <Ionicons name="camera" size={28} color="#fff" />
                }
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.instruccion}>
              Centra tu cara en el círculo y toca el botón
            </Text>
          </View>
        )}

        {procesando && (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color="#C44DFF" />
            <Text style={[styles.muted, { marginTop: 12 }]}>Verificando tu identidad...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#0f0f1a' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitulo: { fontSize: 17, fontWeight: '600', color: '#fff' },
  contenido: { flex: 1, padding: 20, gap: 20 },
  infoCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, gap: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  infoTitulo: { fontSize: 16, fontWeight: '600', color: '#fff' },
  infoTexto: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
  beneficiosFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  beneficioTag: { backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  beneficioTexto: { color: '#4ade80', fontSize: 12 },
  btnPrincipal: { borderRadius: 14, height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cameraContenedor: { gap: 16, alignItems: 'center' },
  camera: { width: 260, height: 260, borderRadius: 130, overflow: 'hidden' },
  cameraOverlay: { position: 'absolute', top: 0, width: 260, height: 260, borderRadius: 130, borderWidth: 3, borderColor: '#C44DFF' },
  cameraMarco: { flex: 1 },
  btnCapturar: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center' },
  instruccion: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },
  resultadoCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 32, alignItems: 'center', gap: 14, width: '100%' },
  resultadoTitulo: { fontSize: 26, fontWeight: '700', color: '#fff' },
  resultadoTexto: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  selloBadge: { backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  selloTexto: { color: '#4ade80', fontSize: 13 },
  btnVolver: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  btnVolverTexto: { color: '#fff', fontSize: 15, fontWeight: '500' },
  tituloGrande: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  muted: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  btnSecundario: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  btnSecundarioTexto: { color: '#fff', fontSize: 15 },
});
