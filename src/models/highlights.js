const mongoose = require('mongoose');

const HIGHLIGHT_SECTIONS = ['news', 'activities', 'promotions'];
const HIGHLIGHT_TITLE_MAX = 80;
const HIGHLIGHT_TEXT_MAX = 200;
const HIGHLIGHT_MAX_ITEMS = 6;

const DEFAULT_HIGHLIGHTS = {
  news: [
    { title: 'Nuevo horario de verano', text: 'Todos los centros abren de 7:00 a 22:00 desde el 1 de noviembre.' },
    { title: 'Zona funcional ampliada', text: 'Más espacio y material en el centro de Madrid.' },
  ],
  activities: [
    { title: 'Taller de movilidad', text: 'Sábados a las 11:00. Plazas limitadas.' },
    { title: 'Reto Noxfit 30 días', text: 'Entrena en equipo y suma puntos cada semana.' },
  ],
  promotions: [
    { title: 'Trae a un amigo', text: 'Un mes gratis para ti y para tu invitado.' },
    { title: 'Sesión de entrenamiento personal', text: '20% de descuento al reservar un pack de 5 sesiones.' },
  ],
};

const entrySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: HIGHLIGHT_TITLE_MAX },
  text: { type: String, required: true, trim: true, maxlength: HIGHLIGHT_TEXT_MAX },
}, { _id: false });

// Singleton document: there is a single set of highlights shared by every member.
const highlightsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  news: { type: [entrySchema], default: undefined },
  activities: { type: [entrySchema], default: undefined },
  promotions: { type: [entrySchema], default: undefined },
}, { timestamps: true });

module.exports = {
  Highlights: mongoose.model('Highlights', highlightsSchema),
  HIGHLIGHT_SECTIONS,
  HIGHLIGHT_TITLE_MAX,
  HIGHLIGHT_TEXT_MAX,
  HIGHLIGHT_MAX_ITEMS,
  DEFAULT_HIGHLIGHTS,
};
