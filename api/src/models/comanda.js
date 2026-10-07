const mongoose = require('mongoose');

// Subesquema per a la relació CONTE (Línia de comanda embeguda)
const liniaComandaSchema = new mongoose.Schema({
    producte_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producte',
        required: true
    },
    quantitat: {
        type: Number,
        required: true,
        min: [1, 'La quantitat mínima és 1']
    },
    preu_unitari: {
        type: Number,
        required: true,
        min: [0, 'El preu unitari no pot ser negatiu']
    },
    iva: {
        type: Number,
        required: true,
        default: 21
    }
});

const comandaSchema = new mongoose.Schema({
    usuari_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuari',
        required: true // Relació REALITZA
    },
    data_compra: {
        type: Date,
        default: Date.now
    },
    estat: {
        type: String,
        enum: ['pendent', 'pagada', 'enviada', 'entregada'],
        default: 'pendent'
    },
    total: {
        type: Number,
        required: true,
        min: [0, 'El total no pot ser negatiu']
    },
    linies_comanda: [liniaComandaSchema] // Relació CONTE
});

module.exports = mongoose.model('Comanda', comandaSchema);