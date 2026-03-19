-- ================================================
-- NEXO - Esquema completo de base de datos
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- Habilitar extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Habilitar extensión para cálculos geográficos
CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;
CREATE EXTENSION IF NOT EXISTS "cube" CASCADE;

-- ================================================
-- TABLA: users (usuarios principales)
-- ================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  edad INTEGER NOT NULL,
  genero VARCHAR(20) NOT NULL CHECK (genero IN ('hombre', 'mujer', 'no_binario', 'otro')),

  -- Estado de cuenta
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),

  -- Tokens de verificación
  verification_token VARCHAR(255),
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMP WITH TIME ZONE,

  -- Monetización
  subscription_type VARCHAR(20) DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium')),
  subscription_plan VARCHAR(20),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  coins_balance INTEGER DEFAULT 100,

  -- Actividad
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- TABLA: profiles (perfil de citas)
-- ================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  bio TEXT DEFAULT '',
  fotos JSONB DEFAULT '[]',        -- Array de URLs de fotos
  intereses JSONB DEFAULT '[]',    -- Array de strings: ['música', 'viajes']
  profesion VARCHAR(100),
  educacion VARCHAR(100),

  -- Preferencias de búsqueda
  busca_genero VARCHAR(20) DEFAULT 'todos',
  busca_edad_min INTEGER DEFAULT 18,
  busca_edad_max INTEGER DEFAULT 50,
  busca_distancia_km INTEGER DEFAULT 150,
  tipo_relacion VARCHAR(50) DEFAULT 'cualquiera',

  -- Ubicación GPS
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  ciudad VARCHAR(100),
  pais VARCHAR(100),
  ubicacion_actualizada_at TIMESTAMP WITH TIME ZONE,

  -- Boost
  boost_activo BOOLEAN DEFAULT FALSE,
  boost_expira_at TIMESTAMP WITH TIME ZONE,

  -- Estadísticas
  vistas INTEGER DEFAULT 0,
  likes_recibidos INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- TABLA: likes (swipes)
-- ================================================
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('like', 'superlike', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)  -- Un usuario solo puede votar una vez por otro
);

-- ================================================
-- TABLA: matches (conexiones mutuas)
-- ================================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score_compatibilidad INTEGER DEFAULT 0,
  origen VARCHAR(20) DEFAULT 'swipe' CHECK (origen IN ('swipe', 'entorno')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- TABLA: messages (mensajes de chat)
-- ================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagen', 'gif', 'rompehielo')),
  leido BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- TABLA: entorno_messages (mensajes sin match)
-- ================================================
CREATE TABLE entorno_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  respondido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- ================================================
-- TABLA: coin_transactions (historial de monedas)
-- ================================================
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tipo VARCHAR(20) CHECK (tipo IN ('compra', 'gasto', 'regalo', 'referido')),
  monto INTEGER NOT NULL,
  concepto VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- TABLA: subscriptions (historial de suscripciones)
-- ================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL,
  precio INTEGER NOT NULL,
  inicia_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expira_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ================================================
-- TABLA: ads (anuncios publicitarios)
-- ================================================
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(255),
  tipo VARCHAR(20) CHECK (tipo IN ('banner', 'video', 'imagen')),
  url_media TEXT,
  url_destino TEXT,
  activo BOOLEAN DEFAULT TRUE,
  impresiones INTEGER DEFAULT 0,
  clics INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- TABLA: reports (reportes de usuarios)
-- ================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  motivo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- FUNCIÓN: Buscar usuarios cercanos (Haversine SQL)
-- ================================================
CREATE OR REPLACE FUNCTION usuarios_cercanos(
  lat_usuario DECIMAL,
  lng_usuario DECIMAL,
  radio_km INTEGER,
  excluir_id UUID
)
RETURNS TABLE (
  user_id UUID,
  nombre VARCHAR,
  edad INTEGER,
  distancia_km DECIMAL,
  fotos JSONB,
  bio TEXT,
  is_online BOOLEAN,
  last_active TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.nombre,
    u.edad,
    ROUND(
      (6371 * acos(
        cos(radians(lat_usuario)) *
        cos(radians(p.latitud)) *
        cos(radians(p.longitud) - radians(lng_usuario)) +
        sin(radians(lat_usuario)) *
        sin(radians(p.latitud))
      ))::DECIMAL, 1
    ) AS distancia_km,
    p.fotos,
    p.bio,
    u.is_online,
    u.last_active
  FROM users u
  JOIN profiles p ON p.user_id = u.id
  WHERE
    u.id != excluir_id
    AND u.is_banned = FALSE
    AND p.latitud IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(lat_usuario)) *
        cos(radians(p.latitud)) *
        cos(radians(p.longitud) - radians(lng_usuario)) +
        sin(radians(lat_usuario)) *
        sin(radians(p.latitud))
      )
    ) <= radio_km
  ORDER BY distancia_km ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- ÍNDICES para mejorar el rendimiento
