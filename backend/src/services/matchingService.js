// ================================================
// NEXO - Servicio del algoritmo de compatibilidad
// Archivo: backend/src/services/matchingService.js
// ================================================

const supabase = require('../config/supabase');

// ================================================
// ALGORITMO DE COMPATIBILIDAD NEXO
// Máximo 100 puntos
// ================================================

// Calcular porcentaje de intereses en común
const calcularIntereses = (interesesA, interesesB) => {
  if (!interesesA?.length || !interesesB?.length) return 0;
  const enComun = interesesA.filter(i => interesesB.includes(i));
  const porcentaje = enComun.length / Math.max(interesesA.length, interesesB.length);
  return porcentaje; // Entre 0 y 1
};

// Calcular similitud de edad (más puntos si son más cercanos)
const calcularEdad = (edadA, edadB) => {
  const diferencia = Math.abs(edadA - edadB);
  if (diferencia <= 2) return 1;
  if (diferencia <= 5) return 0.8;
  if (diferencia <= 10) return 0.5;
  if (diferencia <= 15) return 0.2;
  return 0;
};

// Calcular puntos por distancia
const calcularDistancia = (latA, lngA, latB, lngB) => {
  if (!latA || !lngA || !latB || !lngB) return 0;

  // Fórmula de Haversine para calcular distancia entre dos puntos GPS
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((latA * Math.PI) / 180) *
    Math.cos((latB * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanciaKm = R * c;

  if (distanciaKm <= 10) return 1;
  if (distanciaKm <= 25) return 0.8;
  if (distanciaKm <= 50) return 0.6;
  if (distanciaKm <= 100) return 0.3;
  return 0.1;
};

// Calcular puntos por actividad reciente
const calcularActividad = (ultimaConexion) => {
  if (!ultimaConexion) return 0;
  const ahora = new Date();
  const conexion = new Date(ultimaConexion);
  const horasInactivo = (ahora - conexion) / (1000 * 60 * 60);

  if (horasInactivo <= 1) return 1;
  if (horasInactivo <= 6) return 0.8;
  if (horasInactivo <= 24) return 0.6;
  if (horasInactivo <= 72) return 0.3;
  return 0;
};

// ─── MEJORA 7: Filtros avanzados ─────────────────────────────────

// Calcular compatibilidad de valores (cristiano, ecológico, etc.)
const calcularValores = (valoresA = [], valoresB = []) => {
  if (!valoresA.length || !valoresB.length) return 0;
  const comunes = valoresA.filter(v => valoresB.includes(v));
  return comunes.length / Math.max(valoresA.length, valoresB.length);
};

// Verificar compatibilidad de hábitos (fumador, bebedor, etc.)
const calcularHabitos = (habitosA = [], habitosB = []) => {
  const INCOMPATIBLES = [
    ['no_fumador', 'fumador'],
    ['no_bebe', 'bebe_mucho'],
    ['vegano', 'carnivoro'],
  ];
  for (const [h1, h2] of INCOMPATIBLES) {
    if ((habitosA.includes(h1) && habitosB.includes(h2)) ||
        (habitosA.includes(h2) && habitosB.includes(h1))) return 0;
  }
  return 1;
};

// Compatibilidad de preferencia de hijos
const calcularHijos = (hijosA, hijosB) => {
  if (!hijosA || !hijosB) return 0.5;
  if (hijosA === hijosB) return 1;
  if (hijosA === 'indiferente' || hijosB === 'indiferente') return 0.7;
  return 0;
};

// ========== FUNCIÓN PRINCIPAL — MEJORADA ==========
const calcularCompatibilidad = (usuarioA, perfilA, usuarioB, perfilB) => {
  const puntos = {
    intereses: calcularIntereses(perfilA.intereses, perfilB.intereses) * 25,
    edad:      calcularEdad(usuarioA.edad, usuarioB.edad) * 15,
    distancia: calcularDistancia(perfilA.latitud, perfilA.longitud, perfilB.latitud, perfilB.longitud) * 25,
    actividad: calcularActividad(usuarioB.last_active) * 15,
    // MEJORA 7: nuevos factores
    valores:   calcularValores(perfilA.valores, perfilB.valores) * 10,
    habitos:   calcularHabitos(perfilA.habitos, perfilB.habitos) * 5,
    hijos:     calcularHijos(perfilA.preferencia_hijos, perfilB.preferencia_hijos) * 5,
  };

  const scoreTotal = Math.round(Object.values(puntos).reduce((a, b) => a + b, 0));

  return {
    score: Math.min(100, scoreTotal),
    desglose: Object.fromEntries(
      Object.entries(puntos).map(([k, v]) => [k, Math.round(v)])
    ),
    es_alto_match: scoreTotal >= 60,
  };
};

// ================================================
// OBTENER PERFILES PARA SWIPE
// Excluye: el propio usuario, bloqueados, ya vistos
// ================================================
const obtenerPerfilesParaSwipe = async (userId, limite = 20) => {
  // Obtener datos del usuario actual
  const { data: usuarioActual } = await supabase
    .from('users')
    .select('*, profiles(*)')
    .eq('id', userId)
    .single();

  if (!usuarioActual) return [];

  // IDs que ya vio (likes o dislikes en últimas 24h)
  const { data: yaVistos } = await supabase
    .from('likes')
    .select('to_user_id')
    .eq('from_user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const idsYaVistos = yaVistos?.map(l => l.to_user_id) || [];
  idsYaVistos.push(userId); // No mostrar a sí mismo

  // Obtener candidatos
  let query = supabase
    .from('users')
    .select(`
      id, nombre, edad, genero, last_active,
      profiles (bio, fotos, intereses, latitud, longitud)
    `)
    .not('id', 'in', `(${idsYaVistos.join(',')})`)
    .eq('is_banned', false)
    .eq('is_verified', true)
    .limit(limite * 3); // Traer más para filtrar y ordenar

  const { data: candidatos } = await query;
  if (!candidatos?.length) return [];

  // Calcular compatibilidad para cada candidato
  const perfilesConScore = candidatos
    .filter(c => c.profiles) // Solo los que tienen perfil completo
    .map(candidato => {
      const compatibilidad = calcularCompatibilidad(
        usuarioActual,
        usuarioActual.profiles,
        candidato,
        candidato.profiles
      );
      return { ...candidato, compatibilidad };
    });

  // Ordenar: primero los de alto match, luego por score descendente
  perfilesConScore.sort((a, b) => {
    if (b.compatibilidad.es_alto_match && !a.compatibilidad.es_alto_match) return 1;
    if (a.compatibilidad.es_alto_match && !b.compatibilidad.es_alto_match) return -1;
    return b.compatibilidad.score - a.compatibilidad.score;
  });

  return perfilesConScore.slice(0, limite);
};

// ================================================
// PROCESAR LIKE / DISLIKE
// ================================================
const procesarLike = async (fromUserId, toUserId, tipo) => {
  // Registrar el like
  const { error } = await supabase.from('likes').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    tipo, // 'like', 'superlike', 'dislike'
    created_at: new Date().toISOString()
  });

  if (error) throw new Error('Error al registrar like');

  // Si es dislike, no hay match posible
  if (tipo === 'dislike') return { es_match: false };

  // Verificar si la otra persona ya dio like
  const { data: likeRecíproco } = await supabase
    .from('likes')
    .select('id, tipo')
    .eq('from_user_id', toUserId)
    .eq('to_user_id', fromUserId)
    .in('tipo', ['like', 'superlike'])
    .single();

  if (!likeRecíproco) return { es_match: false };

  // ¡HAY MATCH! Crear el match
  // Verificar que no exista ya
  const { data: matchExistente } = await supabase
    .from('matches')
    .select('id')
    .or(`and(user1_id.eq.${fromUserId},user2_id.eq.${toUserId}),and(user1_id.eq.${toUserId},user2_id.eq.${fromUserId})`)
    .single();

  if (matchExistente) return { es_match: true, match_id: matchExistente.id, es_nuevo: false };

  // Calcular score de compatibilidad para el match
  const { data: userA } = await supabase
    .from('users')
    .select('*, profiles(*)')
    .eq('id', fromUserId)
    .single();

  const { data: userB } = await supabase
    .from('users')
    .select('*, profiles(*)')
    .eq('id', toUserId)
    .single();

  const compatibilidad = calcularCompatibilidad(
    userA, userA.profiles,
    userB, userB.profiles
  );

  const { data: nuevoMatch } = await supabase
    .from('matches')
    .insert({
      user1_id: fromUserId,
      user2_id: toUserId,
      score_compatibilidad: compatibilidad.score,
      activo: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  return {
    es_match: true,
    match_id: nuevoMatch.id,
    es_nuevo: true,
    compatibilidad,
    mensaje_rompehielo: obtenerRompehielo()
  };
};

// ================================================
// MEJORA 10: Rompehielo automático inteligente
// Genera preguntas basadas en intereses comunes
// ================================================

const ROMPEHIELOS_POR_INTERES = {
  '🎵 Música':      [
    { pregunta: '¿Concierto o festival?',         opciones: ['🎤 Concierto', '🎪 Festival'] },
    { pregunta: '¿Reggaeton o salsa?',            opciones: ['🔥 Reggaeton', '💃 Salsa'] },
    { pregunta: '¿Auriculares o altavoz?',        opciones: ['🎧 Auriculares', '🔊 Altavoz'] },
  ],
  '✈️ Viajes':      [
    { pregunta: '¿Playa o montaña?',              opciones: ['🏖 Playa', '🏔 Montaña'] },
    { pregunta: '¿Mochila o hotel 5 estrellas?',  opciones: ['🎒 Mochila', '🏨 Hotel'] },
    { pregunta: '¿Europa o Latinoamérica?',       opciones: ['🇪🇺 Europa', '🌎 LATAM'] },
  ],
  '🏋️ Gym':         [
    { pregunta: '¿Cardio o pesas?',               opciones: ['🏃 Cardio', '💪 Pesas'] },
    { pregunta: '¿Mañana o noche para entrenar?', opciones: ['🌅 Mañana', '🌙 Noche'] },
  ],
  '🎮 Videojuegos': [
    { pregunta: '¿PC o consola?',                 opciones: ['💻 PC', '🎮 Consola'] },
    { pregunta: '¿Multijugador o historia?',      opciones: ['👥 Multi', '📖 Historia'] },
  ],
  '🍕 Gastronomía': [
    { pregunta: '¿Pizza o hamburguesa?',          opciones: ['🍕 Pizza', '🍔 Hamburguesa'] },
    { pregunta: '¿Cocinar en casa o restaurante?',opciones: ['🍳 Casa', '🍽 Restaurante'] },
  ],
  '📚 Lectura':     [
    { pregunta: '¿Novela o no ficción?',          opciones: ['📖 Novela', '📰 No ficción'] },
    { pregunta: '¿Libro físico o digital?',       opciones: ['📚 Físico', '📱 Digital'] },
  ],
  '🐶 Mascotas':    [
    { pregunta: '¿Perro o gato?',                 opciones: ['🐶 Perro', '🐱 Gato'] },
    { pregunta: '¿Raza grande o pequeña?',        opciones: ['🦮 Grande', '🐩 Pequeña'] },
  ],
  '☕ Café':        [
    { pregunta: '¿Café negro o con leche?',       opciones: ['☕ Negro', '🥛 Con leche'] },
    { pregunta: '¿Café en casa o cafetería?',     opciones: ['🏠 Casa', '☕ Cafetería'] },
  ],
  '🎨 Arte':        [
    { pregunta: '¿Museo o galería moderna?',      opciones: ['🏛 Museo', '🖼 Galería'] },
    { pregunta: '¿Pintura o escultura?',          opciones: ['🎨 Pintura', '🗿 Escultura'] },
  ],
  '🏔 Montaña':     [
    { pregunta: '¿Senderismo o escalada?',        opciones: ['🥾 Senderismo', '🧗 Escalada'] },
    { pregunta: '¿Acampar o cabaña?',             opciones: ['⛺ Acampar', '🏡 Cabaña'] },
  ],
};

const ROMPEHIELOS_UNIVERSALES = [
  { pregunta: '¿Pizza o hamburguesa?',        opciones: ['🍕 Pizza', '🍔 Hamburguesa'] },
  { pregunta: '¿Netflix o cine?',             opciones: ['📺 Netflix', '🎬 Cine'] },
  { pregunta: '¿Mañana o noche?',             opciones: ['🌅 Mañana', '🌙 Noche'] },
  { pregunta: '¿Playa o montaña?',            opciones: ['🏖 Playa', '🏔 Montaña'] },
  { pregunta: '¿Café o cerveza?',             opciones: ['☕ Café', '🍺 Cerveza'] },
  { pregunta: '¿Perros o gatos?',             opciones: ['🐶 Perros', '🐱 Gatos'] },
  { pregunta: '¿Ciudad o naturaleza?',        opciones: ['🏙 Ciudad', '🌿 Naturaleza'] },
  { pregunta: '¿Espontáneo o planeado?',      opciones: ['🎲 Espontáneo', '📋 Planeado'] },
  { pregunta: '¿Viajar cerca o lejos?',       opciones: ['🗺 Cerca', '✈️ Lejos'] },
  { pregunta: '¿Música en vivo o en casa?',   opciones: ['🎤 En vivo', '🎧 En casa'] },
];

// MEJORA 10: Generar rompehielo basado en intereses comunes
const obtenerRompehielo = (interesesA = [], interesesB = []) => {
  // Buscar intereses en común
  const interesesComunes = interesesA.filter(i => interesesB.includes(i));

  // Intentar con intereses comunes primero
  for (const interes of interesesComunes) {
    const lista = ROMPEHIELOS_POR_INTERES[interes];
    if (lista?.length) {
      return lista[Math.floor(Math.random() * lista.length)];
    }
  }

  // Intentar con cualquier interés del usuario A
  for (const interes of interesesA) {
    const lista = ROMPEHIELOS_POR_INTERES[interes];
    if (lista?.length) {
      return lista[Math.floor(Math.random() * lista.length)];
    }
  }

  // Universal como fallback
  return ROMPEHIELOS_UNIVERSALES[Math.floor(Math.random() * ROMPEHIELOS_UNIVERSALES.length)];
};

module.exports = {
  calcularCompatibilidad,
  obtenerPerfilesParaSwipe,
  procesarLike,
  obtenerRompehielo
};
