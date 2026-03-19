// ================================================
// NEXO - Servicio de Socket.io (singleton)
// Archivo: frontend/src/services/socketService.js
// ================================================

import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = 'http://192.168.1.100:3000'; // Misma URL que el backend

let socket = null;

export const connectSocket = async () => {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync('nexo_token');
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => console.log('🔌 Socket conectado'));
  socket.on('disconnect', (reason) => console.log('🔌 Socket desconectado:', reason));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));

  return socket;
};

export const getSocket = () => {
  if (!socket) connectSocket();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
