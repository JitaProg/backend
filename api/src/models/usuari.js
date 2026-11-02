// QUÈ FA: defineix l'esquema d'usuari i la seguretat de la contrasenya.
// AMB QUÈ CONNECTA:
//   - MongoDB: col·lecció 'usuaris' (mongoose.model al final).
//   - bcryptjs: xifra i compara les contrasenyes.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Subesquema per a l'Adreça (relació TE 1:N)
const adrecaSchema = new mongoose.Schema({
    carrer_num: {
        type: String,
        required: [true, 'El carrer i número són obligatoris']
    },
    pis_porta: {
        type: String
    },
    ciutat: {
        type: String,
        required: [true, 'La ciutat és obligatòria']
    },
    codi_postal: {
        type: String,
        required: [true, 'El codi postal és obligatori']
    },
    provincia: {
        type: String,
        required: [true, 'La província és obligatòria']
    },
    pais: {
        type: String,
        default: 'Espanya'
    },
    predeterminada: {
        type: Boolean,
        default: false
    }
});

// Subesquema per al Mètode de Pagament (relació DISPOSA 1:N)
const metodePagamentSchema = new mongoose.Schema({
    tipus: {
        type: String,
        required: [true, 'El tipus de pagament és obligatori'],
        enum: ['targeta', 'paypal', 'transferencia', 'bizum']
    },
    num_parcial: {
        type: String,
        required: true,
        match: [/^\d{4}$/, 'El número parcial ha de ser de 4 dígits']
    },
    caducitat: {
        type: String,
        match: [/^(0[1-9]|1[0-2])\/\d{2}$/, 'El format de caducitat ha de ser MM/AA']
    },
    titular: {
        type: String,
        required: [true, 'El titular és obligatori']
    },
    predeterminat: {
        type: Boolean,
        default: false
    }
});

const usuariSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: [true, 'El nom és obligatori']
    },
    cognoms: {
        type: String,
        required: [true, 'Els cognoms són obligatoris']
    },
    email: {
        type: String,
        required: [true, 'El correu electrònic és obligatori'],
        unique: true,
        // Guardem l'email en minúscules i sense espais per evitar duplicats.
        lowercase: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: props => `${props.value} no és un correu electrònic vàlid!`
        }
    },
    password_hash: {
        type: String,
        required: [true, 'La contrasenya és obligatòria'],
        // Es valida la contrasenya en text pla abans del pre('save').
        minlength: [8, 'La contrasenya ha de tenir com a mínim 8 caràcters'],
        // select: false = aquest camp no surt mai a les consultes tret que es demani expressament.
        select: false
    },
    telefon: {
        type: String,
        match: [/^[0-9]{9}$/, 'El telèfon ha de tenir 9 dígits']
    },
    rol: {
        type: String,
        enum: {
            values: ['client', 'admin'],
            message: '{VALUE} no és un rol vàlid'
        },
        default: 'client'
    },
    actiu: {
        type: Boolean,
        default: true
    },
    adreces: [adrecaSchema],
    metodes_pagament: [metodePagamentSchema],
    data_registre: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Middleware PRE-SAVE: s'executa ABANS de desar a MongoDB.
// Si la contrasenya ha canviat, la converteix en un hash amb bcryptjs.
usuariSchema.pre('save', async function () {
    if (!this.isModified('password_hash')) return;
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

// Mètode per comparar contrasenyes.
// Compara la contrasenya escrita al login amb el hash desat (bcryptjs).
// Retorna true/false; no desxifra mai el hash.
usuariSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password_hash);
};

// S'executa quan el document es converteix a JSON (res.json d'Express).
// Elimina el hash perquè mai surti a la resposta HTTP.
usuariSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password_hash;
        return ret;
    }
});

module.exports = mongoose.model('Usuari', usuariSchema);