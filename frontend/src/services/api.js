// ================================================
// NEXO - Servicio de conexión con el backend
// Archivo: frontend/src/services/api.js
// ================================================

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Cambia esta URL por la de tu servidor
// En desarrollo: http://192.168.X.X:3000 (IP de tu PC en la red local)
// En producción: https://api.tunexo.com
const BASE_URL = 'http://192.168.1.100:3000/api';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// ============================================
// INTERCEPTOR: Agregar token JWT automáticamente
// ============================================
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('nexo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    // Si no hay token, la petición va sin autenticación
  }
  return config;
});

// Interceptor de respuesta: manejar token expirado
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado: limpiar y redirigir a login
      await SecureStore.deleteItemAsync('nexo_token');
      // El store de zustand lo maneja
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTENTICACIÓN
// ============================================
export const authAPI = {
  register: (datos) => api.post('/auth/register', datos),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.post(`/auth/verify-email/${token}`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  changePassword: (current, nueva) => api.put('/auth/change-password', {
    current_password: current,
    new_password: nueva
  }),
  deleteAccount: () => api.delete('/auth/delete-account'),
};

// ============================================
// PERFILES
// ============================================
export const profileAPI = {
  getProfile: (userId) => api.get(`/profiles/${userId}`),
  updateProfile: (datos) => api.put('/profiles/me', datos),
  uploadPhoto: (formData) => api.post('/profiles/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deletePhoto: (index) => api.delete(`/profiles/photos/${index}`),
  reportUser: (userId, motivo, descripcion) =>
    api.post(`/profiles/${userId}/report`, { motivo, descripcion }),
  blockUser: (userId) => api.post(`/profiles/${userId}/block`),
};

// ============================================
// MATCHES Y SWIPE
// ============================================
export const matchAPI = {
  getFeed: (limite = 20) => api.get(`/matches/feed?limite=${limite}`),
  darLike: (toUserId, tipo) => api.post('/matches/like', { to_user_id: toUserId, tipo }),
  getMisMatches: () => api.get('/matches/mis-matches'),
  getQuienMeDioLike: () => api.get('/matches/quien-me-dio-like'),
  eliminarMatch: (matchId) => api.delete(`/matches/${matchId}`),
};

// ============================================
// CHAT
// ============================================
export const chatAPI = {
  getConversaciones: () => api.get('/chat/conversaciones'),
  getMensajes: (matchId, pagina = 1) =>
    api.get(`/chat/mensajes/${matchId}?pagina=${pagina}`),
  enviarMensaje: (matchId, contenido, tipo = 'texto') =>
    api.post('/chat/mensajes', { match_id: matchId, contenido, tipo }),
  marcarLeidos: (matchId) => api.put(`/chat/mensajes/${matchId}/leidos`),
};

// ============================================
// ENTORNO
// ============================================
export const entornoAPI = {
  getCercanos: (radio = 150) => api.get(`/entorno/cercanos?radio=${radio}`),
  enviarMensajeInicial: (toUserId, mensaje) =>
    api.post('/entorno/mensaje-inicial', { to_user_id: toUserId, mensaje }),
  responderMensaje: (mensajeId, respuesta) =>
    api.post(`/entorno/responder/${mensajeId}`, { respuesta }),
  actualizarUbicacion: (latitud, longitud) =>
    api.put('/entorno/ubicacion', { latitud, longitud }),
};

// ============================================
// MONETIZACIÓN
// ============================================
export const monetizationAPI = {
  getPlanes: () => api.get('/monetization/plans'),
  getMisMonedas: () => api.get('/monetization/mis-monedas'),
  usarBoost: () => api.post('/monetization/usar-boost'),
  comprarMonedas: (paquete) => api.post('/monetization/comprar-monedas', { paquete }),
  suscribirse: (plan) => api.post('/monetization/suscribirse', { plan }),
};

// ============================================
// MEJORAS v2.0
// ============================================

// Mejora 1 — Verificación
export const verificationAPI = {
  enviarSelfie: (formData) => api.post('/verification/selfie', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getEstado: () => api.get('/verification/estado'),
};

// Mejora 2 — Personas activas
export const activeAPI = {
  getActivosAhora: (limite = 20) => api.get(`/active/ahora?limite=${limite}`),
  getContador:     ()            => api.get('/active/contador'),
};

// Mejora 5 — Video perfil
export const videoAPI = {
  subirVideo:   (formData) => api.post('/video/subir', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  eliminarVideo: () => api.delete('/video/eliminar'),
};

// Mejora 6 — Eventos
export const eventsAPI = {
  getCercanos:         (radio = 50) => api.get(`/events/cercanos?radio=${radio}`),
  crearEvento:         (datos)      => api.post('/events/crear', datos),
  unirse:              (eventId)    => api.post(`/events/${eventId}/unirse`),
  gestionarParticipante: (eventId, userId, estado) =>
    api.put(`/events/${eventId}/participante/${userId}`, { estado }),
};

// Mejora 7 — Filtros avanzados (se integra en profileAPI)
// Mejora 8 — Modo invisible
export const invisibleAPI = {
  activar:    () => api.post('/invisible/activar'),
  desactivar: () => api.post('/invisible/desactivar'),
  getEstado:  () => api.get('/invisible/estado'),
};

export default api;
