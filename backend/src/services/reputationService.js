// ================================================
// NEXO — Mejora 3: Sistema de reputación
// Archivo: backend/src/services/reputationService.js
// ================================================

const supabase = require('../config/supabase');

// Puntos por cada acción
const PUNTOS = {
  match_completado:    +15,
  conversacion_larga:  +10,
  perfil_verificado:   +20,
  reporte_validado:    -30,
  bloqueo_recibido:    -50,
  primer_mensaje:      +5,
  perfil_completo:     +10,
};

// Calcular badge según puntaje
const calcularBadge = (puntos) => {
  if (puntos >= 80) return 'oro';
  if (puntos >= 60) return 'plata';
  if (puntos < 30)  return 'advertencia';
  return 'normal';
};

// ─── Actualizar reputación de un usuario ────────────────────────
const actualizarReputacion = async (userId, accion) => {
  const delta = PUNTOS[accion];
  if (delta === undefined) return;

  const { data: user } = await supabase
    .from('users')
    .select('reputacion')
    .eq('id', userId)
    .single();

  const actual = user?.reputacion ?? 50;
  const nueva = Math.max(0, Math.min(100, actual + delta));
  const badge = calcularBadge(nueva);

  await supabase
    .from('users')
    .update({ reputacion: nueva, badge_reputacion: badge })
    .eq('id', userId);

  // Registrar en historial
  await supabase.from('reputation_log').insert({
    user_id: userId,
    accion,
    delta,
    reputacion_nueva: nueva,
    created_at: new Date().toISOString(),
  });

  return { reputacion: nueva, badge };
};

// ─── Obtener reputación de un usuario ───────────────────────────
const obtenerReputacion = async (userId) => {
  const { data: user } = await supabase
    .from('users')
    .select('reputacion, badge_reputacion')
    .eq('id', userId)
    .single();

  return {
    puntos: user?.reputacion ?? 50,
    badge: user?.badge_reputacion ?? 'normal',
  };
};

module.exports = { actualizarReputacion, obtenerReputacion, PUNTOS };
