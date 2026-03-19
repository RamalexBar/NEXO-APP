// ================================================
// NEXO — Mejora 4: Servicio de traducción automática
// Archivo: backend/src/services/translationService.js
// ================================================

// En producción: npm install @google-cloud/translate
// En desarrollo: simula traducciones para no gastar créditos

const IDIOMAS_SOPORTADOS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh'];

// ─── Detectar idioma de un texto ─────────────────────────────────
const detectarIdioma = async (texto) => {
  if (process.env.GOOGLE_TRANSLATE_KEY && process.env.NODE_ENV === 'production') {
    const { Translate } = require('@google-cloud/translate').v2;
    const translate = new Translate({ key: process.env.GOOGLE_TRANSLATE_KEY });
    const [, meta] = await translate.translate(texto, 'es');
    return meta.data.translations[0].detectedSourceLanguage;
  }
  // En desarrollo: asumir español
  return 'es';
};

// ─── Traducir un mensaje ─────────────────────────────────────────
const traducirMensaje = async (texto, idiomaDestino, idiomaOrigen = null) => {
  if (!texto?.trim()) return { texto_original: texto, texto_traducido: texto, traducido: false };

  // Si mismo idioma: no traducir
  if (idiomaOrigen === idiomaDestino) {
    return { texto_original: texto, texto_traducido: texto, traducido: false };
  }

  // Producción: Google Translate real
  if (process.env.GOOGLE_TRANSLATE_KEY && process.env.NODE_ENV === 'production') {
    const { Translate } = require('@google-cloud/translate').v2;
    const translate = new Translate({ key: process.env.GOOGLE_TRANSLATE_KEY });
    const [traduccion, meta] = await translate.translate(texto, idiomaDestino);
    return {
      texto_original: texto,
      texto_traducido: traduccion,
      idioma_origen: meta.data.translations[0].detectedSourceLanguage,
      idioma_destino: idiomaDestino,
      traducido: true,
    };
  }

  // Desarrollo: devolver texto original con nota
  return {
    texto_original: texto,
    texto_traducido: texto,
    traducido: false,
    nota: 'Traducción desactivada en modo desarrollo',
  };
};

// ─── Obtener idioma preferido de un usuario ──────────────────────
const obtenerIdiomaUsuario = async (userId) => {
  const supabase = require('../config/supabase');
  const { data } = await supabase
    .from('profiles')
    .select('idioma_preferido')
    .eq('user_id', userId)
    .single();
  return data?.idioma_preferido || 'es';
};

module.exports = { traducirMensaje, detectarIdioma, obtenerIdiomaUsuario };
