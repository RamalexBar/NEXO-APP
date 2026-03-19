// ================================================
// NEXO - Pantalla de Login
// Archivo: frontend/src/screens/LoginScreen.js
// ================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const { login } = useStore();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor llena todos los campos.');
      return;
    }
    try {
      setCargando(true);
      await login(email.trim().toLowerCase(), password);
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al iniciar sesión.';
      Alert.alert('Error', msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <LinearGradient colors={['#0f0f1a', '#1a0533']} style={styles.fondo}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}>
          {/* Logo */}
          <View style={styles.logoContenedor}>
            <Text style={styles.logoSimbolo}>✦</Text>
            <Text style={styles.logoTexto}>NEXO</Text>
            <Text style={styles.logoSubtitulo}>Conecta con el mundo</Text>
          </View>

          {/* Formulario */}
          <View style={styles.formulario}>
            <Text style={styles.titulo}>Iniciar sesión</Text>

            {/* Email */}
            <View style={styles.campoContenedor}>
              <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.campoIcono} />
              <TextInput
                style={styles.campo}
                placeholder="Correo electrónico"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Contraseña */}
            <View style={styles.campoContenedor}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.campoIcono} />
              <TextInput
                style={[styles.campo, { flex: 1 }]}
                placeholder="Contraseña"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!verPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setVerPassword(!verPassword)} style={{ padding: 4 }}>
                <Ionicons name={verPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {/* Olvidé contraseña */}
            <TouchableOpacity
              onPress={() => navigation.navigate('RecuperarPassword')}
              style={styles.olvidaste}
            >
              <Text style={styles.olvidasteTexto}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* Botón login */}
            <TouchableOpacity onPress={handleLogin} disabled={cargando} style={{ marginTop: 8 }}>
              <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnLogin}>
                {cargando
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnTexto}>Iniciar sesión</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.separador}>
              <View style={styles.lineaSeparador} />
              <Text style={styles.textoSeparador}>o continúa con</Text>
              <View style={styles.lineaSeparador} />
            </View>

            {/* Google / Apple (placeholder) */}
            <View style={styles.botonesOAuth}>
              <TouchableOpacity style={styles.btnOAuth}>
                <Text style={styles.btnOAuthTexto}>🌐  Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOAuth}>
                <Text style={styles.btnOAuthTexto}>🍎  Apple</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Ir a registro */}
          <View style={styles.piePagina}>
            <Text style={styles.textoMuted}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Registro')}>
              <Text style={styles.enlaceRegistro}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoContenedor: { alignItems: 'center', marginBottom: 40 },
  logoSimbolo: { fontSize: 48, color: '#C44DFF', marginBottom: 4 },
  logoTexto: { fontSize: 36, fontWeight: '700', color: '#fff', letterSpacing: 4 },
  logoSubtitulo: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  formulario: { gap: 14 },
  titulo: { fontSize: 22, fontWeight: '600', color: '#fff', marginBottom: 6 },
  campoContenedor: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingHorizontal: 14, height: 52
  },
  campoIcono: { marginRight: 10 },
  campo: { flex: 1, color: '#fff', fontSize: 15 },
  olvidaste: { alignSelf: 'flex-end' },
  olvidasteTexto: { color: '#C44DFF', fontSize: 13 },
  btnLogin: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  lineaSeparador: { flex: 1, height: 0.5, backgroundColor: 'rgba(255,255,255,0.15)' },
  textoSeparador: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  botonesOAuth: { flexDirection: 'row', gap: 12 },
  btnOAuth: {
    flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)'
  },
  btnOAuthTexto: { color: '#fff', fontSize: 14 },
  piePagina: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  textoMuted: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  enlaceRegistro: { color: '#FF6B9D', fontSize: 14, fontWeight: '600' },
});
