// ================================================
// NEXO — Videollamada Premium (Agora.io)
// Archivo: backend/src/routes/videocall.js
//
// Agora.io ofrece los primeros 10,000 min/mes gratis.
// Registro en: https://console.agora.io
// ================================================

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { authenticateToken, requirePremium } = require('../middleware/auth');
const { verificarLogros } = require('../services/gamificationService');
const { notificarNuevoMensaje } = require('../services/notificationService');
const supabase = require('../config/supabase');

const APP_ID          = process.env.AGORA_APP_ID          || 'demo_app_id';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';
const TOKEN_EXPIRY    = 3600; // 1 hora en segundos

// ── Generar token de Agora (o token demo en desarrollo) ──────────
const generarTokenAgora = (channelName, uid) => {
  if (!APP_CERTIFICATE || process.env.NODE_ENV !== 'production') {
    // Token demo — solo funciona en modo test de Agora
    return `demo_token_${channelName}_${uid}_${Date.now()}`;
  }

  // Token real con RtcTokenBuilder
  // npm install agora-token
  try {
    const { RtcTokenBuilder, RtcRole } = require('agora-token');
    const expireTime = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY;
    return RtcTokenBuilder.buildTokenWithUid(
      APP_ID, APP_CERTIFICATE, channelName, uid,
      RtcRole.PUBLISHER, expireTime, expireTime
    );
  } catch {
    return `demo_token_${channelName}_${uid}`;
  }
};

// ── Generar nombre de canal único para el match ──────────────────
const generarCanal = (matchId) =>
  `nexo_${crypto.createHash('md5').update(matchId).digest('hex').substring(0, 16)}`;

// ----------------------------------------
// POST /api/videocall/iniciar
// Iniciar videollamada (solo premium)
// ----------------------------------------
router.post('/iniciar', authenticateToken, requirePremium, async (req, res) => {
  try {
    const { match_id } = req.body;
    if (!match_id) return res.status(400).json({ error: 'match_id requerido.' });

    // Verificar que pertenece al match
    const { data: match } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id, activo')
      .eq('id', match_id)
      .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`)
      .single();

    if (!match || !match.activo) {
      return res.status(404).json({ error: 'Match no encontrado o inactivo.' });
    }

    const otroUserId = match.user1_id === req.user.id ? match.user2_id : match.user1_id;

    // Verificar que el otro también es premium
    const { data: otroUser } = await supabase
      .from('users')
      .select('subscription_type, nombre, expo_push_token')
      .eq('id', otroUserId)
      .single();

    if (otroUser?.subscription_type !== 'premium') {
      return res.status(402).json({
        error: `${otroUser?.nombre || 'La otra persona'} necesita Premium para videollamadas.`,
        otro_necesita_premium: true,
      });
    }

    const canal  = generarCanal(match_id);
    const uid    = Math.floor(Math.random() * 100000);
    const token  = generarTokenAgora(canal, uid);

    // Guardar registro de la llamada
    const { data: llamada } = await supabase
      .from('videocalls')
      .insert({
        match_id,
        iniciador_id: req.user.id,
        receptor_id: otroUserId,
        canal,
        estado: 'iniciada',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Notificar al otro usuario via socket
    const io = req.app.get('io');
    if (io) {
      io.to(otroUserId).emit('videollamada_entrante', {
        llamada_id: llamada.id,
        match_id,
        canal,
        app_id: APP_ID,
        de: req.user.nombre || 'Tu match',
      });
    }

    // Notificación push
    await notificarNuevoMensaje(otroUserId, '📹 Videollamada', 'Te están llamando ahora mismo');

    // Logro por primera videollamada
    await verificarLogros(req.user.id, 'primer_videollamada');

    res.json({
      llamada_id: llamada.id,
      canal,
      token,
      uid,
      app_id: APP_ID,
      expira_en: TOKEN_EXPIRY,
    });
  } catch (error) {
    console.error('Error videollamada:', error);
    res.status(500).json({ error: 'Error al iniciar videollamada.' });
  }
});

// ----------------------------------------
// POST /api/videocall/responder/:llamadaId
// Aceptar o rechazar videollamada
// ----------------------------------------
router.post('/responder/:llamadaId', authenticateToken, async (req, res) => {
  try {
    const { accion } = req.body; // 'aceptar' | 'rechazar'

    const { data: llamada } = await supabase
      .from('videocalls')
      .select('*')
      .eq('id', req.params.llamadaId)
      .eq('receptor_id', req.user.id)
      .single();

    if (!llamada) return res.status(404).json({ error: 'Llamada no encontrada.' });

    if (accion === 'aceptar') {
      const uid   = Math.floor(Math.random() * 100000);
      const token = generarTokenAgora(llamada.canal, uid);

      await supabase.from('videocalls')
        .update({ estado: 'en_curso', iniciada_at: new Date().toISOString() })
        .eq('id', llamada.id);

      const io = req.app.get('io');
      if (io) {
        io.to(llamada.iniciador_id).emit('videollamada_aceptada', { llamada_id: llamada.id });
      }

      return res.json({ token, uid, canal: llamada.canal, app_id: APP_ID });
    }

    // Rechazar
    await supabase.from('videocalls')
      .update({ estado: 'rechazada', finalizada_at: new Date().toISOString() })
      .eq('id', llamada.id);

    const io = req.app.get('io');
    if (io) {
      io.to(llamada.iniciador_id).emit('videollamada_rechazada', { llamada_id: llamada.id });
    }

    res.json({ message: 'Llamada rechazada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al responder llamada.' });
  }
});

// ----------------------------------------
// POST /api/videocall/finalizar/:llamadaId
// Finalizar videollamada y registrar duración
// ----------------------------------------
router.post('/finalizar/:llamadaId', authenticateToken, async (req, res) => {
  try {
    const { data: llamada } = await supabase
      .from('videocalls')
      .select('iniciada_at')
      .eq('id', req.params.llamadaId)
      .single();

    const duracionSeg = llamada?.iniciada_at
      ? Math.round((Date.now() - new Date(llamada.iniciada_at)) / 1000)
      : 0;

    await supabase.from('videocalls')
      .update({ estado: 'finalizada', finalizada_at: new Date().toISOString(), duracion_segundos: duracionSeg })
      .eq('id', req.params.llamadaId);

    res.json({ message: 'Videollamada finalizada.', duracion_segundos: duracionSeg });
  } catch (error) {
    res.status(500).json({ error: 'Error al finalizar.' });
  }
});

// ----------------------------------------
// GET /api/videocall/historial
// Ver mis videollamadas
// ----------------------------------------
router.get('/historial', authenticateToken, async (req, res) => {
  const { data } = await supabase
    .from('videocalls')
    .select(`
      id, canal, estado, duracion_segundos, created_at,
      iniciador:users!videocalls_iniciador_id_fkey (id, nombre, profiles(fotos)),
      receptor:users!videocalls_receptor_id_fkey (id, nombre, profiles(fotos))
    `)
    .or(`iniciador_id.eq.${req.user.id},receptor_id.eq.${req.user.id}`)
    .order('created_at', { ascending: false })
    .limit(20);

  res.json({ llamadas: data || [] });
});

module.exports = router;
