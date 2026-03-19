// ================================================
// NEXO — Mejora 8: Modo invisible (Premium)
// Archivo: backend/src/routes/invisible.js
// ================================================

const express = require('express');
const router = express.Router();
const { authenticateToken, requirePremium } = require('../middleware/auth');
const supabase = require('../config/supabase');

// ----------------------------------------
// POST /api/invisible/activar
// Activar modo invisible (solo premium)
// ----------------------------------------
router.post('/activar', authenticateToken, requirePremium, async (req, res) => {
  await supabase
    .from('profiles')
    .update({ modo_invisible: true })
    .eq('user_id', req.user.id);

  res.json({
    message: 'Modo invisible activado. Puedes explorar sin aparecer en el feed.',
    modo_invisible: true,
  });
});

// ----------------------------------------
// POST /api/invisible/desactivar
// Desactivar modo invisible
// ----------------------------------------
router.post('/desactivar', authenticateToken, async (req, res) => {
  await supabase
    .from('profiles')
    .update({ modo_invisible: false })
    .eq('user_id', req.user.id);

  res.json({ message: 'Modo invisible desactivado. Ya apareces en el feed.', modo_invisible: false });
});

// ----------------------------------------
// GET /api/invisible/estado
// Consultar si tengo el modo activo
// ----------------------------------------
router.get('/estado', authenticateToken, async (req, res) => {
  const { data } = await supabase
    .from('profiles')
    .select('modo_invisible')
    .eq('user_id', req.user.id)
    .single();

  res.json({ modo_invisible: data?.modo_invisible || false });
});

module.exports = router;
