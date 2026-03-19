// ================================================
// NEXO - Rutas de autenticación
// Archivo: backend/src/routes/auth.js
// ================================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Validaciones reutilizables
const registerValidation = [
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres')
    .matches(/\d/).withMessage('La contraseña debe tener al menos un número'),
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Nombre entre 2 y 50 caracteres'),
  body('fecha_nacimiento')
    .isDate().withMessage('Fecha de nacimiento inválida'),
  body('genero')
    .isIn(['hombre', 'mujer', 'no_binario', 'otro']).withMessage('Género inválido'),
];

// ----------------------------------------
// POST /api/auth/register
// Crear nueva cuenta
// ----------------------------------------
router.post('/register', registerValidation, authController.register);

// ----------------------------------------
// POST /api/auth/login
// Iniciar sesión
// ----------------------------------------
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], authController.login);

// ----------------------------------------
// POST /api/auth/logout
// Cerrar sesión
// ----------------------------------------
router.post('/logout', authenticateToken, authController.logout);

// ----------------------------------------
// GET /api/auth/me
// Obtener mi información actual
// ----------------------------------------
router.get('/me', authenticateToken, authController.getMe);

// ----------------------------------------
// POST /api/auth/verify-email/:token
// Verificar correo electrónico
// ----------------------------------------
router.post('/verify-email/:token', authController.verifyEmail);

// ----------------------------------------
// POST /api/auth/forgot-password
// Solicitar recuperación de contraseña
// ----------------------------------------
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], authController.forgotPassword);

// ----------------------------------------
// POST /api/auth/reset-password
// Restablecer contraseña con token
// ----------------------------------------
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
], authController.resetPassword);

// ----------------------------------------
// PUT /api/auth/change-password
// Cambiar contraseña (usuario autenticado)
// ----------------------------------------
router.put('/change-password', authenticateToken, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 6 }),
], authController.changePassword);

// ----------------------------------------
// DELETE /api/auth/delete-account
// Eliminar cuenta permanentemente
// ----------------------------------------
router.delete('/delete-account', authenticateToken, authController.deleteAccount);

module.exports = router;
