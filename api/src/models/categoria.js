const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: [true, 'El nom de la categoria és obligatori']
    },
    descripcio: {
        type: String
    },
    slug: {
        type: String,
        required: [true, 'El slug és obligatori'],
        unique: true
    }
});

module.exports = mongoose.model('Categoria', categoriaSchema);