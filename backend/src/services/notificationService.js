// ================================================
// NEXO — Mejora 9: Notificaciones inteligentes
// Archivo: backend/src/services/notificationService.js
// ================================================

const supabase = require('../config/supabase');

// Enviar notificación push con Expo
const enviarNotificacion = async (userId, titulo, cuerpo, datos = {}) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('expo_push_token, notificaciones_activas')
      .eq('id', userId)
      .single();

    if (!user?.expo_push_token || user.notificaciones_activas === false) return;

    // En producción: usar Expo Server SDK
    if (process.env.NODE_ENV === 'production') {
      const { Expo } = require('expo-server-sdk');
      const expo = new Expo();
      if (!Expo.isExpoPushToken(user.expo_push_token)) return;

      await expo.sendPushNotificationsAsync([{
        to:    user.expo_push_token,
        title: titulo,
        body:  cuerpo,
        data:  datos,
        sound: 'default',
        badge: 1,
      }]);
    } else {
      // Desarrollo: solo log
      console.log(`📱 NOTIF [${userId}]: ${titulo} — ${cuerpo}`);
    }
  } catch (error) {
    console.error('Error notificación:', error);
  }
};

// ─── Notificaciones específicas de NEXO ──────────────────────────

const notificarNuevoMatch = async (userId, nombreOtro) => {
  await enviarNotificacion(
    userId,
    '💜 ¡Nuevo match!',
    `${nombreOtro} también te dio like. ¡Empieza la conversación!`,
    { tipo: 'match' }
  );
};

const notificarNuevoMensaje = async (userId, nombreRemitente, preview) => {
  await enviarNotificacion(
    userId,
    `💬 ${nombreRemitente}`,
    preview.substring(0, 80),
    { tipo: 'mensaje' }
  );
};

const notificarPersonasCercanas = async (userId, cantidad) => {
  if (cantidad < 3) return;
  await enviarNotificacion(
    userId,
    '🔥 Personas cerca de ti',
    `${cantidad} personas nuevas están a menos de 10 km de ti ahora`,
    { tipo: 'entorno' }
  );
};

const notificarInactividad = async (userId) => {
  await enviarNotificacion(
    userId,
    '✨ Te están buscando en NEXO',
    'Nuevas personas cerca de ti te esperan. ¡Entra ahora!',
    { tipo: 'inactividad' }
  );
};

const notificarLike = async (userId) => {
  await enviarNotificacion(
    userId,
    '❤️ Alguien te dio like',
    'Alguien está interesado en tu perfil. ¿Lo reconoces?',
    { tipo: 'like' }
  );
};

const notificarEventoCercano = async (userId, tituloEvento, ciudad) => {
  await enviarNotificacion(
    userId,
    '👥 Evento cercano',
    `"${tituloEvento}" en ${ciudad}. ¡Únete!`,
    { tipo: 'evento' }
  );
};

// ─── Cron jobs de notificaciones ─────────────────────────────────
// Llamar desde index.js con setInterval o node-cron

const iniciarCronNotificaciones = () => {
  // Notificar inactivos cada día a las 18:00
  const ahoraMS = Date.now();
  const manana18h = new Date();
  manana18h.setHours(18, 0, 0, 0);
  if (manana18h < new Date()) manana18h.setDate(manana18h.getDate() + 1);
  const msHasta18h = manana18h - ahoraMS;

  setTimeout(async () => {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: inactivos } = await supabase
      .from('users')
      .select('id')
      .lt('last_active', hace24h)
      .eq('is_banned', false)
      .limit(500);

    for (const u of inactivos || []) {
      await notificarInactividad(u.id);
    }

    // Repetir cada 24 horas
    setInterval(async () => {
      const hace24h2 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: inactivos2 } = await supabase
        .from('users').select('id').lt('last_active', hace24h2).eq('is_banned', false).limit(500);
      for (const u of inactivos2 || []) await notificarInactividad(u.id);
    }, 24 * 60 * 60 * 1000);

  }, msHasta18h);

  console.log('⏰ Cron de notificaciones iniciado');
};

module.exports = {
  enviarNotificacion,
  notificarNuevoMatch,
  notificarNuevoMensaje,
  notificarPersonasCercanas,
  notificarInactividad,
  notificarLike,
  notificarEventoCercano,
  iniciarCronNotificaciones,
};
