// ================================================
// NEXO — Mejora 6: Pantalla de Eventos Cercanos
// Archivo: frontend/src/screens/EventsScreen.js
// ================================================

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { eventsAPI } from '../services/api';
import useStore from '../store/useStore';

const TIPOS = ['☕ Café', '🍽 Cena', '🏃 Deporte', '🎬 Cine', '🎵 Música', '🎲 Social'];

export default function EventsScreen({ navigation }) {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const { user } = useStore();
  const insets = useSafeAreaInsets();

  // Form de crear evento
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [fecha, setFecha] = useState('');
  const [maxPersonas, setMaxPersonas] = useState('10');
  const [descripcion, setDescripcion] = useState('');

  const cargar = async () => {
    try {
      const { data } = await eventsAPI.getCercanos(100);
      setEventos(data.eventos || []);
    } catch (e) { console.error(e); }
    finally { setCargando(false); setRefrescando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const crearEvento = async () => {
    if (!titulo.trim() || !fecha.trim()) {
      Alert.alert('Campos requeridos', 'Título y fecha son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      await eventsAPI.crearEvento({ titulo, tipo, ciudad, fecha_evento: fecha, max_personas: maxPersonas, descripcion });
      setModalCrear(false);
      setTitulo(''); setTipo(''); setCiudad(''); setFecha(''); setDescripcion('');
      cargar();
      Alert.alert('✅ Evento creado', '¡Tu evento ya es visible para personas cercanas!');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Error al crear evento.');
    } finally { setGuardando(false); }
  };

  const unirse = async (eventId, titulo) => {
    try {
      await eventsAPI.unirse(eventId);
      Alert.alert('📩 Solicitud enviada', `Esperando que el organizador de "${titulo}" te acepte.`);
      cargar();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'No se pudo unir.');
    }
  };

  const renderEvento = ({ item }) => {
    const fechaFormato = item.fecha_evento
      ? format(new Date(item.fecha_evento), "EEEE d 'de' MMMM · HH:mm", { locale: es })
      : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.tipoTag}>
            <Text style={styles.tipoTexto}>{item.tipo || '✨ Evento'}</Text>
          </View>
          {item.distancia_km && (
            <Text style={styles.distancia}>📍 {item.distancia_km} km</Text>
          )}
        </View>

        <Text style={styles.cardTitulo}>{item.titulo}</Text>
        <Text style={styles.cardFecha}>{fechaFormato}</Text>
        {item.ciudad && <Text style={styles.cardCiudad}>📍 {item.ciudad}</Text>}
        {item.descripcion && (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion}</Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.participantesInfo}>
            <Text style={styles.participantesTexto}>
              👥 {item.participantes}/{item.max_personas} personas
            </Text>
            {item.lleno && (
              <View style={styles.llenoTag}>
                <Text style={styles.llenoTexto}>Lleno</Text>
              </View>
            )}
          </View>

          {!item.yo_participo && !item.lleno ? (
            <TouchableOpacity onPress={() => unirse(item.id, item.titulo)}>
              <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnUnirse}>
                <Text style={styles.btnUnirseTexto}>Unirme</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : item.yo_participo ? (
            <View style={styles.yaUniTag}>
              <Text style={styles.yaUniTexto}>✓ Unido</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.titulo}>👥 Eventos cercanos</Text>
          <Text style={styles.subtitulo}>{eventos.length} eventos en tu zona</Text>
        </View>
        <TouchableOpacity onPress={() => setModalCrear(true)}>
          <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnCrear}>
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.centrado}><ActivityIndicator size="large" color="#C44DFF" /></View>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={i => i.id}
          renderItem={renderEvento}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor="#C44DFF" />}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={{ fontSize: 48 }}>🗓</Text>
              <Text style={styles.vacioTexto}>No hay eventos cerca</Text>
              <Text style={styles.muted}>¡Sé el primero en crear uno!</Text>
            </View>
          }
        />
      )}

      {/* Modal Crear Evento */}
      <Modal visible={modalCrear} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Crear evento</Text>
              <TouchableOpacity onPress={() => setModalCrear(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <TextInput style={styles.input} placeholder="Título del evento *" placeholderTextColor="rgba(255,255,255,0.35)" value={titulo} onChangeText={setTitulo} />
              <TextInput style={styles.input} placeholder="Ciudad *" placeholderTextColor="rgba(255,255,255,0.35)" value={ciudad} onChangeText={setCiudad} />
              <TextInput style={styles.input} placeholder="Fecha y hora (AAAA-MM-DD HH:MM) *" placeholderTextColor="rgba(255,255,255,0.35)" value={fecha} onChangeText={setFecha} />
              <TextInput style={styles.input} placeholder="Máx. personas (1-20)" placeholderTextColor="rgba(255,255,255,0.35)" value={maxPersonas} onChangeText={setMaxPersonas} keyboardType="number-pad" />
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Descripción (opcional)" placeholderTextColor="rgba(255,255,255,0.35)" value={descripcion} onChangeText={setDescripcion} multiline />

              <Text style={styles.etiqueta}>Tipo de evento</Text>
              <View style={styles.tipoGrid}>
                {TIPOS.map(t => (
                  <TouchableOpacity key={t} style={[styles.tipoOpcion, tipo === t && styles.tipoOpcionActiva]} onPress={() => setTipo(t)}>
                    <Text style={[styles.tipoOpcionTexto, tipo === t && styles.tipoOpcionTextoActivo]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity onPress={crearEvento} disabled={guardando} style={{ marginTop: 16 }}>
              <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnGuardar}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarTexto}>Crear evento</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#0f0f1a' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitulo: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 },
  btnCrear: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipoTag: { backgroundColor: 'rgba(196,77,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tipoTexto: { color: '#C44DFF', fontSize: 12 },
  distancia: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  cardTitulo: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cardFecha: { fontSize: 13, color: '#FF6B9D' },
  cardCiudad: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  participantesInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  participantesTexto: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  llenoTag: { backgroundColor: 'rgba(255,100,100,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  llenoTexto: { color: '#ff6464', fontSize: 11 },
  btnUnirse: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  btnUnirseTexto: { color: '#fff', fontWeight: '600', fontSize: 13 },
  yaUniTag: { backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  yaUniTexto: { color: '#4ade80', fontSize: 13 },
  vacio: { padding: 60, alignItems: 'center', gap: 10 },
  vacioTexto: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center' },
  muted: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 18, fontWeight: '600', color: '#fff' },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, marginBottom: 10 },
  etiqueta: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 },
  tipoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tipoOpcion: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' },
  tipoOpcionActiva: { borderColor: '#C44DFF', backgroundColor: 'rgba(196,77,255,0.2)' },
  tipoOpcionTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  tipoOpcionTextoActivo: { color: '#C44DFF' },
  btnGuardar: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnGuardarTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
