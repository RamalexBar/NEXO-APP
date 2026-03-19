// ================================================
// NEXO — Mejora 6: Eventos cercanos
// Archivo: backend/src/routes/events.js
// ================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');

// ----------------------------------------
// GET /api/events/cercanos
// Obtener eventos dentro del radio del usuario
// ----------------------------------------
router.get('/cercanos', authenticateToken, async (req, res) => {
  try {
    const radio = parseInt(req.query.radio) || 50;

    const { data: miPerfil } = await supabase
      .from('profiles')
      .select('latitud, longitud, ciudad')
      .eq('user_id', req.user.id)
      .single();

    // Buscar eventos activos y futuros
    const { data: eventos } = await supabase
      .from('events')
      .select(`
        id, titulo, descripcion, tipo, ciudad,
        fecha_evento, max_personas, latitud, longitud,
        creador:users!events_creador_id_fkey (id, nombre, profiles(fotos)),
        event_participants (user_id, estado)
      `)
      .eq('activo', true)
      .gte('fecha_evento', new Date().toISOString())
      .order('fecha_evento', { ascending: true })
      .limit(20);

    // Calcular distancia y participantes para cada evento
    const eventosConInfo = (eventos || []).map(ev => {
      const participantesAprobados = ev.event_participants?.filter(p => p.estado === 'aprobado').length || 0;
      const yoParticipo = ev.event_participants?.some(p => p.user_id === req.user.id) || false;

      let distanciaKm = null;
      if (miPerfil?.latitud && ev.latitud) {
        const R = 6371;
        const dLat = ((ev.latitud - miPerfil.latitud) * Math.PI) / 180;
        const dLng = ((ev.longitud - miPerfil.longitud) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(miPerfil.latitud * Math.PI / 180) *
          Math.cos(ev.latitud * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2;
        distanciaKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      }

      return {
        ...ev,
        event_participants: undefined,
        participantes: participantesAprobados,
        cupos_disponibles: ev.max_personas - participantesAprobados,
        yo_participo: yoParticipo,
        distancia_km: distanciaKm,
        lleno: participantesAprobados >= ev.max_personas,
      };
    }).filter(ev => !ev.distancia_km || ev.distancia_km <= radio);

    res.json({ eventos: eventosConInfo, total: eventosConInfo.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cargar eventos.' });
  }
});

// ----------------------------------------
// POST /api/events/crear
// Crear un nuevo evento
// ----------------------------------------
router.post('/crear', authenticateToken, async (req, res) => {
  try {
    const { titulo, descripcion, tipo, ciudad, latitud, longitud, fecha_evento, max_personas } = req.body;

    if (!titulo || !fecha_evento) {
      return res.status(400).json({ error: 'Título y fecha son obligatorios.' });
    }

    if (new Date(fecha_evento) < new Date()) {
      return res.status(400).json({ error: 'La fecha debe ser en el futuro.' });
    }

    const { data: nuevoEvento } = await supabase
      .from('events')
      .insert({
        creador_id: req.user.id,
        titulo, descripcion, tipo, ciudad,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        fecha_evento,
        max_personas: Math.min(parseInt(max_personas) || 10, 20),
        activo: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    // El creador se une automáticamente
    await supabase.from('event_participants').insert({
      event_id: nuevoEvento.id,
      user_id: req.user.id,
      estado: 'aprobado',
    });

    res.status(201).json({ message: '¡Evento creado!', evento: nuevoEvento });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear evento.' });
  }
});

// ----------------------------------------
// POST /api/events/:eventId/unirse
// Solicitar unirse a un evento
// ----------------------------------------
router.post('/:eventId/unirse', authenticateToken, async (req, res) => {
  try {
    const { data: evento } = await supabase
      .from('events')
      .select('*, event_participants(*)')
      .eq('id', req.params.eventId)
      .single();

    if (!evento) return res.status(404).json({ error: 'Evento no encontrado.' });

    const aprobados = evento.event_participants?.filter(p => p.estado === 'aprobado').length || 0;
    if (aprobados >= evento.max_personas) {
      return res.status(400).json({ error: 'El evento está lleno.' });
    }

    const yaParticipa = evento.event_participants?.some(p => p.user_id === req.user.id);
    if (yaParticipa) return res.status(400).json({ error: 'Ya enviaste solicitud.' });

    await supabase.from('event_participants').insert({
      event_id: req.params.eventId,
      user_id: req.user.id,
      estado: 'pendiente',
    });

    res.json({ message: 'Solicitud enviada. El organizador debe aceptarte.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al unirse al evento.' });
  }
});

// ----------------------------------------
// PUT /api/events/:eventId/participante/:userId
// Aprobar o rechazar participante (solo creador)
// ----------------------------------------
router.put('/:eventId/participante/:userId', authenticateToken, async (req, res) => {
  try {
    const { estado } = req.body; // 'aprobado' | 'rechazado'

    const { data: evento } = await supabase
      .from('events').select('creador_id').eq('id', req.params.eventId).single();

    if (evento?.creador_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el organizador puede gestionar participantes.' });
    }

    await supabase.from('event_participants')
      .update({ estado })
      .eq('event_id', req.params.eventId)
      .eq('user_id', req.params.userId);

    res.json({ message: `Participante ${estado}.` });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar participante.' });
  }
});

module.exports = router;
