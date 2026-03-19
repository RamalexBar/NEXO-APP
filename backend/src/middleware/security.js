// ================================================
// NEXO — Seguridad: anti-spam, límites y bloqueos
// Archivo: backend/src/middleware/security.js
// ================================================

const supabase = require('../config/supabase');

// ── Límite de mensajes por hora ──────────────────────────────────
// Free: 50 mensajes/hora | Premium: ilimitado
const LIMITE_MENSAJES_HORA = { free: 50, premium: 9999 };

const verificarLimiteMensajes = async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('subscription_type')
      .eq('id', req.user.id)
      .single();

    if (user?.subscription_type === 'premium') return next();

    const hace1hora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', req.user.id)
      .gte('sent_at', hace1hora);

    const limite = LIMITE_MENSAJES_HORA[user?.subscription_type || 'free'];
    if (count >= limite) {
      return res.status(429).json({
        error: `Límite de ${limite} mensajes por hora alcanzado.`,
        limite_hora: limite,
        mensajes_enviados: count,
        upgrade_url: '/api/monetization/plans',
      });
    }
    next();
  } catch (e) {
    next(); // Si falla el check, dejar pasar
  }
};

// ── Detección de spam ────────────────────────────────────────────
// Si el mismo texto se envía 3+ veces seguidas = spam
const detectarSpam = async (userId, contenido) => {
  const hace5min = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recientes } = await supabase
    .from('messages')
    .select('contenido')
    .eq('sender_id', userId)
    .gte('sent_at', hace5min)
    .order('sent_at', { ascending: false })
    .limit(5);

  if (!recientes?.length) return false;

  const repetidos = recientes.filter(m =>
    m.contenido?.toLowerCase().trim() === contenido?.toLowerCase().trim()
  );

  // 3+ mensajes idénticos en 5 min = spam
  if (repetidos.length >= 3) {
    await supabase.from('spam_log').insert({
      user_id: userId,
      contenido: contenido.substring(0, 200),
      created_at: new Date().toISOString(),
    });
    return true;
  }

  // Links sospechosos
  const patronLinks = /(https?:\/\/|bit\.ly|tinyurl|wa\.me|t\.me)/i;
  const primerMensaje = recientes.length === 0; // Primer mensaje entre estos dos
  if (patronLinks.test(contenido) && primerMensaje) return true;

  return false;
};

// ── Verificar si un usuario está bloqueado ───────────────────────
const estaBlockeado = async (fromUserId, toUserId) => {
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${fromUserId},blocked_id.eq.${toUserId}),` +
      `and(blocker_id.eq.${toUserId},blocked_id.eq.${fromUserId})`
    )
    .limit(1);
  return (data?.length || 0) > 0;
};

module.exports = { verificarLimiteMensajes, detectarSpam, estaBlockeado };
