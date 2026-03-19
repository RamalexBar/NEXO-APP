// ================================================
// NEXO - Sistema de chat en tiempo real
// Archivo: backend/src/socket/socketHandler.js
// ================================================

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { traducirMensaje, obtenerIdiomaUsuario } = require('../services/translationService');
const { notificarNuevoMensaje } = require('../services/notificationService');
const { detectarSpam, estaBlockeado } = require('../middleware/security');
const { verificarLogros } = require('../services/gamificationService');

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // ============================================
  // MIDDLEWARE: Verificar token al conectar
  // ============================================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Token requerido'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { data: user } = await supabase
        .from('users')
        .select('id, nombre')
        .eq('id', decoded.userId)
        .single();

      if (!user) return next(new Error('Usuario no encontrado'));

      socket.userId = user.id;
      socket.userName = user.nombre;
      next();

    } catch (error) {
      next(new Error('Token inválido'));
    }
  });

  // ============================================
  // CONEXIÓN DE USUARIO
  // ============================================
  io.on('connection', (socket) => {
    console.log(`🟢 Usuario conectado: ${socket.userName} (${socket.userId})`);

    // Unirse a sala personal para recibir notificaciones
    socket.join(socket.userId);

    // Actualizar estado online en base de datos
    supabase
      .from('users')
      .update({ is_online: true, last_active: new Date().toISOString() })
      .eq('id', socket.userId);

    // ----------------------------------------
    // UNIRSE A UNA SALA DE CHAT
    // El cliente envía el match_id para entrar al chat
    // ----------------------------------------
    socket.on('unirse_chat', async ({ match_id }) => {
      try {
        // Verificar que el usuario pertenece a este match
        const { data: match } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id')
          .eq('id', match_id)
          .or(`user1_id.eq.${socket.userId},user2_id.eq.${socket.userId}`)
          .single();

        if (!match) {
          socket.emit('error_chat', { message: 'No tienes acceso a este chat.' });
          return;
        }

        socket.join(`chat_${match_id}`);
        socket.emit('chat_listo', { match_id });

        // Cargar los últimos 50 mensajes
        const { data: mensajes } = await supabase
          .from('messages')
          .select(`
            id, contenido, tipo, sent_at, sender_id,
            sender:users!messages_sender_id_fkey (nombre)
          `)
          .eq('match_id', match_id)
          .order('sent_at', { ascending: true })
          .limit(50);

        socket.emit('historial_mensajes', { mensajes: mensajes || [] });

        // Marcar mensajes como leídos
        await supabase
          .from('messages')
          .update({ leido: true })
          .eq('match_id', match_id)
          .neq('sender_id', socket.userId)
          .eq('leido', false);

      } catch (error) {
        socket.emit('error_chat', { message: 'Error al unirse al chat.' });
      }
    });

    // ----------------------------------------
    // ENVIAR MENSAJE
    // ----------------------------------------
    socket.on('enviar_mensaje', async ({ match_id, contenido, tipo = 'texto' }) => {
      try {
        if (!contenido?.trim()) return;
        if (contenido.length > 1000) {
          socket.emit('error_chat', { message: 'Mensaje demasiado largo.' });
          return;
        }

        // Verificar que el match existe y es activo
        const { data: match } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id, activo')
          .eq('id', match_id)
          .or(`user1_id.eq.${socket.userId},user2_id.eq.${socket.userId}`)
          .single();

        if (!match || !match.activo) {
          socket.emit('error_chat', { message: 'No puedes enviar mensajes en este chat.' });
          return;
        }

        // PROBLEMA 1 — Verificar bloqueo y spam
        const otroUserId = match.user1_id === socket.userId ? match.user2_id : match.user1_id;
        const bloqueado  = await estaBlockeado(socket.userId, otroUserId);
        if (bloqueado) {
          socket.emit('error_chat', { message: 'No puedes enviar mensajes a este usuario.' });
          return;
        }
        const esSpam = await detectarSpam(socket.userId, contenido);
        if (esSpam) {
          socket.emit('error_chat', { message: 'Mensaje bloqueado. Evita mensajes repetidos o links.' });
          return;
        }

        // Guardar mensaje en la base de datos
        const { data: nuevoMensaje } = await supabase
          .from('messages')
          .insert({
            match_id,
            sender_id: socket.userId,
            contenido: contenido.trim(),
            tipo,
            leido: false,
            sent_at: new Date().toISOString()
          })
          .select(`
            id, contenido, tipo, sent_at, sender_id,
            sender:users!messages_sender_id_fkey (nombre)
          `)
          .single();

        // MEJORA 4: Traducción automática para el receptor
        const idiomaEmisor   = await obtenerIdiomaUsuario(socket.userId);
        const idiomaReceptor = await obtenerIdiomaUsuario(otroUserId);
        let mensajeParaReceptor = { ...nuevoMensaje };
        if (idiomaEmisor !== idiomaReceptor) {
          const traduccion = await traducirMensaje(contenido.trim(), idiomaReceptor, idiomaEmisor);
          if (traduccion.traducido) {
            mensajeParaReceptor = {
              ...nuevoMensaje,
              contenido_traducido: traduccion.texto_traducido,
              idioma_original: idiomaEmisor,
            };
          }
        }

        // Emitir a todos en la sala del chat
        io.to(`chat_${match_id}`).emit('nuevo_mensaje', nuevoMensaje);

        // Notificación push al otro usuario (MEJORA 9)
        await notificarNuevoMensaje(
          otroUserId,
          socket.userName,
          contenido.substring(0, 60)
        );

        // Notificación socket si no está en el chat
        io.to(otroUserId).emit('notificacion_mensaje', {
          match_id,
          from: socket.userName,
          preview: mensajeParaReceptor.contenido_traducido || contenido.substring(0, 50)
        });

      } catch (error) {
        socket.emit('error_chat', { message: 'Error al enviar mensaje.' });
      }
    });

    // ----------------------------------------
    // INDICADOR "ESCRIBIENDO..."
    // ----------------------------------------
    socket.on('escribiendo', ({ match_id }) => {
      socket.to(`chat_${match_id}`).emit('usuario_escribiendo', {
        user_id: socket.userId,
        nombre: socket.userName
      });
    });

    socket.on('dejo_de_escribir', ({ match_id }) => {
      socket.to(`chat_${match_id}`).emit('usuario_dejo_escribir', {
        user_id: socket.userId
      });
    });

    // ----------------------------------------
    // DESCONEXIÓN
    // ----------------------------------------
    socket.on('disconnect', async () => {
      console.log(`🔴 Usuario desconectado: ${socket.userName}`);

      await supabase
        .from('users')
        .update({
          is_online: false,
          last_active: new Date().toISOString()
        })
        .eq('id', socket.userId);
    });
  });

  return io;
};

module.exports = initSocket;
