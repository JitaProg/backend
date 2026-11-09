// QUÈ FA: protegeix les rutes comprovant que la petició porta un access token vàlid.
// AMB QUÈ CONNECTA:
//   - Llegeix la capçalera Authorization de la petició HTTP.
//   - Verifica el token amb jsonwebtoken i JWT_ACCESS_SECRET (o JWT_SECRET).
//   - Busca l'usuari a MongoDB amb el model Usuari.
const jwt = require('jsonwebtoken');
const Usuari = require('../models/usuari');
const { createError } = require('../utils/httpError');

const protect = async (req, res, next) => {
    try {
        // El client ha d'enviar: Authorization: Bearer <accessToken>
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            throw createError(401, 'UNAUTHORIZED', 'Cal enviar un token Bearer');
        }

        // Separa la paraula "Bearer" del token i comprova signatura i caducitat.
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
            { algorithms: ['HS256'] }
        );

        // Un refresh token no pot servir per accedir a rutes protegides.
        // Els tokens antics no portaven "type"; els acceptem per compatibilitat.
        if (decoded.type && decoded.type !== 'access') {
            throw createError(401, 'UNAUTHORIZED', 'Cal un access token, no un refresh token');
        }

        // El token només porta l'id; comprovem que l'usuari encara existeix i està actiu.
        const user = await Usuari.findOne({ _id: decoded.id, actiu: true });
        if (!user) {
            throw createError(401, 'UNAUTHORIZED', 'Usuari no vàlid');
        }

        // Deixa l'usuari a req perquè el controlador el pugui utilitzar.
        req.user = user;
        next(); // Continua cap al controlador.
    } catch (error) {
        // Errors típics de jwt.verify: token manipulat, caducat o encara no vàlid.
        if (
            error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError' ||
            error.name === 'NotBeforeError'
        ) {
            return next(createError(401, 'UNAUTHORIZED', 'Token invàlid o caducat'));
        }
        next(error);
    }
};

module.exports = { protect };
