// ================================================
// NEXO - Rutas y controlador de matches/likes
// Archivo: backend/src/routes/matches.js
// ================================================

const express = require('express');
const router = express.Router();
const { authenticateToken, requirePremium } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { obtenerPerfilesParaSwipe, procesarLike, obtenerRompehielo } = require('../services/matchingService');

// ----------------------------------------
// GET /api/matches/feed
// Obtener perfiles para el swipe principal
// ----------------------------------------
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 20;
    const perfiles = await obtenerPerfilesParaSwipe(req.user.id, limite);

    res.json({
      perfiles,
      total: perfiles.length,
      rompehielo: obtenerRompehielo()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cargar perfiles.' });
  }
});

// ----------------------------------------
// POST /api/matches/like
// Dar like, superlike o dislike a un perfil
// ----------------------------------------
router.post('/like', authenticateToken, async (req, res) => {
  try {
    const { to_user_id, tipo } = req.body;

    if (!to_user_id || !['like', 'superlike', 'dislike'].includes(tipo)) {
      return res.status(400).json({ error: 'Datos inválidos.' });
    }

    // Superlike consume monedas (50 monedas)
    if (tipo === 'superlike') {
      const { data: user } = await supabase
        .from('users')
        .select('coins_balance, subscription_type')
        .eq('id', req.user.id)
        .single();

      if (user.subscription_type === 'free' && user.coins_balance < 50) {
        return res.status(402).json({
          error: 'Necesitas 50 monedas para un Super Like.',
          coins_actuales: user.coins_balance
        });
      }

      if (user.subscription_type === 'free') {
        await supabase
          .from('users')
          .update({ coins_balance: user.coins_balance - 50 })
          .eq('id', req.user.id);
      }
    }

    const resultado = await procesarLike(req.user.id, to_user_id, tipo);

    // Si hay match nuevo, emitir evento de socket
    if (resultado.es_match && resultado.es_nuevo) {
      const io = req.app.get('io');
      if (io) {
        io.to(to_user_id).emit('nuevo_match', {
          match_id: resultado.match_id,
          compatibilidad: resultado.compatibilidad,
          rompehielo: resultado.mensaje_rompehielo
        });
      }
    }

    res.json(resultado);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar.' });
  }
});

// ----------------------------------------
// GET /api/matches/mis-matches
// Obtener todos mis matches activos
// ----------------------------------------
router.get('/mis-matches', authenticateToken, async (req, res) => {
  try {
    const { data: matches } = await supabase
      .from('matches')
      .select(`
        id, score_compatibilidad, created_at,
        user1:users!matches_user1_id_fkey (
          id, nombre, edad,
          profiles (fotos, bio, intereses)
        ),
        user2:users!matches_user2_id_fkey (
          id, nombre, edad,
          profiles (fotos, bio, intereses)
        ),
        messages (
          id, contenido, sent_at, sender_id
        )
      `)
      .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`)
      .eq('activo', true)
      .order('created_at', { ascending: false });

    // Formatear para mostrar siempre el "otro" usuario
    const matchesFormateados = matches?.map(match => {
      const esUser1 = match.user1.id === req.user.id;
      const otroUsuario = esUser1 ? match.user2 : match.user1;
      const ultimoMensaje = match.messages?.[0] || null;

      return {
        match_id: match.id,
        score: match.score_compatibilidad,
        fecha_match: match.created_at,
        usuario: otroUsuario,
        ultimo_mensaje: ultimoMensaje,
        tiene_mensajes: (match.messages?.length || 0) > 0
      };
    }) || [];

    res.json({ matches: matchesFormateados });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cargar matches.' });
  }
});

// ----------------------------------------
// GET /api/matches/quien-me-dio-like
// Ver quién me dio like (solo premium)
// ----------------------------------------
router.get('/quien-me-dio-like', authenticateToken, requirePremium, async (req, res) => {
  try {
    const { data: likes } = await supabase
      .from('likes')
      .select(`
        id, tipo, created_at,
        from_user:users!likes_from_user_id_fkey (
          id, nombre, edad,
          profiles (fotos, bio)
        )
      `)
      .eq('to_user_id', req.user.id)
      .in('tipo', ['like', 'superlike'])
      .order('created_at', { ascending: false });

    res.json({ likes: likes || [], total: likes?.length || 0 });

  } catch (error) {
    res.status(500).json({ error: 'Error al cargar likes.' });
  }
});

// ----------------------------------------
// DELETE /api/matches/:matchId
// Deshacer un match
// ----------------------------------------
router.delete('/:matchId', authenticateToken, async (req, res) => {
  try {
    await supabase
      .from('matches')
      .update({ activo: false })
      .eq('id', req.params.matchId)
      .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`);

    res.json({ message: 'Match eliminado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar match.' });
  }
});

module.exports = router;
