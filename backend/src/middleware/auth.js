// ================================================
// NEXO - Middleware de autenticación JWT
// Archivo: backend/src/middleware/auth.js
// ================================================

const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// Verificar token JWT en cada petición protegida
const authenticateToken = async (req, res, next) => {
  try {
    // El token viene en el header: "Authorization: Bearer <token>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario en la base de datos
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_verified, is_banned, subscription_type')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' });
    }

    // Adjuntar usuario al request para usarlo en las rutas
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Inicia sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

// Verificar que el usuario tenga suscripción premium
const requirePremium = (req, res, next) => {
  if (req.user.subscription_type === 'free') {
    return res.status(403).json({
      error: 'Esta función requiere Nexo Premium.',
      upgrade_url: '/api/monetization/plans'
    });
  }
  next();
};

// Verificar que sea administrador
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores.' });
  }
  next();
};

module.exports = { authenticateToken, requirePremium, requireAdmin };
