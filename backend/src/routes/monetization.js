// ================================================
// NEXO - Sistema de monetización
// Archivo: backend/src/routes/monetization.js
// ================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');

// Precios en pesos colombianos (COP)
const PLANES = {
  mensual:   { precio: 20000,  duracion_dias: 30,  nombre: 'Premium Mensual' },
  semestral: { precio: 100000, duracion_dias: 180, nombre: 'Premium Semestral' },
  anual:     { precio: 180000, duracion_dias: 365, nombre: 'Premium Anual' },
};

const PAQUETES_MONEDAS = {
  basico:   { monedas: 500,  precio: 5000  },
  estandar: { monedas: 1000, precio: 9000  },
  premium:  { monedas: 2000, precio: 15000 },
};

const COSTO_ACCIONES = {
  superlike: 50,
  boost: 150,
  destacar_perfil: 100,
  mensaje_entorno_extra: 30,
};

// ----------------------------------------
// GET /api/monetization/plans
// Ver todos los planes disponibles
// ----------------------------------------
router.get('/plans', (req, res) => {
  res.json({
    planes_premium: PLANES,
    paquetes_monedas: PAQUETES_MONEDAS,
    costo_acciones: COSTO_ACCIONES,
    beneficios_premium: [
      'Boost ilimitado',
      'Super Likes ilimitados',
      'Sin anuncios',
      'Ver quién te dio like',
      'Aparecer primero en búsquedas',
      'Cambiar tu ubicación',
      'Mensajes extra en Entorno',
    ]
  });
});

// ----------------------------------------
// GET /api/monetization/mis-monedas
// Ver mi saldo de monedas
// ----------------------------------------
router.get('/mis-monedas', authenticateToken, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('coins_balance, subscription_type, subscription_expires_at')
      .eq('id', req.user.id)
      .single();

    const { data: transacciones } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({
      saldo: user.coins_balance,
      suscripcion: user.subscription_type,
      vence: user.subscription_expires_at,
      historial: transacciones || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar monedas.' });
  }
});

// ----------------------------------------
// POST /api/monetization/usar-boost
// Activar boost (aparecer primero 30 minutos)
// ----------------------------------------
router.post('/usar-boost', authenticateToken, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('coins_balance, subscription_type')
      .eq('id', req.user.id)
      .single();

    // Premium no paga
    if (user.subscription_type === 'free') {
      if (user.coins_balance < COSTO_ACCIONES.boost) {
        return res.status(402).json({
          error: `Necesitas ${COSTO_ACCIONES.boost} monedas para activar Boost.`,
          saldo_actual: user.coins_balance
        });
      }
      await supabase
        .from('users')
        .update({ coins_balance: user.coins_balance - COSTO_ACCIONES.boost })
        .eq('id', req.user.id);
    }

    // Activar boost por 30 minutos
    const boostExpira = new Date(Date.now() + 30 * 60 * 1000);
    await supabase
      .from('profiles')
      .update({ boost_activo: true, boost_expira_at: boostExpira.toISOString() })
      .eq('user_id', req.user.id);

    // Registrar transacción
    if (user.subscription_type === 'free') {
      await supabase.from('coin_transactions').insert({
        user_id: req.user.id,
        tipo: 'gasto',
        monto: -COSTO_ACCIONES.boost,
        concepto: 'Boost activado',
        created_at: new Date().toISOString()
      });
    }

    res.json({
      message: '¡Boost activado! Tu perfil aparecerá primero por 30 minutos.',
      boost_expira: boostExpira
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al activar boost.' });
  }
});

// ----------------------------------------
// POST /api/monetization/comprar-monedas
// Iniciar compra de monedas (simulado)
// En producción conectar con Stripe/PayU
// ----------------------------------------
router.post('/comprar-monedas', authenticateToken, async (req, res) => {
  try {
    const { paquete } = req.body;

    if (!PAQUETES_MONEDAS[paquete]) {
      return res.status(400).json({ error: 'Paquete inválido.' });
    }

    const { monedas, precio } = PAQUETES_MONEDAS[paquete];

    // TODO: Integrar con pasarela de pagos (Stripe o PayU para Colombia)
    // const pago = await stripeService.crearPago(precio, req.user.id);

    // Por ahora simulamos la compra exitosa
    const { data: user } = await supabase
      .from('users')
      .select('coins_balance')
      .eq('id', req.user.id)
      .single();

    const nuevoSaldo = user.coins_balance + monedas;
    await supabase
      .from('users')
      .update({ coins_balance: nuevoSaldo })
      .eq('id', req.user.id);

    await supabase.from('coin_transactions').insert({
      user_id: req.user.id,
      tipo: 'compra',
      monto: monedas,
      concepto: `Compra paquete ${paquete} - ${precio} COP`,
      created_at: new Date().toISOString()
    });

    res.json({
      message: `¡Compra exitosa! Se añadieron ${monedas} monedas.`,
      nuevo_saldo: nuevoSaldo
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar compra.' });
  }
});

// ----------------------------------------
// POST /api/monetization/suscribirse
// Activar suscripción premium
// ----------------------------------------
router.post('/suscribirse', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLANES[plan]) {
      return res.status(400).json({ error: 'Plan inválido.' });
    }

    const { duracion_dias, nombre, precio } = PLANES[plan];

    // TODO: Integrar pasarela de pagos real

    const expira = new Date(Date.now() + duracion_dias * 24 * 60 * 60 * 1000);

    await supabase
      .from('users')
      .update({
        subscription_type: 'premium',
        subscription_plan: plan,
        subscription_expires_at: expira.toISOString()
      })
      .eq('id', req.user.id);

    await supabase.from('subscriptions').insert({
      user_id: req.user.id,
      plan,
      precio,
      inicia_at: new Date().toISOString(),
      expira_at: expira.toISOString()
    });

    res.json({
      message: `¡Bienvenido a ${nombre}!`,
      plan,
      vence: expira,
      beneficios: PLANES[plan]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al activar suscripción.' });
  }
});

module.exports = router;
