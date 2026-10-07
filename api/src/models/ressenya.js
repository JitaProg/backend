const mongoose = require('mongoose');

// Representa la relació VALORA (N:M entre Usuari i Producte)
const ressenyaSchema = new mongoose.Schema({
  usuari_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuari',
    required: true
  },
  producte_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producte',
    required: true
  },
  valoracio: {
    type: Number,
    required: [true, 'La valoració és obligatòria'],
    min: [1, 'La valoració mínima és 1'],
    max: [5, 'La valoració màxima és 5']
  },
  comentari: {
    type: String,
    maxlength: [500, 'El comentari no pot excedir els 500 caràcters']
  },
  data: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Ressenya', ressenyaSchema);