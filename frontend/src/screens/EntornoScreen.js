// ================================================
// NEXO - Pantalla Entorno (personas cercanas)
// Archivo: frontend/src/screens/EntornoScreen.js
// ================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { entornoAPI } from '../services/api';

const RADIO_KM = 150;

export default function EntornoScreen({ navigation }) {
  const { user, usuariosCercanos, setUsuariosCercanos } = useStore();
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [vista, setVista] = useState('lista'); // 'mapa' | 'lista'
  const [radio, setRadio] = useState(150);
  const [modalMensaje, setModalMensaje] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [textomensaje, setTextoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => { obtenerUbicacionYCeranos(); }, []);

  const obtenerUbicacionYCeranos = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Activa la ubicación para usar Entorno.');
        setCargando(false);
        return;
      }

      const ubicacion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = ubicacion.coords;
      setMiUbicacion({ latitude, longitude });

      // Actualizar ubicación en el servidor
      await entornoAPI.actualizarUbicacion(latitude, longitude);

      // Cargar personas cercanas
      const { data } = await entornoAPI.getCercanos(radio);
      setUsuariosCercanos(data.usuarios || []);

    } catch (error) {
      console.error('Error ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  const onRefrescar = () => { setRefrescando(true); obtenerUbicacionYCeranos(); };

  const abrirModalMensaje = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setTextoMensaje('');
    setModalMensaje(true);
  };

  const enviarMensajeInicial = async () => {
    if (!textomensaje.trim()) return;
    setEnviando(true);
    try {
      await entornoAPI.enviarMensajeInicial(usuarioSeleccionado.user_id, textomensaje.trim());
      setModalMensaje(false);
      Alert.alert(
        '📩 Mensaje enviado',
        `Si ${usuarioSeleccionado.nombre} responde, se abrirá la conversación completa.`
      );
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al enviar.';
      Alert.alert('Error', msg);
    } finally {
      setEnviando(false);
    }
  };

  const renderUsuario = ({ item }) => (
    <TouchableOpacity
      style={styles.cardUsuario}
      onPress={() => navigation.navigate('VerPerfil', { userId: item.user_id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardFotoContenedor}>
        {item.fotos?.[0]
          ? <Image source={{ uri: item.fotos[0] }} style={styles.cardFoto} contentFit="cover" />
          : <View style={[styles.cardFoto, styles.fotoFallback]}><Text style={{ fontSize: 30 }}>👤</Text></View>
        }
        {item.is_online && <View style={styles.puntitOnline} />}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardNombre}>{item.nombre}, {item.edad}</Text>
        <Text style={styles.cardDistancia}>📍 {item.distancia_km} km</Text>
        {item.bio ? (
          <Text style={styles.cardBio} numberOfLines={2}>{item.bio}</Text>
        ) : null}
        <Text style={styles.cardActividad}>
          {item.is_online ? '● En línea ahora' : 'Activo recientemente'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.btnMensaje}
        onPress={() => abrirModalMensaje(item)}
      >
        <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnMensajeGradiente}>
          <Ionicons name="chatbubble-outline" size={16} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (cargando) {
    return (
      <View style={[styles.fondo, styles.centrado]}>
        <ActivityIndicator size="large" color="#C44DFF" />
        <Text style={styles.textoMuted}>Buscando personas cerca...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.titulo}>🌐 Entorno</Text>
          <Text style={styles.subtitulo}>{usuariosCercanos.length} personas en {radio} km</Text>
        </View>
        <View style={styles.headerAcciones}>
          {/* Selector radio */}
          <View style={styles.radioSelector}>
            {[50, 100, 150].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radioBton, radio === r && styles.radioBtnActivo]}
                onPress={() => { setRadio(r); onRefrescar(); }}
              >
                <Text style={[styles.radioBtnTexto, radio === r && styles.radioBtnTextoActivo]}>{r}km</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Toggle mapa/lista */}
          <TouchableOpacity
            style={styles.btnVista}
            onPress={() => setVista(v => v === 'lista' ? 'mapa' : 'lista')}
          >
            <Ionicons name={vista === 'lista' ? 'map-outline' : 'list-outline'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Vista mapa */}
      {vista === 'mapa' && miUbicacion && (
        <MapView
          style={styles.mapa}
          initialRegion={{
            ...miUbicacion,
            latitudeDelta: 1.5,
            longitudeDelta: 1.5,
          }}
          customMapStyle={mapaOscuro}
        >
          {/* Mi posición */}
          <Marker coordinate={miUbicacion} title="Tú">
            <View style={styles.markerYo}>
              <Text style={{ fontSize: 18 }}>📍</Text>
            </View>
          </Marker>

          {/* Círculo de radio */}
          <Circle
            center={miUbicacion}
            radius={radio * 1000}
            strokeColor="rgba(196,77,255,0.4)"
            fillColor="rgba(196,77,255,0.05)"
          />

          {/* Marcadores de usuarios */}
          {usuariosCercanos.map(u => (
            <Marker
              key={u.user_id}
              coordinate={{
                latitude: miUbicacion.latitude + (Math.random() - 0.5) * (radio / 55),
                longitude: miUbicacion.longitude + (Math.random() - 0.5) * (radio / 55),
              }}
              title={u.nombre}
              onCalloutPress={() => navigation.navigate('VerPerfil', { userId: u.user_id })}
            >
              <View style={styles.markerUsuario}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Vista lista */}
      {vista === 'lista' && (
        <FlatList
          data={usuariosCercanos}
          keyExtractor={i => i.user_id}
          renderItem={renderUsuario}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor="#C44DFF" />}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={{ fontSize: 50 }}>🗺️</Text>
              <Text style={styles.vacioTexto}>Nadie en {radio} km</Text>
              <Text style={styles.textoMuted}>Amplía el radio o vuelve más tarde</Text>
            </View>
          }
        />
      )}

      {/* Modal enviar mensaje inicial */}
      <Modal visible={modalMensaje} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                📩 Mensaje a {usuarioSeleccionado?.nombre}
              </Text>
              <TouchableOpacity onPress={() => setModalMensaje(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalInfo}>
              Solo puedes enviar 1 mensaje sin match. Si responde, se abre la conversación completa.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Escribe tu mensaje (máx. 200 caracteres)..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={textomensaje}
              onChangeText={setTextoMensaje}
              multiline
              maxLength={200}
              autoFocus
            />
            <Text style={styles.contador}>{textomensaje.length}/200</Text>
            <TouchableOpacity onPress={enviarMensajeInicial} disabled={enviando || !textomensaje.trim()}>
              <LinearGradient
                colors={textomensaje.trim() ? ['#FF6B9D', '#C44DFF'] : ['#333', '#333']}
                style={styles.btnEnviarModal}
              >
                {enviando
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnEnviarTexto}>Enviar mensaje</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const mapaOscuro = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f0f1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d4a' }] },
];

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#0f0f1a' },
  centrado: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  titulo: { fontSize: 20, fontWeight: '700', color: '#fff' },
  subtitulo: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 },
  headerAcciones: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  radioSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' },
  radioBton: { paddingHorizontal: 10, paddingVertical: 6 },
  radioBtnActivo: { backgroundColor: 'rgba(196,77,255,0.4)' },
  radioBtnTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  radioBtnTextoActivo: { color: '#C44DFF', fontWeight: '600' },
  btnVista: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  mapa: { flex: 1 },
  markerYo: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(196,77,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#C44DFF' },
  markerUsuario: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,107,157,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FF6B9D' },
  cardUsuario: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  cardFotoContenedor: { position: 'relative' },
  cardFoto: { width: 64, height: 80, borderRadius: 12 },
  fotoFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d1b45' },
  puntitOnline: { position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80', borderWidth: 1.5, borderColor: '#0f0f1a' },
  cardInfo: { flex: 1, gap: 4 },
  cardNombre: { fontSize: 15, fontWeight: '600', color: '#fff' },
  cardDistancia: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  cardBio: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  cardActividad: { fontSize: 11, color: '#4ade80' },
  btnMensaje: { justifyContent: 'center' },
  btnMensajeGradiente: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  vacio: { padding: 40, alignItems: 'center', gap: 10 },
  vacioTexto: { color: '#fff', fontSize: 18, fontWeight: '600' },
  textoMuted: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo: { fontSize: 17, fontWeight: '600', color: '#fff' },
  modalInfo: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, height: 100, textAlignVertical: 'top', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
  contador: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'right' },
  btnEnviarModal: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnEnviarTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
