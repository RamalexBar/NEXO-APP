// ================================================
// NEXO - Pantalla de Chat en tiempo real
// Archivo: frontend/src/screens/ChatScreen.js
// ================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { getSocket } from '../services/socketService';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORES = {
  fondo: '#0f0f1a',
  burbujaMia: '#C44DFF',
  burbujaOtro: 'rgba(255,255,255,0.1)',
  texto: '#FFFFFF',
  textoMuted: 'rgba(255,255,255,0.5)',
  input: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.1)',
};

export default function ChatScreen({ route, navigation }) {
  const { match } = route.params;
  const { user, mensajesActuales, setMensajesMatch, agregarMensaje } = useStore();
  const [mensajeTexto, setMensajeTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [otroEscribiendo, setOtroEscribiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const flatListRef = useRef(null);
  const escribiendoTimeout = useRef(null);
  const insets = useSafeAreaInsets();
  const socket = getSocket();

  const mensajes = mensajesActuales[match.match_id] || [];
  const otroUsuario = match.usuario;

  useEffect(() => {
    // Entrar a la sala del chat
    socket.emit('unirse_chat', { match_id: match.match_id });

    // Escuchar historial de mensajes al unirse
    socket.on('historial_mensajes', ({ mensajes: hist }) => {
      setMensajesMatch(match.match_id, hist);
      setCargando(false);
    });

    // Escuchar nuevos mensajes en tiempo real
    socket.on('nuevo_mensaje', (mensaje) => {
      agregarMensaje(match.match_id, mensaje);
      // Auto-scroll al final
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    // Indicador "está escribiendo..."
    socket.on('usuario_escribiendo', ({ user_id }) => {
      if (user_id !== user.id) setOtroEscribiendo(true);
    });

    socket.on('usuario_dejo_escribir', () => {
      setOtroEscribiendo(false);
    });

    return () => {
      socket.off('historial_mensajes');
      socket.off('nuevo_mensaje');
      socket.off('usuario_escribiendo');
      socket.off('usuario_dejo_escribir');
    };
  }, [match.match_id]);

  const alEscribir = (texto) => {
    setMensajeTexto(texto);

    // Emitir "está escribiendo"
    socket.emit('escribiendo', { match_id: match.match_id });

    // Parar indicador después de 2 segundos de inactividad
    clearTimeout(escribiendoTimeout.current);
    escribiendoTimeout.current = setTimeout(() => {
      socket.emit('dejo_de_escribir', { match_id: match.match_id });
    }, 2000);
  };

  const enviarMensaje = useCallback(async () => {
    if (!mensajeTexto.trim() || enviando) return;

    const texto = mensajeTexto.trim();
    setMensajeTexto('');
    setEnviando(true);

    // Emitir via socket (el servidor guarda y reenvía)
    socket.emit('enviar_mensaje', {
      match_id: match.match_id,
      contenido: texto,
      tipo: 'texto'
    });

    socket.emit('dejo_de_escribir', { match_id: match.match_id });
    setEnviando(false);
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [mensajeTexto, enviando, match.match_id]);

  const renderMensaje = ({ item, index }) => {
    const esMio = item.sender_id === user.id;
    const mensajeAnterior = index > 0 ? mensajes[index - 1] : null;
    const mismoRemitente = mensajeAnterior?.sender_id === item.sender_id;

    return (
      <View style={[
        styles.contenedorBurbuja,
        esMio ? styles.burbujaDerechaContenedor : styles.burbujaIzquierdaContenedor,
        !mismoRemitente && styles.margenExtraBurbuja
      ]}>
        {/* Avatar del otro usuario (solo en primer mensaje del grupo) */}
        {!esMio && !mismoRemitente && (
          <View style={styles.avatarPequeno}>
            {otroUsuario.profiles?.fotos?.[0] ? (
              <Image source={{ uri: otroUsuario.profiles.fotos[0] }} style={styles.imgAvatarPequeno} />
            ) : (
              <Text style={{ fontSize: 16 }}>👤</Text>
            )}
          </View>
        )}
        {!esMio && mismoRemitente && <View style={{ width: 32 }} />}

        {/* Burbuja de mensaje */}
        <View style={[
          styles.burbuja,
          esMio ? styles.burbujaMia : styles.burbujaOtro,
        ]}>
          <Text style={[styles.textoBurbuja, !esMio && styles.textoBurbujaOtro]}>
            {item.contenido}
          </Text>
          <Text style={styles.horaTexto}>
            {formatDistanceToNow(new Date(item.sent_at), { locale: es, addSuffix: false })}
            {esMio && (
              <Text> {item.leido ? ' ✓✓' : ' ✓'}</Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  const reportarUsuario = () => {
    const { Alert } = require('react-native');
    Alert.alert(
      'Opciones',
      '',
      [
        { text: 'Reportar usuario', style: 'destructive', onPress: () =>
          Alert.alert('¿Por qué reportas?', '', [
            { text: 'Spam', onPress: () => api.post('/reports/reportar', { to_user_id: otroUsuario.id, motivo: 'spam' }).then(() => Alert.alert('Reporte enviado')).catch(()=>{}) },
            { text: 'Acoso', onPress: () => api.post('/reports/reportar', { to_user_id: otroUsuario.id, motivo: 'acoso' }).then(() => Alert.alert('Reporte enviado')).catch(()=>{}) },
            { text: 'Contenido inapropiado', onPress: () => api.post('/reports/reportar', { to_user_id: otroUsuario.id, motivo: 'contenido_inapropiado' }).then(() => Alert.alert('Reporte enviado')).catch(()=>{}) },
            { text: 'Cancelar', style: 'cancel' },
          ])
        },
        { text: 'Bloquear usuario', style: 'destructive', onPress: () =>
          Alert.alert('¿Bloquear?', 'Ya no verás a esta persona.', [
            { text: 'Bloquear', style: 'destructive', onPress: () =>
              api.post('/reports/bloquear', { to_user_id: otroUsuario.id })
                .then(() => { Alert.alert('Usuario bloqueado'); navigation.goBack(); })
                .catch(()=>{})
            },
            { text: 'Cancelar', style: 'cancel' },
          ])
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const renderRompehielo = () => {
    if (mensajes.length > 0) return null;
    const rompehielos = [
      { pregunta: '¿Café o cerveza?', opciones: ['☕ Café', '🍺 Cerveza'] },
      { pregunta: '¿Playa o montaña?', opciones: ['🏖 Playa', '🏔 Montaña'] },
    ];
    const aleatorio = rompehielos[Math.floor(Math.random() * rompehielos.length)];

    return (
      <View style={styles.rompehieloContenedor}>
        <Text style={styles.rompehielo}>💡 Rompehielo</Text>
        <Text style={styles.rompehieloPregunta}>{aleatorio.pregunta}</Text>
        <View style={styles.rompehieloOpciones}>
          {aleatorio.opciones.map((op, i) => (
            <TouchableOpacity
              key={i}
              style={styles.rompehieloBoton}
              onPress={() => { setMensajeTexto(op); }}
            >
              <Text style={styles.rompehieloTexto}>{op}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUsuario}
          onPress={() => navigation.navigate('VerPerfil', { userId: otroUsuario.id })}
        >
          <View style={styles.avatarHeader}>
            {otroUsuario.profiles?.fotos?.[0] ? (
              <Image source={{ uri: otroUsuario.profiles.fotos[0] }} style={styles.imgAvatarHeader} />
            ) : (
              <Text style={{ fontSize: 22 }}>👤</Text>
            )}
            <View style={[
              styles.puntitOnline,
              { backgroundColor: otroUsuario.is_online ? '#4ade80' : '#888' }
            ]} />
          </View>
          <View>
            <Text style={styles.nombreHeader}>{otroUsuario.nombre}</Text>
            <Text style={styles.estadoHeader}>
              {otroUsuario.is_online ? '● En línea' : 'Última vez hace poco'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.compatibilidadBadge}>
            <Text style={styles.textoCompat}>{match.score}%</Text>
          </View>
          {/* Videollamada premium */}
          <TouchableOpacity
            style={styles.btnVideocall}
            onPress={() => navigation.navigate('Videollamada', { match })}
          >
            <Ionicons name="videocam" size={20} color="#C44DFF" />
          </TouchableOpacity>
          {/* Reportar/bloquear */}
          <TouchableOpacity
            style={styles.btnReporte}
            onPress={() => reportarUsuario()}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mensajes */}
      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#C44DFF" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={(item) => item.id}
          renderItem={renderMensaje}
          contentContainerStyle={styles.listaMensajes}
          ListHeaderComponent={renderRompehielo}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Indicador "está escribiendo..." */}
      {otroEscribiendo && (
        <View style={styles.escribiendoContenedor}>
          <Text style={styles.escribiendoTexto}>{otroUsuario.nombre} está escribiendo...</Text>
        </View>
      )}

      {/* Input de mensaje */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputContenedor, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            value={mensajeTexto}
            onChangeText={alEscribir}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORES.textoMuted}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={enviarMensaje}
          />
          <TouchableOpacity
            onPress={enviarMensaje}
            disabled={!mensajeTexto.trim() || enviando}
          >
            <LinearGradient
              colors={mensajeTexto.trim() ? ['#FF6B9D', '#C44DFF'] : ['#333', '#333']}
              style={styles.btnEnviar}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 0.5, borderBottomColor: COLORES.border, gap: 12
  },
  btnVolver: { padding: 4 },
  btnVideocall: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(196,77,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  btnReporte: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerUsuario: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarHeader: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
    backgroundColor: '#2d1b45', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  imgAvatarHeader: { width: '100%', height: '100%' },
  puntitOnline: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10,
    borderRadius: 5, borderWidth: 1.5, borderColor: COLORES.fondo },
  nombreHeader: { fontSize: 16, fontWeight: '600', color: '#fff' },
  estadoHeader: { fontSize: 12, color: COLORES.textoMuted },
  compatibilidadBadge: { backgroundColor: 'rgba(196,77,255,0.2)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4 },
  textoCompat: { color: '#C44DFF', fontSize: 12, fontWeight: '600' },
  listaMensajes: { padding: 16, gap: 4 },
  contenedorBurbuja: { flexDirection: 'row', marginVertical: 2 },
  burbujaDerechaContenedor: { justifyContent: 'flex-end' },
  burbujaIzquierdaContenedor: { justifyContent: 'flex-start' },
  margenExtraBurbuja: { marginTop: 10 },
  avatarPequeno: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#2d1b45', justifyContent: 'center', alignItems: 'center',
    marginRight: 8, alignSelf: 'flex-end' },
  imgAvatarPequeno: { width: '100%', height: '100%' },
  burbuja: { maxWidth: '75%', borderRadius: 18, padding: 12 },
  burbujaMia: { backgroundColor: COLORES.burbujaMia, borderBottomRightRadius: 4 },
  burbujaOtro: { backgroundColor: COLORES.burbujaOtro, borderBottomLeftRadius: 4 },
  textoBurbuja: { fontSize: 15, color: '#fff', lineHeight: 21 },
  textoBurbujaOtro: { color: '#fff' },
  horaTexto: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'right' },
  rompehieloContenedor: {
    margin: 16, backgroundColor: 'rgba(196,77,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(196,77,255,0.3)',
    borderRadius: 16, padding: 16
  },
  rompehielo: { color: '#C44DFF', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  rompehieloPregunta: { color: '#fff', fontSize: 16, fontWeight: '500', marginBottom: 12 },
  rompehieloOpciones: { flexDirection: 'row', gap: 10 },
  rompehieloBoton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 10, alignItems: 'center' },
  rompehieloTexto: { color: '#fff', fontSize: 14 },
  escribiendoContenedor: { paddingHorizontal: 20, paddingVertical: 6 },
  escribiendoTexto: { color: COLORES.textoMuted, fontSize: 12, fontStyle: 'italic' },
  inputContenedor: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, borderTopWidth: 0.5, borderTopColor: COLORES.border
  },
  input: {
    flex: 1, backgroundColor: COLORES.input, borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 120,
    borderWidth: 0.5, borderColor: COLORES.border
  },
  btnEnviar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
});
