// ================================================
// NEXO - Pantalla de Registro (3 pasos)
// Archivo: frontend/src/screens/RegisterScreen.js
// ================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Platform,
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { profileAPI } from '../services/api';

const INTERESES_LISTA = [
  '🎵 Música', '📚 Lectura', '🏋️ Gym', '🎮 Videojuegos',
  '🍕 Gastronomía', '✈️ Viajes', '🎨 Arte', '🐶 Mascotas',
  '🏔 Montaña', '🏖 Playa', '☕ Café', '🍺 Cervezas',
  '💃 Bailar', '🎬 Cine', '📸 Fotografía', '🌿 Naturaleza',
  '🏃 Correr', '🚴 Ciclismo', '🧘 Yoga', '🎭 Teatro',
];

export default function RegisterScreen({ navigation }) {
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const { register } = useStore();
  const insets = useSafeAreaInsets();

  // Paso 1: Datos básicos
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [genero, setGenero] = useState('');

  // Paso 2: Fotos e intereses
  const [fotos, setFotos] = useState([]);
  const [interesesSeleccionados, setInteresesSeleccionados] = useState([]);
  const [bio, setBio] = useState('');

  // Paso 3: Tipo de relación
  const [buscaRelacion, setBuscaRelacion] = useState('');
  const [buscaGenero, setBuscaGenero] = useState('todos');

  const seleccionarFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!resultado.canceled && fotos.length < 6) {
      setFotos([...fotos, resultado.assets[0].uri]);
    }
  };

  const toggleInteres = (interes) => {
    if (interesesSeleccionados.includes(interes)) {
      setInteresesSeleccionados(interesesSeleccionados.filter(i => i !== interes));
    } else if (interesesSeleccionados.length < 8) {
      setInteresesSeleccionados([...interesesSeleccionados, interes]);
    }
  };

  const validarPaso1 = () => {
    if (!nombre.trim()) return 'Ingresa tu nombre.';
    if (!email.includes('@')) return 'Correo inválido.';
    if (password.length < 6) return 'Contraseña mínimo 6 caracteres.';
    if (!fechaNacimiento.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Fecha formato AAAA-MM-DD.';
    if (!genero) return 'Selecciona tu género.';
    return null;
  };

  const siguientePaso = () => {
    if (paso === 1) {
      const error = validarPaso1();
      if (error) { Alert.alert('Error', error); return; }
    }
    if (paso === 2 && fotos.length === 0) {
      Alert.alert('Foto requerida', 'Agrega al menos una foto de perfil.');
      return;
    }
    setPaso(paso + 1);
  };

  const handleRegistro = async () => {
    if (!buscaRelacion) { Alert.alert('Error', 'Selecciona qué tipo de conexión buscas.'); return; }
    try {
      setCargando(true);

      // Registrar usuario
      const datos = {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
        fecha_nacimiento: fechaNacimiento,
        genero,
      };
      const respuesta = await register(datos);

      // Subir fotos y actualizar perfil
      if (fotos.length > 0) {
        for (const fotoUri of fotos) {
          const formData = new FormData();
          formData.append('photo', { uri: fotoUri, type: 'image/jpeg', name: 'foto.jpg' });
          await profileAPI.uploadPhoto(formData);
        }
      }

      // Actualizar perfil con intereses y bio
      await profileAPI.updateProfile({
        bio,
        intereses: interesesSeleccionados,
        busca_genero: buscaGenero,
        tipo_relacion: buscaRelacion,
      });

    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Error al registrarse.');
    } finally {
      setCargando(false);
    }
  };

  // ─── RENDER PASO 1 ───────────────────────────────────
  const renderPaso1 = () => (
    <View style={styles.pasoContenido}>
      <Text style={styles.pasoTitulo}>Datos básicos</Text>
      <Text style={styles.pasoSubtitulo}>Cuéntanos quién eres</Text>

      <Campo icono="person-outline" placeholder="Tu nombre" value={nombre} onChange={setNombre} />
      <Campo icono="mail-outline" placeholder="Correo electrónico" value={email} onChange={setEmail} tipo="email-address" />
      <Campo icono="lock-closed-outline" placeholder="Contraseña (mín. 6 caracteres)" value={password} onChange={setPassword} seguro />
      <Campo icono="calendar-outline" placeholder="Fecha nacimiento (AAAA-MM-DD)" value={fechaNacimiento} onChange={setFechaNacimiento} />

      <Text style={styles.etiqueta}>Género</Text>
      <View style={styles.filaBotones}>
        {['hombre', 'mujer', 'no_binario', 'otro'].map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.btnOpcion, genero === g && styles.btnOpcionActivo]}
            onPress={() => setGenero(g)}
          >
            <Text style={[styles.txtOpcion, genero === g && styles.txtOpcionActivo]}>
              {g === 'hombre' ? '♂ Hombre' : g === 'mujer' ? '♀ Mujer' : g === 'no_binario' ? '⊘ No binario' : '✦ Otro'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ─── RENDER PASO 2 ───────────────────────────────────
  const renderPaso2 = () => (
    <View style={styles.pasoContenido}>
      <Text style={styles.pasoTitulo}>Tus fotos e intereses</Text>
      <Text style={styles.pasoSubtitulo}>Haz que tu perfil destaque</Text>

      {/* Fotos */}
      <Text style={styles.etiqueta}>Fotos (máx. 6)</Text>
      <View style={styles.gridFotos}>
        {Array.from({ length: 6 }).map((_, i) => (
          <TouchableOpacity key={i} style={styles.celdaFoto} onPress={seleccionarFoto}>
            {fotos[i] ? (
              <Image source={{ uri: fotos[i] }} style={styles.foto} contentFit="cover" />
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Ionicons name="add" size={28} color="rgba(255,255,255,0.3)" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Bio */}
      <Text style={styles.etiqueta}>Sobre ti</Text>
      <TextInput
        style={styles.bioInput}
        placeholder="Escribe algo interesante sobre ti..."
        placeholderTextColor="rgba(255,255,255,0.35)"
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={300}
      />
      <Text style={styles.contador}>{bio.length}/300</Text>

      {/* Intereses */}
      <Text style={styles.etiqueta}>Intereses ({interesesSeleccionados.length}/8)</Text>
      <View style={styles.gridIntereses}>
        {INTERESES_LISTA.map(interes => (
          <TouchableOpacity
            key={interes}
            style={[styles.tagInteres, interesesSeleccionados.includes(interes) && styles.tagInteresActivo]}
            onPress={() => toggleInteres(interes)}
          >
            <Text style={[styles.tagTexto, interesesSeleccionados.includes(interes) && styles.tagTextoActivo]}>
              {interes}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ─── RENDER PASO 3 ───────────────────────────────────
  const renderPaso3 = () => (
    <View style={styles.pasoContenido}>
      <Text style={styles.pasoTitulo}>¿Qué buscas?</Text>
      <Text style={styles.pasoSubtitulo}>Sé honesto para mejores conexiones</Text>

      <Text style={styles.etiqueta}>Tipo de conexión</Text>
      <View style={styles.columnaOpciones}>
        {[
          { valor: 'amistad', label: '🤝 Amistad', desc: 'Conocer personas y hacer amigos' },
          { valor: 'citas', label: '💕 Citas', desc: 'Encontrar pareja o citas' },
          { valor: 'relacion', label: '❤️ Relación seria', desc: 'Busco algo estable y duradero' },
          { valor: 'cualquiera', label: '✨ Lo que surja', desc: 'Abierto a cualquier conexión' },
        ].map(op => (
          <TouchableOpacity
            key={op.valor}
            style={[styles.cardOpcion, buscaRelacion === op.valor && styles.cardOpcionActiva]}
            onPress={() => setBuscaRelacion(op.valor)}
          >
            <Text style={styles.cardOpcionLabel}>{op.label}</Text>
            <Text style={styles.cardOpcionDesc}>{op.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.etiqueta, { marginTop: 20 }]}>Me interesan</Text>
      <View style={styles.filaBotones}>
        {['mujeres', 'hombres', 'todos'].map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.btnOpcion, buscaGenero === g && styles.btnOpcionActivo]}
            onPress={() => setBuscaGenero(g)}
          >
            <Text style={[styles.txtOpcion, buscaGenero === g && styles.txtOpcionActivo]}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#0f0f1a', '#1a0533']} style={styles.fondo}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10 }]}>

          {/* Header */}
          <View style={styles.header}>
            {paso > 1 && (
              <TouchableOpacity onPress={() => setPaso(paso - 1)}>
                <Ionicons name="chevron-back" size={26} color="#fff" />
              </TouchableOpacity>
            )}
            <Text style={styles.logoTexto}>✦ NEXO</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Barra de progreso */}
          <View style={styles.barraProgreso}>
            {[1, 2, 3].map(n => (
              <View key={n} style={[styles.segmentoProgreso, n <= paso && styles.segmentoProgresoActivo]} />
            ))}
          </View>
          <Text style={styles.textoProgreso}>Paso {paso} de 3</Text>

          {/* Contenido del paso */}
          {paso === 1 && renderPaso1()}
          {paso === 2 && renderPaso2()}
          {paso === 3 && renderPaso3()}

          {/* Botón siguiente / finalizar */}
          <TouchableOpacity
            onPress={paso < 3 ? siguientePaso : handleRegistro}
            disabled={cargando}
            style={{ marginTop: 24, marginBottom: 40 }}
          >
            <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnSiguiente}>
              {cargando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnSiguienteTexto}>
                    {paso < 3 ? 'Continuar →' : '¡Crear mi cuenta!'}
                  </Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.yaTenga}>
            <Text style={styles.yaTenga}>¿Ya tienes cuenta? <Text style={{ color: '#FF6B9D' }}>Inicia sesión</Text></Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// Componente de campo reutilizable
const Campo = ({ icono, placeholder, value, onChange, tipo, seguro }) => (
  <View style={styles.campoContenedor}>
    <Ionicons name={icono} size={20} color="rgba(255,255,255,0.4)" style={styles.campoIcono} />
    <TextInput
      style={styles.campo}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.35)"
      value={value}
      onChangeText={onChange}
      keyboardType={tipo || 'default'}
      secureTextEntry={seguro || false}
      autoCapitalize="none"
    />
  </View>
);

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoTexto: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 2 },
  barraProgreso: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  segmentoProgreso: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  segmentoProgresoActivo: { backgroundColor: '#C44DFF' },
  textoProgreso: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 24 },
  pasoContenido: { gap: 14 },
  pasoTitulo: { fontSize: 22, fontWeight: '600', color: '#fff' },
  pasoSubtitulo: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: -8, marginBottom: 6 },
  campoContenedor: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingHorizontal: 14, height: 52
  },
  campoIcono: { marginRight: 10 },
  campo: { flex: 1, color: '#fff', fontSize: 15 },
  etiqueta: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  filaBotones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnOpcion: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  btnOpcionActivo: { borderColor: '#C44DFF', backgroundColor: 'rgba(196,77,255,0.2)' },
  txtOpcion: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  txtOpcionActivo: { color: '#C44DFF', fontWeight: '600' },
  gridFotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  celdaFoto: { width: '31%', aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden' },
  foto: { width: '100%', height: '100%' },
  fotoPlaceholder: {
    width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, borderStyle: 'dashed'
  },
  bioInput: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
    padding: 14, color: '#fff', fontSize: 14, height: 90, textAlignVertical: 'top'
  },
  contador: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'right', marginTop: -10 },
  gridIntereses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagInteres: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  tagInteresActivo: { borderColor: '#C44DFF', backgroundColor: 'rgba(196,77,255,0.2)' },
  tagTexto: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  tagTextoActivo: { color: '#C44DFF' },
  columnaOpciones: { gap: 10 },
  cardOpcion: {
    padding: 16, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)'
  },
  cardOpcionActiva: { borderColor: '#C44DFF', backgroundColor: 'rgba(196,77,255,0.15)' },
  cardOpcionLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardOpcionDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  btnSiguiente: { borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center' },
  btnSiguienteTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  yaTenga: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});
