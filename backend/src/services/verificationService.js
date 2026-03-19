// ================================================
// NEXO — Mejora 1: Servicio de verificación de identidad
// Compara selfie en vivo con foto del perfil usando IA
// ================================================

const supabase = require('../config/supabase');

// Umbral mínimo de similitud facial (85%)
const UMBRAL_SIMILITUD = 85;

// ─── Verificar selfie con AWS Rekognition ────────────────────────
// En producción: npm install aws-sdk y configurar credenciales
// En desarrollo: usamos simulación para no requerir cuenta AWS
const verificarSelfie = async (selfieBase64, fotoPerfilBase64) => {
  // MODO DESARROLLO: simular verificación exitosa
  if (process.env.NODE_ENV !== 'production') {
    const similitudSimulada = 88 + Math.random() * 10;
    return {
      aprobado: similitudSimulada >= UMBRAL_SIMILITUD,
      confianza: Math.round(similitudSimulada),
      modo: 'simulacion',
    };
  }

  // MODO PRODUCCIÓN: AWS Rekognition real
  const AWS = require('aws-sdk');
  const rekognition = new AWS.Rekognition({ region: process.env.AWS_REGION || 'us-east-1' });

  const resultado = await rekognition.compareFaces({
    SourceImage: { Bytes: Buffer.from(selfieBase64, 'base64') },
    TargetImage: { Bytes: Buffer.from(fotoPerfilBase64, 'base64') },
    SimilarityThreshold: UMBRAL_SIMILITUD,
  }).promise();

  const aprobado = resultado.FaceMatches.length > 0;
  return {
    aprobado,
    confianza: Math.round(resultado.FaceMatches[0]?.Similarity || 0),
    modo: 'rekognition',
  };
};

// ─── Obtener foto principal del perfil en base64 ─────────────────
const obtenerFotoPerfilBase64 = async (userId) => {
  const { data: perfil } = await supabase
    .from('profiles')
    .select('fotos')
    .eq('user_id', userId)
    .single();

  if (!perfil?.fotos?.[0]) return null;

  // Descargar foto desde URL de Supabase Storage
  const response = await fetch(perfil.fotos[0]);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
};

// ─── Marcar usuario como verificado ─────────────────────────────
const marcarVerificado = async (userId) => {
  await supabase
    .from('users')
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Dar puntos de reputación por verificarse
  const { actualizarReputacion } = require('./reputationService');
  await actualizarReputacion(userId, 'perfil_verificado');
};

module.exports = { verificarSelfie, obtenerFotoPerfilBase64, marcarVerificado };
