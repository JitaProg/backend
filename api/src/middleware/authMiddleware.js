// QUÈ FA: protegeix les rutes comprovant que la petició porta un JWT vàlid.
// AMB QUÈ CONNECTA:
//   - Llegeix la capçalera Authorization de la petició HTTP.
//   - Verifica el token amb jsonwebtoken i la variable JWT_SECRET.
//   - Busca l'usuari a MongoDB amb el model Usuari.
const jwt = require('jsonwebtoken');
const Usuari = require('../models/usuari');
const { createError } = require('../utils/httpError');

const protect = async (req, res, next) => {
    try {
        // El client ha d'enviar: Authorization: Bearer <token>
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            throw createError(401, 'UNAUTHORIZED', 'Cal enviar un token Bearer');
        }

        // Separa la paraula "Bearer" del token i comprova signatura i caducitat.
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // El token només porta l'id; comprovem que l'usuari encara existeix i està actiu.
        const user = await Usuari.findOne({ _id: decoded.id, actiu: true });
        if (!user) {
            throw createError(401, 'UNAUTHORIZED', 'Usuari no vàlid');
        }

        // Deixa l'usuari a req perquè el controlador el pugui utilitzar.
        req.user = user;
        next(); // Continua cap al controlador.
    } catch (error) {
        // Errors típics de jwt.verify: token manipulat o caducat.
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return next(createError(401, 'UNAUTHORIZED', 'Token invàlid o caducat'));
        }
        next(error);
    }
};

module.exports = { protect };
