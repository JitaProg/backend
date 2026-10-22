const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nom és obligatori'],
        minlength: [3, 'El nom ha de tenir almenys 3 caràcters'],
        trim: true
    },
    slug: {
        type: String,
        required: [true, 'El slug és obligatori'],
        unique: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        maxlength: [500, 'La descripció no pot superar els 500 caràcters'],
        trim: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Categoria', categoriaSchema);