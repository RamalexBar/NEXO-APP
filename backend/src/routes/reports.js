// ================================================
// NEXO — Sistema de reportes y bloqueos
// Archivo: backend/src/routes/reports.js
// ================================================

const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { actualizarReputacion } = require('../services/reputationService');
const supabase = require('../config/supabase');

const MOTIVOS_VALIDOS = [
  'foto_falsa', 'spam', 'acoso', 'contenido_inapropiado',
  'menor_de_edad', 'scam', 'lenguaje_ofensivo', 'otro',
];

// ----------------------------------------
// POST /api/reports/reportar
// Reportar un usuario
// ----------------------------------------
router.post('/reportar', authenticateToken, async (req, res) => {
  try {
    const { to_user_id, motivo, descripcion } = req.body;

    if (!to_user_id || !MOTIVOS_VALIDOS.includes(motivo)) {
      return res.status(400).json({ error: 'Datos inválidos.', motivos_validos: MOTIVOS_VALIDOS });
    }

    if (to_user_id === req.user.id) {
      return res.status(400).json({ error: 'No puedes reportarte a ti mismo.' });
    }

    // Verificar si ya reportó a este usuario hoy
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const { data: reportePrevio } = await supabase
      .from('reports')
      .select('id')
      .eq('from_user_id', req.user.id)
      .eq('to_user_id', to_user_id)
      .gte('created_at', hoy.toISOString())
      .single();

    if (reportePrevio) {
      return res.status(429).json({ error: 'Ya reportaste a este usuario hoy.' });
    }

    await supabase.from('reports').insert({
      from_user_id: req.user.id,
      to_user_id,
      motivo,
      descripcion: descripcion?.substring(0, 500) || '',
      estado: 'pendiente',
      created_at: new Date().toISOString(),
    });

    // Contar reportes del usuario reportado en los últimos 7 días
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', to_user_id)
      .gte('created_at', hace7dias);

    // Auto-suspensión si hay 5+ reportes en 7 días
    if (count >= 5) {
      await supabase.from('users')
        .update({ is_banned: true, ban_reason: 'Auto-suspensión por múltiples reportes' })
        .eq('id', to_user_id);
      await actualizarReputacion(to_user_id, 'reporte_validado');
    }

    res.json({ message: 'Reporte enviado. Lo revisaremos en menos de 24 horas.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar reporte.' });
  }
});

// ----------------------------------------
// POST /api/reports/bloquear
// Bloquear un usuario
// ----------------------------------------
router.post('/bloquear', authenticateToken, async (req, res) => {
  try {
    const { to_user_id } = req.body;
    if (!to_user_id) return res.status(400).json({ error: 'Usuario requerido.' });

    // Verificar si ya está bloqueado
    const { data: bloqExiste } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', req.user.id)
      .eq('blocked_id', to_user_id)
      .single();

    if (bloqExiste) return res.json({ message: 'Ya tienes bloqueado a este usuario.' });

    // Insertar bloqueo
    await supabase.from('blocks').insert({
      blocker_id: req.user.id,
      blocked_id: to_user_id,
      created_at: new Date().toISOString(),
    });

    // Desactivar cualquier match existente
    await supabase.from('matches')
      .update({ activo: false })
      .or(`and(user1_id.eq.${req.user.id},user2_id.eq.${to_user_id}),and(user1_id.eq.${to_user_id},user2_id.eq.${req.user.id})`);

    // Penalizar reputación del bloqueado
    await actualizarReputacion(to_user_id, 'bloqueo_recibido');

    res.json({ message: 'Usuario bloqueado. Ya no verás su perfil.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al bloquear.' });
  }
});

// ----------------------------------------
// DELETE /api/reports/desbloquear/:userId
// Desbloquear un usuario
// ----------------------------------------
router.delete('/desbloquear/:userId', authenticateToken, async (req, res) => {
  await supabase.from('blocks')
    .delete()
    .eq('blocker_id', req.user.id)
    .eq('blocked_id', req.params.userId);
  res.json({ message: 'Usuario desbloqueado.' });
});

// ----------------------------------------
// GET /api/reports/bloqueados
// Ver mis usuarios bloqueados
// ----------------------------------------
router.get('/bloqueados', authenticateToken, async (req, res) => {
  const { data } = await supabase
    .from('blocks')
    .select(`
      id, created_at,
      blocked:users!blocks_blocked_id_fkey (id, nombre, profiles(fotos))
    `)
    .eq('blocker_id', req.user.id)
    .order('created_at', { ascending: false });

  res.json({ bloqueados: data || [] });
});

module.exports = router;
