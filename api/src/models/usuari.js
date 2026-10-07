const mongoose = require('mongoose');

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
        validate: {
            validator: function (v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: props => `${props.value} no és un correu electrònic vàlid!`
        }
    },
    password_hash: {
        type: String,
        required: true
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
    adreces: [adrecaSchema], // Embegut (relació TE)
    metodes_pagament: [metodePagamentSchema], // Embegut (relació DISPOSA)
    data_registre: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Usuari', usuariSchema);