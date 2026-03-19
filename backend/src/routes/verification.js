// ================================================
// NEXO — Mejora 1: Rutas de verificación de identidad
// Archivo: backend/src/routes/verification.js
// ================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const {
  verificarSelfie,
  obtenerFotoPerfilBase64,
  marcarVerificado,
} = require('../services/verificationService');
const supabase = require('../config/supabase');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ----------------------------------------
// POST /api/verification/selfie
// Enviar selfie para verificar identidad
// ----------------------------------------
router.post('/selfie', authenticateToken, upload.single('selfie'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Se requiere una selfie.' });
    }

    // Verificar que el usuario tiene foto de perfil
    const fotoPerfilBase64 = await obtenerFotoPerfilBase64(req.user.id);
    if (!fotoPerfilBase64) {
      return res.status(400).json({
        error: 'Debes subir al menos una foto de perfil antes de verificarte.',
      });
    }

    const selfieBase64 = req.file.buffer.toString('base64');
    const resultado = await verificarSelfie(selfieBase64, fotoPerfilBase64);

    if (resultado.aprobado) {
      await marcarVerificado(req.user.id);
      return res.json({
        aprobado: true,
        confianza: resultado.confianza,
        mensaje: '¡Perfil verificado! Ahora tienes el sello de confianza.',
      });
    }

    return res.json({
      aprobado: false,
      confianza: resultado.confianza,
      mensaje: 'No pudimos verificar tu identidad. Asegúrate de que tu selfie sea clara y bien iluminada.',
    });

  } catch (error) {
    console.error('Error en verificación:', error);
    res.status(500).json({ error: 'Error al procesar la verificación.' });
  }
});

// ----------------------------------------
// GET /api/verification/estado
// Consultar mi estado de verificación
// ----------------------------------------
router.get('/estado', authenticateToken, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('is_verified, verified_at')
    .eq('id', req.user.id)
    .single();

  res.json({ verificado: user.is_verified, fecha: user.verified_at });
});

module.exports = router;
