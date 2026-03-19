// ================================================
// NEXO - Conexión a Supabase (base de datos)
// Archivo: backend/src/config/supabase.js
// ================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Faltan las credenciales de Supabase en el archivo .env');
  process.exit(1);
}

// Cliente con permisos de administrador (solo usar en backend)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;