-- ================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_ubicacion ON profiles(latitud, longitud);
CREATE INDEX idx_likes_from_user ON likes(from_user_id);
CREATE INDEX idx_likes_to_user ON likes(to_user_id);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);

-- ================================================
-- DATOS INICIALES: Anuncio de ejemplo
-- ================================================
INSERT INTO ads (titulo, tipo, url_media, url_destino, activo)
VALUES
  ('Promo Nexo Premium', 'banner', 'https://placeholder.com/banner.jpg', 'https://nexo.app/premium', TRUE),
  ('Video Bienvenida', 'video', 'https://placeholder.com/video.mp4', 'https://nexo.app', TRUE);

-- ================================================
-- SEGURIDAD: Row Level Security (RLS)
-- Solo puedes ver TUS datos
-- ================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven sus propios datos sensibles
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid()::text = id::text);

-- Los mensajes solo los ven los participantes del match
CREATE POLICY "messages_match_participants" ON messages
  FOR SELECT USING (
    match_id IN (
      SELECT id FROM matches
      WHERE user1_id::text = auth.uid()::text
         OR user2_id::text = auth.uid()::text
    )
  );

-- ================================================
-- MEJORAS v2.0 — Tablas adicionales
-- ================================================

-- Mejora 3: Reputación y log
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reputacion INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS badge_reputacion VARCHAR(20) DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notificaciones_activas BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS reputation_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  accion     VARCHAR(50) NOT NULL,
  delta      INTEGER NOT NULL,
  reputacion_nueva INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mejora 4: Idioma en perfiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS idioma_preferido VARCHAR(10) DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS video_url        TEXT,
  ADD COLUMN IF NOT EXISTS modo_invisible   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS valores          JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS habitos          JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS preferencia_hijos VARCHAR(30);

-- Mejora 6: Eventos
CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creador_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  titulo       VARCHAR(100) NOT NULL,
  descripcion  TEXT,
  tipo         VARCHAR(50),
  ciudad       VARCHAR(100),
  latitud      DECIMAL(10,8),
  longitud     DECIMAL(11,8),
  fecha_evento TIMESTAMP WITH TIME ZONE NOT NULL,
  max_personas INTEGER DEFAULT 10,
  activo       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  estado   VARCHAR(20) DEFAULT 'pendiente',
  PRIMARY KEY (event_id, user_id)
);

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_users_online      ON users(is_online, last_active);
CREATE INDEX IF NOT EXISTS idx_users_reputacion  ON users(reputacion);
CREATE INDEX IF NOT EXISTS idx_events_fecha      ON events(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_events_ubicacion  ON events(latitud, longitud);

-- ================================================
-- v3: Correcciones + Funciones nuevas
-- ================================================

-- Problema 1: Límites y bloqueos
CREATE TABLE IF NOT EXISTS blocks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS spam_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  contenido  TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Problema 4 + Función 3: Gamificación
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS racha_dias          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_login_fecha  DATE,
  ADD COLUMN IF NOT EXISTS ban_reason          TEXT;

CREATE TABLE IF NOT EXISTS user_achievements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Función nueva 1: Videollamadas
CREATE TABLE IF NOT EXISTS videocalls (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id           UUID REFERENCES matches(id) ON DELETE CASCADE,
  iniciador_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  receptor_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  canal              VARCHAR(100) NOT NULL,
  estado             VARCHAR(20) DEFAULT 'iniciada',
  duracion_segundos  INTEGER DEFAULT 0,
  iniciada_at        TIMESTAMP WITH TIME ZONE,
  finalizada_at      TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para incrementar monedas (usada por gamificación)
CREATE OR REPLACE FUNCTION incrementar_monedas(p_user_id UUID, p_cantidad INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET coins_balance = GREATEST(0, COALESCE(coins_balance, 0) + p_cantidad)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Índices nuevos
CREATE INDEX IF NOT EXISTS idx_blocks_blocker   ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked   ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_videocalls_match  ON videocalls(match_id);
