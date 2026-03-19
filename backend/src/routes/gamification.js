// ================================================
// NEXO — Rutas de gamificación, logros y ranking
// Archivo: backend/src/routes/gamification.js
// ================================================

const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  verificarLogros, actualizarRacha,
  obtenerRankingPopular, LOGROS,
} = require('../services/gamificationService');
const supabase = require('../config/supabase');

// ----------------------------------------
// GET /api/gamification/mis-logros
// Ver mis logros obtenidos y pendientes
// ----------------------------------------
router.get('/mis-logros', authenticateToken, async (req, res) => {
  try {
    const { data: obtenidos } = await supabase
      .from('user_achievements')
      .select('achievement_id, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    const idsObtenidos = new Set(obtenidos?.map(a => a.achievement_id) || []);

    const todos = Object.values(LOGROS).map(logro => ({
      ...logro,
      obtenido: idsObtenidos.has(logro.id),
      fecha_obtenido: obtenidos?.find(a => a.achievement_id === logro.id)?.created_at || null,
    }));

    const { data: user } = await supabase
      .from('users').select('racha_dias, reputacion, badge_reputacion').eq('id', req.user.id).single();

    res.json({
      logros: todos,
      obtenidos_total: idsObtenidos.size,
      total_posibles: Object.keys(LOGROS).length,
      racha_dias: user?.racha_dias || 0,
      reputacion: user?.reputacion || 50,
      badge: user?.badge_reputacion || 'normal',
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar logros.' });
  }
});

// ----------------------------------------
// POST /api/gamification/login-diario
// Registrar login del día y actualizar racha
// ----------------------------------------
router.post('/login-diario', authenticateToken, async (req, res) => {
  try {
    const nuevaRacha = await actualizarRacha(req.user.id);
    const logrosNuevos = await verificarLogros(req.user.id, 'login_diario');

    res.json({
      racha_dias: nuevaRacha,
      logros_nuevos: logrosNuevos,
      monedas_ganadas: logrosNuevos.reduce((sum, l) => sum + l.monedas, 0),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error.' });
  }
});

// ----------------------------------------
// GET /api/gamification/ranking
// Top perfiles más populares de la semana
// ----------------------------------------
router.get('/ranking', authenticateToken, async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 20;
    const ranking = await obtenerRankingPopular(limite);

    res.json({
      ranking,
      semana: new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar ranking.' });
  }
});

module.exports = router;
