const mongoose = require('mongoose');

const producteSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: [true, 'El nom del producte és obligatori'],
        maxlength: [100, 'El nom no pot superar els 100 caràcters']
    },
    descripcio: {
        type: String
    },
    preu: {
        type: Number,
        required: [true, 'El preu és obligatori'],
        validate: {
            validator: function (v) {
                return v > 0;
            },
            message: props => `El preu de ${props.value}€ no és vàlid. Ha de ser superior a 0.`
        }
    },
    unitat: {
        type: String,
        required: [true, 'La unitat és obligatòria'],
        enum: {
            values: ['kg', 'l', 'unitat'],
            message: '{VALUE} no és una unitat de mesura permesa'
        }
    },
    stock: {
        type: Number,
        required: [true, 'L\'estoc és obligatori'],
        min: [0, 'L\'estoc no pot ser negatiu']
    },
    codigo_barras: {
        type: String,
        unique: true,
        required: [true, 'El SKU és obligatori']
    },
    categoria_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categoria',
        required: [true, 'La categoria és obligatòria'] // Relació PERTANY
    },
    actiu: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Producte', producteSchema);