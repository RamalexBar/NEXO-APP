// ================================================
// NEXO Backend - Punto de entrada principal
// Archivo: backend/src/index.js
// ================================================

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar rutas
const authRoutes         = require('./routes/auth');
const profileRoutes      = require('./routes/profiles');
const matchRoutes        = require('./routes/matches');
const chatRoutes         = require('./routes/chat');
const entornoRoutes      = require('./routes/entorno');
const monetizationRoutes = require('./routes/monetization');
const adminRoutes        = require('./routes/admin');
// ── Mejoras 1-9 ──────────────────────────────────────────────────
const verificationRoutes = require('./routes/verification');  // Mejora 1
const activeRoutes       = require('./routes/active');         // Mejora 2
const videoRoutes        = require('./routes/video');          // Mejora 5
const eventsRoutes       = require('./routes/events');         // Mejora 6
const invisibleRoutes    = require('./routes/invisible');      // Mejora 8
const { iniciarCronNotificaciones } = require('./services/notificationService'); // Mejora 9
// ── v3: correcciones + funciones nuevas ──────────────────────────
const reportsRoutes      = require('./routes/reports');        // Problema 2: reportes/bloqueos
const videocallRoutes    = require('./routes/videocall');      // Función nueva 1: videollamada
const gamificationRoutes = require('./routes/gamification');   // Problema 4 + Función nueva 3

// Importar socket handler
const initSocket = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// ================================================
// CONFIGURACIÓN DE SEGURIDAD
// ================================================

// Helmet: protege cabeceras HTTP
app.use(helmet());

// CORS: permite peticiones desde la app móvil
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'exp://localhost:8081', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting: máximo 100 peticiones por 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones. Espera 15 minutos.' }
});
app.use('/api/', limiter);

// Rate limit más estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: { error: 'Demasiados intentos de login. Espera 1 hora.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ================================================
// MIDDLEWARE GENERAL
// ================================================

app.use(express.json({ limit: '10mb' })); // Parsear JSON
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Log de peticiones en consola

// ================================================
// RUTAS DE LA API
// ================================================

app.use('/api/auth',         authRoutes);
app.use('/api/profiles',    profileRoutes);
app.use('/api/matches',     matchRoutes);
app.use('/api/chat',        chatRoutes);
app.use('/api/entorno',     entornoRoutes);
app.use('/api/monetization',monetizationRoutes);
app.use('/api/admin',       adminRoutes);
// ── Mejoras 1-9 ──────────────────────────────────────────────────
app.use('/api/verification',verificationRoutes);
app.use('/api/active',      activeRoutes);
app.use('/api/video',       videoRoutes);
app.use('/api/events',      eventsRoutes);
app.use('/api/invisible',   invisibleRoutes);
// ── v3 ───────────────────────────────────────────────────────────
app.use('/api/reports',     reportsRoutes);      // Problema 2
app.use('/api/videocall',   videocallRoutes);    // Función nueva 1
app.use('/api/gamification',gamificationRoutes); // Problema 4 + Función 3

// Ruta de verificación de salud del servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'NEXO Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejar errores globales
app.use((err, req, res, next) => {
  console.error('Error global:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// ================================================
// SOCKET.IO - CHAT EN TIEMPO REAL
// ================================================

initSocket(server);

// ================================================
// INICIAR SERVIDOR
// ================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('  ✦ NEXO Backend iniciado — v2.0 con 10 mejoras');
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → Salud: http://localhost:${PORT}/health`);
  console.log('');
  iniciarCronNotificaciones(); // Mejora 9
});

module.exports = { app, server };
