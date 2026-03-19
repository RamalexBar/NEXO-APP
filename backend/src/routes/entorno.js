// ================================================
// NEXO - Función Entorno (personas cercanas)
// Archivo: backend/src/routes/entorno.js
// ================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');

// ----------------------------------------
// GET /api/entorno/cercanos
// Obtener personas dentro del radio (máx 150km)
// ----------------------------------------
router.get('/cercanos', authenticateToken, async (req, res) => {
  try {
    const radio = Math.min(parseInt(req.query.radio) || 150, 150); // máximo 150km

    // Obtener mi ubicación
    const { data: miPerfil } = await supabase
      .from('profiles')
      .select('latitud, longitud')
      .eq('user_id', req.user.id)
      .single();

    if (!miPerfil?.latitud) {
      return res.status(400).json({
        error: 'Activa tu ubicación para usar Entorno.',
        requiere_ubicacion: true
      });
    }

    // Buscar personas cercanas usando fórmula Haversine en SQL
    // Supabase permite ejecutar SQL directamente
    const { data: cercanos } = await supabase.rpc('usuarios_cercanos', {
      lat_usuario: miPerfil.latitud,
      lng_usuario: miPerfil.longitud,
      radio_km: radio,
      excluir_id: req.user.id
    });

    res.json({
      usuarios: cercanos || [],
      total: cercanos?.length || 0,
      radio_km: radio
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cargar entorno.' });
  }
});

// ----------------------------------------
// POST /api/entorno/mensaje-inicial
// Enviar mensaje sin match (1 solo mensaje gratis)
// ----------------------------------------
router.post('/mensaje-inicial', authenticateToken, async (req, res) => {
  try {
    const { to_user_id, mensaje } = req.body;

    if (!mensaje?.trim() || mensaje.length > 200) {
      return res.status(400).json({ error: 'Mensaje inválido (máximo 200 caracteres).' });
    }

    // Verificar si ya envió un mensaje antes
    const { data: mensajeAnterior } = await supabase
      .from('entorno_messages')
      .select('id, respondido')
      .eq('from_user_id', req.user.id)
      .eq('to_user_id', to_user_id)
      .single();

    if (mensajeAnterior) {
      if (!mensajeAnterior.respondido) {
        return res.status(429).json({
          error: 'Ya enviaste un mensaje a esta persona. Solo puedes enviar más si te responde.',
          puede_enviar_mas: false
        });
      }
      // Si ya respondió, esta conversación debería estar en matches normales
      return res.status(400).json({ error: 'Esta conversación ya fue abierta. Búscala en tus chats.' });
    }

    // Verificar si el usuario tiene monedas para mensajes extra (si ya usó el gratuito)
    const { data: user } = await supabase
      .from('users')
      .select('coins_balance')
      .eq('id', req.user.id)
      .single();

    // Registrar el mensaje inicial
    const { data: nuevoMensaje } = await supabase
      .from('entorno_messages')
      .insert({
        from_user_id: req.user.id,
        to_user_id,
        mensaje: mensaje.trim(),
        respondido: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    // Notificar al receptor via socket
    // (el socket handler debe estar accesible aquí)

    res.status(201).json({
      message: 'Mensaje enviado. Si responde, se abrirá la conversación completa.',
      mensaje_id: nuevoMensaje.id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar mensaje.' });
  }
});

// ----------------------------------------
// POST /api/entorno/responder/:mensajeId
// Responder un mensaje de entorno (abre conversación completa)
// ----------------------------------------
router.post('/responder/:mensajeId', authenticateToken, async (req, res) => {
  try {
    const { respuesta } = req.body;

    const { data: mensajeOriginal } = await supabase
      .from('entorno_messages')
      .select('*')
      .eq('id', req.params.mensajeId)
      .eq('to_user_id', req.user.id)
      .single();

    if (!mensajeOriginal) {
      return res.status(404).json({ error: 'Mensaje no encontrado.' });
    }

    // Marcar como respondido
    await supabase
      .from('entorno_messages')
      .update({ respondido: true })
      .eq('id', mensajeOriginal.id);

    // Crear match para abrir conversación completa
    const { data: nuevoMatch } = await supabase
      .from('matches')
      .insert({
        user1_id: mensajeOriginal.from_user_id,
        user2_id: req.user.id,
        score_compatibilidad: 50,
        origen: 'entorno',
        activo: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    // Guardar ambos mensajes en el chat del match
    await supabase.from('messages').insert([
      {
        match_id: nuevoMatch.id,
        sender_id: mensajeOriginal.from_user_id,
        contenido: mensajeOriginal.mensaje,
        tipo: 'texto',
        leido: true,
        sent_at: mensajeOriginal.created_at
      },
      {
        match_id: nuevoMatch.id,
        sender_id: req.user.id,
        contenido: respuesta.trim(),
        tipo: 'texto',
        leido: false,
        sent_at: new Date().toISOString()
      }
    ]);

    res.json({
      message: '¡Conversación abierta!',
      match_id: nuevoMatch.id
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al responder.' });
  }
});

// ----------------------------------------
// PUT /api/entorno/ubicacion
// Actualizar mi ubicación GPS
// ----------------------------------------
router.put('/ubicacion', authenticateToken, async (req, res) => {
  try {
    const { latitud, longitud } = req.body;

    if (!latitud || !longitud) {
      return res.status(400).json({ error: 'Coordenadas inválidas.' });
    }

    await supabase
      .from('profiles')
      .update({
        latitud: parseFloat(latitud),
        longitud: parseFloat(longitud),
        ubicacion_actualizada_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id);

    res.json({ message: 'Ubicación actualizada.' });

  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar ubicación.' });
  }
});

module.exports = router;
