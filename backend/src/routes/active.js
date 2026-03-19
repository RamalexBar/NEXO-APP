// ================================================
// NEXO — Mejora 2: Personas activas ahora
// Archivo: backend/src/routes/active.js
// ================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');

const UMBRAL_ACTIVO_MS = 5 * 60 * 1000; // 5 minutos

// ----------------------------------------
// GET /api/active/ahora
// Obtener usuarios activos en los últimos 5 minutos
// ----------------------------------------
router.get('/ahora', authenticateToken, async (req, res) => {
  try {
    const hace5min = new Date(Date.now() - UMBRAL_ACTIVO_MS).toISOString();
    const limite = parseInt(req.query.limite) || 20;

    // IDs que ya di like/dislike (para no mostrarlos de nuevo)
    const { data: yaVistos } = await supabase
      .from('likes')
      .select('to_user_id')
      .eq('from_user_id', req.user.id);

    const idsExcluir = [req.user.id, ...(yaVistos?.map(l => l.to_user_id) || [])];

    const { data: activos } = await supabase
      .from('users')
      .select(`
        id, nombre, edad, genero, last_active,
        profiles (fotos, bio, intereses, latitud, longitud)
      `)
      .eq('is_online', true)
      .gte('last_active', hace5min)
      .eq('is_banned', false)
      .not('id', 'in', `(${idsExcluir.join(',')})`)
      .order('last_active', { ascending: false })
      .limit(limite);

    res.json({
      activos: activos || [],
      total: activos?.length || 0,
      umbral_minutos: 5,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cargar usuarios activos.' });
  }
});

// ----------------------------------------
// GET /api/active/contador
// Cuántas personas están activas ahora (para el badge)
// ----------------------------------------
router.get('/contador', authenticateToken, async (req, res) => {
  try {
    const hace5min = new Date(Date.now() - UMBRAL_ACTIVO_MS).toISOString();
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_online', true)
      .gte('last_active', hace5min)
      .neq('id', req.user.id);

    res.json({ total_activos: count || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Error.' });
  }
});

module.exports = router;
