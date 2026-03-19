// ================================================
// NEXO — Gamificación: logros y rachas de conexión
// Archivo: backend/src/services/gamificationService.js
// ================================================

const supabase = require('../config/supabase');

// ── Definición de todos los logros ───────────────────────────────
const LOGROS = {
  primer_match:       { id: 'primer_match',       emoji: '💘', titulo: 'Primer Match',        descripcion: 'Conseguiste tu primer match',                     monedas: 50  },
  explorador:         { id: 'explorador',          emoji: '🗺️', titulo: 'Explorador',          descripcion: 'Usaste la función Entorno por primera vez',       monedas: 20  },
  conversador:        { id: 'conversador',         emoji: '💬', titulo: 'Conversador',         descripcion: 'Enviaste 100 mensajes en total',                  monedas: 30  },
  popular:            { id: 'popular',             emoji: '🌟', titulo: 'Popular',             descripcion: 'Recibiste 50 likes en tu perfil',                 monedas: 75  },
  verificado:         { id: 'verificado',          emoji: '✅', titulo: 'Identidad verificada','descripcion': 'Verificaste tu perfil con selfie',              monedas: 100 },
  perfil_completo:    { id: 'perfil_completo',     emoji: '📝', titulo: 'Perfil completo',     descripcion: 'Llenaste toda la información de tu perfil',       monedas: 40  },
  semana_activo:      { id: 'semana_activo',       emoji: '🔥', titulo: 'Semana de fuego',     descripcion: 'Conectaste 7 días seguidos',                      monedas: 100 },
  mes_activo:         { id: 'mes_activo',          emoji: '🏆', titulo: 'Imparable',           descripcion: 'Conectaste 30 días seguidos',                     monedas: 500 },
  primer_videollamada:{ id: 'primer_videollamada', emoji: '📹', titulo: 'Cara a cara',         descripcion: 'Hiciste tu primera videollamada',                 monedas: 60  },
  organizador:        { id: 'organizador',         emoji: '🎉', titulo: 'Organizador',         descripcion: 'Creaste tu primer evento',                        monedas: 50  },
  cinco_matches:      { id: 'cinco_matches',       emoji: '💫', titulo: '5 Matches',           descripcion: 'Conseguiste 5 matches',                           monedas: 80  },
  diez_matches:       { id: 'diez_matches',        emoji: '✨', titulo: '10 Matches',          descripcion: 'Conseguiste 10 matches',                          monedas: 150 },
};

// ── Verificar y otorgar logros ────────────────────────────────────
const verificarLogros = async (userId, evento) => {
  const logrosOtorgados = [];

  // Obtener logros ya obtenidos
  const { data: yaObtenidos } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);
  const idsObtenidos = new Set(yaObtenidos?.map(a => a.achievement_id) || []);

  // Función para otorgar un logro
  const otorgar = async (logroId) => {
    if (idsObtenidos.has(logroId)) return;
    const logro = LOGROS[logroId];
    if (!logro) return;

    await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_id: logroId,
      created_at: new Date().toISOString(),
    });

    // Dar monedas de recompensa
    await supabase.rpc('incrementar_monedas', { p_user_id: userId, p_cantidad: logro.monedas });
    logrosOtorgados.push(logro);
  };

  // Verificar según el evento
  switch (evento) {
    case 'nuevo_match': {
      const { count } = await supabase
        .from('matches').select('id', { count: 'exact', head: true })
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      if (count >= 1)  await otorgar('primer_match');
      if (count >= 5)  await otorgar('cinco_matches');
      if (count >= 10) await otorgar('diez_matches');
      break;
    }
    case 'perfil_verificado':
      await otorgar('verificado');
      break;
    case 'primer_videollamada':
      await otorgar('primer_videollamada');
      break;
    case 'evento_creado':
      await otorgar('organizador');
      break;
    case 'mensaje_enviado': {
      const { count } = await supabase
        .from('messages').select('id', { count: 'exact', head: true })
        .eq('sender_id', userId);
      if (count >= 100) await otorgar('conversador');
      break;
    }
    case 'login_diario':
      await actualizarRacha(userId);
      break;
  }

  return logrosOtorgados;
};

// ── Actualizar racha de conexión ──────────────────────────────────
const actualizarRacha = async (userId) => {
  const { data: user } = await supabase
    .from('users')
    .select('racha_dias, ultimo_login_fecha')
    .eq('id', userId)
    .single();

  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const ayer  = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const ultimo = user?.ultimo_login_fecha ? new Date(user.ultimo_login_fecha) : null;

  let nuevaRacha = 1;
  if (ultimo) {
    ultimo.setHours(0,0,0,0);
    if (ultimo.getTime() === ayer.getTime()) {
      // Conectó ayer → continúa la racha
      nuevaRacha = (user.racha_dias || 1) + 1;
    } else if (ultimo.getTime() === hoy.getTime()) {
      // Ya conectó hoy → no cambia
      return user.racha_dias;
    }
    // Si hay más de un día sin conectar → racha vuelve a 1
  }

  await supabase.from('users')
    .update({ racha_dias: nuevaRacha, ultimo_login_fecha: hoy.toISOString() })
    .eq('id', userId);

  // Logros por racha
  if (nuevaRacha >= 7)  await verificarLogros(userId, 'racha_semana').catch(() => {});
  if (nuevaRacha >= 30) await verificarLogros(userId, 'racha_mes').catch(() => {});

  return nuevaRacha;
};

// ── Ranking de perfiles populares ────────────────────────────────
const obtenerRankingPopular = async (limite = 20) => {
  // Perfiles con más likes en los últimos 7 días
  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('likes')
    .select('to_user_id')
    .in('tipo', ['like', 'superlike'])
    .gte('created_at', hace7dias);

  if (!data?.length) return [];

  // Contar likes por usuario
  const conteo = {};
  for (const like of data) {
    conteo[like.to_user_id] = (conteo[like.to_user_id] || 0) + 1;
  }

  // Ordenar y tomar los top N
  const topIds = Object.entries(conteo)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limite)
    .map(([id]) => id);

  if (!topIds.length) return [];

  const { data: usuarios } = await supabase
    .from('users')
    .select('id, nombre, edad, reputacion, badge_reputacion, profiles(fotos, bio, intereses)')
    .in('id', topIds)
    .eq('is_banned', false);

  // Ordenar según el ranking calculado
  return (usuarios || [])
    .map(u => ({ ...u, likes_semana: conteo[u.id] || 0 }))
    .sort((a, b) => b.likes_semana - a.likes_semana);
};

module.exports = { verificarLogros, actualizarRacha, obtenerRankingPopular, LOGROS };
