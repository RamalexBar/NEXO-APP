// ================================================
// NEXO — Mejora 5: Video perfil de 10 segundos
// Archivo: backend/src/routes/video.js
// ================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');

const upload = multer({
  storage: multer.diskStorage({
    destination: '/tmp',
    filename: (req, file, cb) => cb(null, `video_${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo entrada
  fileFilter: (req, file, cb) => {
    const tipos = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    cb(null, tipos.includes(file.mimetype));
  },
});

// ─── Comprimir video con FFmpeg ───────────────────────────────────
const procesarVideo = (inputPath, userId) => {
  return new Promise((resolve, reject) => {
    // Verificar si ffmpeg está disponible
    const { execSync } = require('child_process');
    try { execSync('which ffmpeg'); } catch {
      // Sin FFmpeg: solo copiar el archivo
      const outputPath = `/tmp/video_out_${userId}_${Date.now()}.mp4`;
      fs.copyFileSync(inputPath, outputPath);
      return resolve(outputPath);
    }

    const ffmpeg = require('fluent-ffmpeg');
    const outputPath = `/tmp/video_out_${userId}_${Date.now()}.mp4`;
    ffmpeg(inputPath)
      .setDuration(10)
      .videoCodec('libx264')
      .size('480x?')
      .videoBitrate('500k')
      .outputOptions(['-movflags faststart', '-profile:v baseline', '-pix_fmt yuv420p'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
};

// ----------------------------------------
// POST /api/video/subir
// Subir y procesar video de perfil
// ----------------------------------------
router.post('/subir', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Se requiere un video.' });

    const outputPath = await procesarVideo(req.file.path, req.user.id);
    const videoBuffer = fs.readFileSync(outputPath);

    // Subir a Supabase Storage
    const nombreArchivo = `videos/${req.user.id}/perfil_${Date.now()}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || 'nexo-photos')
      .upload(nombreArchivo, videoBuffer, { contentType: 'video/mp4', upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || 'nexo-photos')
      .getPublicUrl(nombreArchivo);

    // Guardar URL en el perfil
    await supabase
      .from('profiles')
      .update({ video_url: publicUrl })
      .eq('user_id', req.user.id);

    // Limpiar archivos temporales
    fs.unlinkSync(req.file.path);
    fs.unlinkSync(outputPath);

    res.json({ message: '¡Video subido!', video_url: publicUrl });
  } catch (error) {
    console.error('Error en video:', error);
    res.status(500).json({ error: 'Error al procesar el video.' });
  }
});

// ----------------------------------------
// DELETE /api/video/eliminar
// Eliminar video de perfil
// ----------------------------------------
router.delete('/eliminar', authenticateToken, async (req, res) => {
  await supabase
    .from('profiles')
    .update({ video_url: null })
    .eq('user_id', req.user.id);
  res.json({ message: 'Video eliminado.' });
});

module.exports = router;
