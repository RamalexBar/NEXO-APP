// ================================================
// NEXO - Controlador de autenticación
// Archivo: backend/src/controllers/authController.js
// ================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const supabase = require('../config/supabase');

// Función auxiliar para generar JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Calcular edad desde fecha de nacimiento
const calcularEdad = (fechaNacimiento) => {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

// ================================================
// REGISTRO
// ================================================
const register = async (req, res) => {
  try {
    // Validar los datos del formulario
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, nombre, fecha_nacimiento, genero } = req.body;

    // Verificar edad mínima (18 años)
    const edad = calcularEdad(fecha_nacimiento);
    if (edad < 18) {
      return res.status(400).json({ error: 'Debes tener al menos 18 años para registrarte.' });
    }

    // Verificar si el email ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este correo.' });
    }

    // Encriptar contraseña (12 rondas = muy seguro)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Token para verificar email
    const verificationToken = uuidv4();

    // Crear usuario en la base de datos
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        nombre,
        fecha_nacimiento,
        genero,
        edad,
        verification_token: verificationToken,
        is_verified: false,
        subscription_type: 'free',
        coins_balance: 100, // Monedas de bienvenida
        created_at: new Date().toISOString()
      })
      .select('id, email, nombre, edad, genero, subscription_type, coins_balance')
      .single();

    if (error) {
      console.error('Error creando usuario:', error);
      return res.status(500).json({ error: 'Error al crear la cuenta.' });
    }

    // Crear perfil vacío para el usuario
    await supabase.from('profiles').insert({
      user_id: newUser.id,
      bio: '',
      fotos: [],
      intereses: [],
      latitud: null,
      longitud: null,
    });

    // Generar token de acceso
    const token = generateToken(newUser.id);

    res.status(201).json({
      message: '¡Cuenta creada exitosamente! Revisa tu correo para verificar tu cuenta.',
      token,
      user: newUser,
      coins_regalo: 100
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// ================================================
// LOGIN
// ================================================
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario por email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    // Verificar si está baneado
    if (user.is_banned) {
      return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Contacta soporte.' });
    }

    // Actualizar última conexión
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', user.id);

    // Generar token
    const token = generateToken(user.id);

    res.json({
      message: '¡Bienvenido de vuelta!',
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        edad: user.edad,
        genero: user.genero,
        subscription_type: user.subscription_type,
        coins_balance: user.coins_balance,
        is_verified: user.is_verified,
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// ================================================
// OBTENER MI PERFIL
// ================================================
const getMe = async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select(`
        id, email, nombre, edad, genero,
        subscription_type, coins_balance,
        is_verified, created_at,
        profiles (
          bio, fotos, intereses,
          latitud, longitud
        )
      `)
      .eq('id', req.user.id)
      .single();

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil.' });
  }
};

// ================================================
// LOGOUT
// ================================================
const logout = async (req, res) => {
  // En JWT stateless el logout se maneja en el cliente
  // borrando el token. Aquí podemos registrar la actividad.
  await supabase
    .from('users')
    .update({ last_active: new Date().toISOString() })
    .eq('id', req.user.id);

  res.json({ message: 'Sesión cerrada exitosamente.' });
};

// ================================================
// VERIFICAR EMAIL
// ================================================
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, is_verified')
      .eq('verification_token', token)
      .single();

    if (error || !user) {
      return res.status(400).json({ error: 'Token de verificación inválido o expirado.' });
    }

    if (user.is_verified) {
      return res.json({ message: 'Tu correo ya estaba verificado.' });
    }

    await supabase
      .from('users')
      .update({ is_verified: true, verification_token: null })
      .eq('id', user.id);

    res.json({ message: '¡Correo verificado exitosamente! Ya puedes usar todas las funciones.' });

  } catch (error) {
    res.status(500).json({ error: 'Error al verificar correo.' });
  }
};

// ================================================
// RECUPERAR CONTRASEÑA
// ================================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id, nombre')
      .eq('email', email)
      .single();

    // Siempre responder igual por seguridad (no revelar si existe el email)
    const message = 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.';

    if (!user) return res.json({ message });

    // Generar token de reset
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hora

    await supabase
      .from('users')
      .update({
        reset_password_token: resetToken,
        reset_password_expires: resetExpires.toISOString()
      })
      .eq('id', user.id);

    // TODO: Enviar email con el enlace de reset
    // emailService.sendPasswordReset(email, resetToken);
    console.log(`Reset token para ${email}: ${resetToken}`);

    res.json({ message });

  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
};

// ================================================
// RESTABLECER CONTRASEÑA
// ================================================
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id, reset_password_expires')
      .eq('reset_password_token', token)
      .single();

    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado.' });
    }

    if (new Date(user.reset_password_expires) < new Date()) {
      return res.status(400).json({ error: 'El token ha expirado. Solicita uno nuevo.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        reset_password_token: null,
        reset_password_expires: null
      })
      .eq('id', user.id);

    res.json({ message: 'Contraseña restablecida exitosamente.' });

  } catch (error) {
    res.status(500).json({ error: 'Error al restablecer contraseña.' });
  }
};

// ================================================
// CAMBIAR CONTRASEÑA
// ================================================
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', req.user.id);

    res.json({ message: 'Contraseña actualizada exitosamente.' });

  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contraseña.' });
  }
};

// ================================================
// ELIMINAR CUENTA
// ================================================
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Eliminar en cascada (perfil, likes, matches, mensajes)
    await supabase.from('messages').delete().eq('sender_id', userId);
    await supabase.from('likes').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    await supabase.from('matches').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
    await supabase.from('profiles').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);

    res.json({ message: 'Cuenta eliminada permanentemente.' });

  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cuenta.' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount
};
