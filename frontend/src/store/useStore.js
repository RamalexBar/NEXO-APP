// ================================================
// NEXO - Estado global de la aplicación (Zustand)
// Archivo: frontend/src/store/useStore.js
// ================================================

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const useStore = create((set, get) => ({

  // ============================================
  // ESTADO DE AUTENTICACIÓN
  // ============================================
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Inicializar app: verificar si hay sesión guardada
  inicializar: async () => {
    try {
      const token = await SecureStore.getItemAsync('nexo_token');
      if (token) {
        const { data } = await authAPI.getMe();
        set({
          user: data.user,
          token,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      await SecureStore.deleteItemAsync('nexo_token');
      set({ isLoading: false });
    }
  },

  // Login
  login: async (email, password) => {
    const { data } = await authAPI.login(email, password);
    await SecureStore.setItemAsync('nexo_token', data.token);
    set({
      user: data.user,
      token: data.token,
      isAuthenticated: true
    });
    return data;
  },

  // Registro
  register: async (datos) => {
    const { data } = await authAPI.register(datos);
    await SecureStore.setItemAsync('nexo_token', data.token);
    set({
      user: data.user,
      token: data.token,
      isAuthenticated: true
    });
    return data;
  },

  // Logout
  logout: async () => {
    try { await authAPI.logout(); } catch {}
    await SecureStore.deleteItemAsync('nexo_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      perfilesFeed: [],
      matches: [],
      conversaciones: []
    });
  },

  // Actualizar datos del usuario
  actualizarUsuario: (datos) => set(state => ({
    user: { ...state.user, ...datos }
  })),

  // ============================================
  // ESTADO DEL FEED (SWIPE)
  // ============================================
  perfilesFeed: [],
  feedCargando: false,
  perfilActualIndex: 0,

  setPerfilesFeed: (perfiles) => set({ perfilesFeed: perfiles, perfilActualIndex: 0 }),
  setFeedCargando: (v) => set({ feedCargando: v }),

  // Remover perfil del feed después de swipe
  removerPerfilFeed: (userId) => set(state => ({
    perfilesFeed: state.perfilesFeed.filter(p => p.id !== userId)
  })),

  // ============================================
  // MATCHES
  // ============================================
  matches: [],
  nuevoMatch: null,

  setMatches: (matches) => set({ matches }),
  setNuevoMatch: (match) => set({ nuevoMatch: match }),
  limpiarNuevoMatch: () => set({ nuevoMatch: null }),

  // ============================================
  // CONVERSACIONES
  // ============================================
  conversaciones: [],
  mensajesActuales: {},
  matchActivo: null,

  setConversaciones: (convs) => set({ conversaciones: convs }),
  setMatchActivo: (match) => set({ matchActivo: match }),

  agregarMensaje: (matchId, mensaje) => set(state => ({
    mensajesActuales: {
      ...state.mensajesActuales,
      [matchId]: [...(state.mensajesActuales[matchId] || []), mensaje]
    }
  })),

  setMensajesMatch: (matchId, mensajes) => set(state => ({
    mensajesActuales: {
      ...state.mensajesActuales,
      [matchId]: mensajes
    }
  })),

  // ============================================
  // ENTORNO
  // ============================================
  usuariosCercanos: [],
  setUsuariosCercanos: (usuarios) => set({ usuariosCercanos: usuarios }),

  // ============================================
  // NOTIFICACIONES
  // ============================================
  notificaciones: [],
  mensajesNoLeidos: 0,

  agregarNotificacion: (notif) => set(state => ({
    notificaciones: [notif, ...state.notificaciones.slice(0, 49)]
  })),
  setMensajesNoLeidos: (n) => set({ mensajesNoLeidos: n }),

}));

export default useStore;
