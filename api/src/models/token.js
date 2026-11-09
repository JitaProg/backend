// QUÈ FA: guarda a MongoDB els refresh tokens emesos a cada sessió.
// AMB QUÈ CONNECTA:
//   - tokenService.js crea, consulta, rota i revoca aquests documents.
//   - Model Usuari: cada token pertany a un usuari (usuari_id).
//   - MongoDB: col·lecció 'tokens'; l'índex TTL esborra els documents caducats.
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    usuari_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuari',
        required: true,
        index: true
    },
    // Identificador únic del refresh token (jti). Permet localitzar-lo sense guardar el token en clar.
    jti: {
        type: String,
        required: true,
        unique: true
    },
    // Només desem el hash SHA-256 del token: si algú llegeix la base de dades no pot reutilitzar el token.
    token_hash: {
        type: String,
        required: true,
        unique: true,
        select: false
    },
    // Tots els tokens obtinguts per rotació d'un mateix login comparteixen família.
    // Si es detecta reutilització, es revoca la família sencera.
    familia_id: {
        type: String,
        required: true,
        index: true
    },
    expira_el: {
        type: Date,
        required: true
    },
    revocat: {
        type: Boolean,
        default: false
    },
    revocat_el: {
        type: Date,
        default: null
    },
    motiu_revocacio: {
        type: String,
        enum: ['rotacio', 'logout', 'reutilitzacio', 'admin'],
        default: null
    },
    // jti del token que substitueix aquest quan es fa una rotació.
    reemplacat_per: {
        type: String,
        default: null
    },
    ip: {
        type: String,
        default: null
    },
    user_agent: {
        type: String,
        maxlength: 500,
        default: null
    }
}, {
    timestamps: true
});

// TTL: MongoDB esborra sol el document quan arriba la data de caducitat.
tokenSchema.index({ expira_el: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Token', tokenSchema);
