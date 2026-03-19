// ================================================
// NEXO — Pantalla de Configuración (con mejoras 3 y 8)
// Archivo: frontend/src/screens/SettingsScreen.js
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { invisibleAPI } from '../services/api';

const COLORES = {
  fondo: '#0f0f1a', card: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)', texto: '#FFFFFF',
  muted: 'rgba(255,255,255,0.5)', acento: '#C44DFF',
};

const BADGE_INFO = {
  oro:         { color: '#FFD700', emoji: '⭐', label: 'Usuario de oro' },
  plata:       { color: '#C0C0C0', emoji: '🥈', label: 'Usuario confiable' },
  normal:      { color: '#6B7280', emoji: '👤', label: 'Usuario normal' },
  advertencia: { color: '#EF4444', emoji: '⚠️', label: 'Bajo reputación' },
};

export default function SettingsScreen({ navigation }) {
  const { user, logout, actualizarUsuario } = useStore();
  const [modoInvisible, setModoInvisible] = useState(false);
  const [notificaciones, setNotificaciones] = useState(true);
  const [cargandoInvisible, setCargandoInvisible] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    cargarEstados();
  }, []);

  const cargarEstados = async () => {
    try {
      const { data } = await invisibleAPI.getEstado();
      setModoInvisible(data.modo_invisible || false);
    } catch (e) { /* sin efecto */ }
  };

  const toggleInvisible = async (valor) => {
    if (valor && user?.subscription_type === 'free') {
      Alert.alert(
        '🔒 Función Premium',
        'El modo invisible es exclusivo para suscriptores Premium.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver planes', onPress: () => navigation.navigate('Premium') },
        ]
      );
      return;
    }
    setCargandoInvisible(true);
    try {
      if (valor) await invisibleAPI.activar();
      else await invisibleAPI.desactivar();
      setModoInvisible(valor);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cambiar el modo invisible.');
    } finally { setCargandoInvisible(false); }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => { setCerrandoSesion(true); await logout(); }
      },
    ]);
  };

  const badgeInfo = BADGE_INFO[user?.badge_reputacion || 'normal'];

  const Opcion = ({ icono, titulo, subtitulo, onPress, derecha, color }) => (
    <TouchableOpacity style={styles.opcion} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.opcionIcono, { backgroundColor: `${color || COLORES.acento}22` }]}>
        <Ionicons name={icono} size={20} color={color || COLORES.acento} />
      </View>
      <View style={styles.opcionInfo}>
        <Text style={styles.opcionTitulo}>{titulo}</Text>
        {subtitulo && <Text style={styles.opcionSub}>{subtitulo}</Text>}
      </View>
      {derecha || <Ionicons name="chevron-forward" size={16} color={COLORES.muted} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Configuración</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>

        {/* Tarjeta de usuario */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={{ fontSize: 30 }}>👤</Text>
            {user?.is_verified && (
              <View style={styles.verificadoBadge}>
                <Text style={{ fontSize: 12 }}>✓</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userNombre}>{user?.nombre || 'Usuario'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.userBadgesFila}>
              {/* Badge suscripción */}
              <View style={[styles.badge, { backgroundColor: user?.subscription_type === 'premium' ? 'rgba(196,77,255,0.3)' : 'rgba(255,255,255,0.1)' }]}>
                <Text style={[styles.badgeTexto, { color: user?.subscription_type === 'premium' ? '#C44DFF' : COLORES.muted }]}>
                  {user?.subscription_type === 'premium' ? '⭐ Premium' : '· Free'}
                </Text>
              </View>
              {/* Badge reputación (Mejora 3) */}
              <View style={[styles.badge, { backgroundColor: `${badgeInfo.color}22` }]}>
                <Text style={[styles.badgeTexto, { color: badgeInfo.color }]}>
                  {badgeInfo.emoji} {badgeInfo.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Puntuación de reputación (Mejora 3) */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Mi reputación</Text>
          <View style={styles.reputacionCard}>
            <View style={styles.reputacionFila}>
              <Text style={styles.reputacionNum}>{user?.reputacion ?? 50}</Text>
              <Text style={styles.reputacionLabel}>/100 puntos</Text>
            </View>
            <View style={styles.reputacionBarra}>
              <View style={[styles.reputacionRelleno, { width: `${user?.reputacion ?? 50}%`, backgroundColor: badgeInfo.color }]} />
            </View>
            <Text style={styles.reputacionInfo}>
              Mejora tu reputación completando tu perfil, haciendo matches y teniendo conversaciones largas.
            </Text>
          </View>
        </View>

        {/* Cuenta */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Cuenta</Text>
          <View style={styles.seccionCard}>
            <Opcion icono="shield-checkmark-outline" titulo="Verificar identidad" subtitulo={user?.is_verified ? 'Perfil verificado ✓' : 'Agrega el sello de confianza'} color="#4ade80" onPress={() => navigation.navigate('Verificacion')} />
            <Opcion icono="person-outline" titulo="Editar perfil" subtitulo="Fotos, bio e intereses" onPress={() => navigation.navigate('EditarPerfil')} />
            <Opcion icono="star-outline" titulo="Nexo Premium" subtitulo={user?.subscription_type === 'premium' ? 'Activo' : 'Sin límites ni anuncios'} color="#FFD700" onPress={() => navigation.navigate('Premium')} />
            <Opcion icono="wallet-outline" titulo="Mis monedas" subtitulo={`${user?.coins_balance || 0} monedas disponibles`} color="#FF9B6B" onPress={() => navigation.navigate('Monedas')} />
          </View>
        </View>

        {/* Privacidad (Mejora 8) */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Privacidad</Text>
          <View style={styles.seccionCard}>
            <View style={styles.opcion}>
              <View style={[styles.opcionIcono, { backgroundColor: 'rgba(100,150,255,0.15)' }]}>
                <Ionicons name="eye-off-outline" size={20} color="#6496ff" />
              </View>
              <View style={styles.opcionInfo}>
                <Text style={styles.opcionTitulo}>
                  Modo invisible
                  {user?.subscription_type === 'free' && <Text style={styles.premiumTag}> Premium</Text>}
                </Text>
                <Text style={styles.opcionSub}>Explora sin aparecer en el feed</Text>
              </View>
              {cargandoInvisible
                ? <ActivityIndicator size="small" color={COLORES.acento} />
                : <Switch value={modoInvisible} onValueChange={toggleInvisible} trackColor={{ true: COLORES.acento }} thumbColor="#fff" />
              }
            </View>
            <View style={styles.opcion}>
              <View style={[styles.opcionIcono, { backgroundColor: 'rgba(255,107,157,0.15)' }]}>
                <Ionicons name="notifications-outline" size={20} color="#FF6B9D" />
              </View>
              <View style={styles.opcionInfo}>
                <Text style={styles.opcionTitulo}>Notificaciones</Text>
                <Text style={styles.opcionSub}>Matches, mensajes y personas cerca</Text>
              </View>
              <Switch value={notificaciones} onValueChange={setNotificaciones} trackColor={{ true: COLORES.acento }} thumbColor="#fff" />
            </View>
          </View>
        </View>

        {/* Descubrir */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Descubrir</Text>
          <View style={styles.seccionCard}>
            <Opcion icono="flame-outline" titulo="Activos ahora" subtitulo="Ver personas conectadas en este momento" color="#FF6B9D" onPress={() => navigation.navigate('ActivosAhora')} />
            <Opcion icono="people-outline" titulo="Eventos cercanos" subtitulo="Citas y actividades en tu zona" color="#4ade80" onPress={() => navigation.navigate('Eventos')} />
          </View>
        </View>

        {/* Gamificación */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Logros y ranking</Text>
          <View style={styles.seccionCard}>
            <Opcion icono='trophy-outline' titulo='Mis logros y racha' subtitulo='Achievements, racha y ranking semanal' color='#FFD700' onPress={() => navigation.navigate('Logros')} />
          </View>
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity onPress={handleLogout} disabled={cerrandoSesion}>
          <View style={styles.btnLogout}>
            {cerrandoSesion
              ? <ActivityIndicator color="#EF4444" />
              : <>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                  <Text style={styles.btnLogoutTexto}>Cerrar sesión</Text>
                </>
            }
          </View>
        </TouchableOpacity>

        <Text style={styles.version}>NEXO v2.0 · 10 mejoras activas</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORES.fondo },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitulo: { fontSize: 17, fontWeight: '600', color: '#fff' },
  userCard: { flexDirection: 'row', gap: 14, backgroundColor: COLORES.card, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: COLORES.border, alignItems: 'center' },
  userAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#2d1b45', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  verificadoBadge: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: '#4ade80', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORES.fondo },
  userInfo: { flex: 1, gap: 3 },
  userNombre: { fontSize: 17, fontWeight: '600', color: '#fff' },
  userEmail: { fontSize: 13, color: COLORES.muted },
  userBadgesFila: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTexto: { fontSize: 11, fontWeight: '500' },
  seccion: { gap: 8 },
  seccionTitulo: { fontSize: 13, fontWeight: '500', color: COLORES.muted, paddingLeft: 4 },
  seccionCard: { backgroundColor: COLORES.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORES.border, overflow: 'hidden' },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 0.5, borderBottomColor: COLORES.border },
  opcionIcono: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  opcionInfo: { flex: 1 },
  opcionTitulo: { fontSize: 14, color: '#fff', fontWeight: '500' },
  opcionSub: { fontSize: 12, color: COLORES.muted, marginTop: 1 },
  premiumTag: { color: '#FFD700', fontSize: 11 },
  reputacionCard: { backgroundColor: COLORES.card, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: COLORES.border, gap: 8 },
  reputacionFila: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  reputacionNum: { fontSize: 32, fontWeight: '700', color: '#fff' },
  reputacionLabel: { fontSize: 14, color: COLORES.muted },
  reputacionBarra: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  reputacionRelleno: { height: '100%', borderRadius: 3 },
  reputacionInfo: { fontSize: 12, color: COLORES.muted, lineHeight: 17 },
  btnLogout: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  btnLogoutTexto: { color: '#EF4444', fontSize: 15, fontWeight: '500' },
  version: { textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 },
});
