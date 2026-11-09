// QUÈ FA: concentra tota la lògica dels tokens JWT (access i refresh).
// AMB QUÈ CONNECTA:
//   - Model Token -> MongoDB: tokens emesos, rotació, revocació i detecció de reutilització.
//   - Model Usuari -> comprova que l'usuari segueixi existint i actiu.
//   - userController.js -> login, refresh i logout.
//   - authMiddleware.js -> valida l'access token de les rutes protegides.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Token = require('../models/token');
const Usuari = require('../models/usuari');
const { createError } = require('../utils/httpError');

// Si no es defineixen secrets específics, s'utilitza JWT_SECRET per als dos tipus de token.
// El més recomanable és tenir secrets diferents (JWT_ACCESS_SECRET i JWT_REFRESH_SECRET).
const accessSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const accessExpiresIn = () => process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';
const refreshExpiresIn = () => process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Retornem el hash, no el token original. Així una filtració de MongoDB no permet reutilitzar tokens.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const secondsUntil = (decoded) => Math.max(0, decoded.exp - decoded.iat);

// ACCESS TOKEN: credencial curta que el client envia a Authorization: Bearer <token>.
const generateAccessToken = (user) => jwt.sign(
    {
        id: user._id.toString(),
        email: user.email,
        role: user.rol,
        type: 'access'
    },
    accessSecret(),
    { expiresIn: accessExpiresIn() }
);

// REFRESH TOKEN: credencial llarga que només serveix per demanar un nou parell de tokens.
// Porta un jti (identificador únic) i una família per poder detectar reutilització.
const generateRefreshToken = (user, familiaId = crypto.randomUUID()) => {
    const jti = crypto.randomUUID();
    const token = jwt.sign(
        {
            id: user._id.toString(),
            jti,
            familia: familiaId,
            type: 'refresh'
        },
        refreshSecret(),
        { expiresIn: refreshExpiresIn() }
    );

    const decoded = jwt.decode(token);
    return {
        token,
        jti,
        familiaId,
        expiraEl: new Date(decoded.exp * 1000)
    };
};

const buildTokenResponse = (accessToken, refreshToken) => {
    const accessDecoded = jwt.decode(accessToken);
    const refreshDecoded = jwt.decode(refreshToken);

    return {
        tokenType: 'Bearer',
        accessToken,
        refreshToken,
        expiresIn: secondsUntil(accessDecoded),
        refreshExpiresIn: secondsUntil(refreshDecoded)
    };
};

// LOGIN: crea un parell de tokens nou i desa el refresh token (hashat) a MongoDB.
// Cada login obre una família nova, és a dir, una sessió independent.
const issueTokenPair = async (user, context = {}) => {
    const accessToken = generateAccessToken(user);
    const refresh = generateRefreshToken(user);

    await Token.create({
        usuari_id: user._id,
        jti: refresh.jti,
        token_hash: hashToken(refresh.token),
        familia_id: refresh.familiaId,
        expira_el: refresh.expiraEl,
        ip: context.ip || null,
        user_agent: context.userAgent ? String(context.userAgent).slice(0, 500) : null
    });

    return buildTokenResponse(accessToken, refresh.token);
};

// Revoca tots els tokens actius d'una mateixa sessió (família).
// S'usa en logout, en detectar reutilització o en desactivar un usuari.
const revokeFamily = async (familiaId, motiu) => {
    const result = await Token.updateMany(
        { familia_id: familiaId, revocat: false },
        {
            $set: {
                revocat: true,
                revocat_el: new Date(),
                motiu_revocacio: motiu
            }
        }
    );

    return result.modifiedCount;
};

// Verifica la firma del refresh token sense tenir en compte la caducitat.
// S'usa al logout per poder revocar la família encara que el token hagi caducat.
const decodeRefreshToken = (rawToken) => {
    try {
        return jwt.verify(rawToken, refreshSecret(), {
            algorithms: ['HS256'],
            ignoreExpiration: true
        });
    } catch (error) {
        return null;
    }
};

// REFRESH: valida el token, el consumeix i en genera un de nou dins la mateixa família.
// Si el token ja havia estat consumit, es considera un intent de reutilització i es revoca tota la família.
const rotateRefreshToken = async (rawToken, context = {}) => {
    if (!rawToken) {
        throw createError(400, 'REFRESH_TOKEN_REQUIRED', 'Cal enviar el refresh token');
    }

    let payload;
    try {
        payload = jwt.verify(rawToken, refreshSecret(), { algorithms: ['HS256'] });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw createError(401, 'REFRESH_TOKEN_EXPIRED', 'El refresh token ha caducat. Cal tornar a iniciar sessió');
        }
        throw createError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token invàlid');
    }

    if (payload.type !== 'refresh' || !payload.jti || !payload.id || !payload.familia) {
        throw createError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token invàlid');
    }

    // Busquem pel jti i pel hash: si el token no és exactament el que vam emetre, no val.
    const tokenDoc = await Token.findOne({
        jti: payload.jti,
        token_hash: hashToken(rawToken)
    });

    if (!tokenDoc) {
        throw createError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token no reconegut');
    }

    if (tokenDoc.usuari_id.toString() !== payload.id) {
        await revokeFamily(tokenDoc.familia_id, 'reutilitzacio');
        throw createError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token invàlid');
    }

    // Si el token ja s'havia fet servir, algú l'està reutilitzant: revoquem tota la família.
    if (tokenDoc.revocat) {
        if (tokenDoc.reemplacat_per || tokenDoc.motiu_revocacio === 'rotacio') {
            await revokeFamily(tokenDoc.familia_id, 'reutilitzacio');
            throw createError(
                401,
                'REFRESH_TOKEN_REUSED',
                'Reutilització de refresh token detectada. S\'ha revocat tota la sessió'
            );
        }
        throw createError(401, 'REFRESH_TOKEN_REVOKED', 'El refresh token ha estat revocat');
    }

    if (tokenDoc.expira_el <= new Date()) {
        throw createError(401, 'REFRESH_TOKEN_EXPIRED', 'El refresh token ha caducat. Cal tornar a iniciar sessió');
    }

    const user = await Usuari.findOne({ _id: tokenDoc.usuari_id, actiu: true });
    if (!user) {
        await revokeFamily(tokenDoc.familia_id, 'admin');
        throw createError(401, 'USER_INACTIVE', "L'usuari no existeix o està desactivat");
    }

    // Preparem el nou token abans de marcar l'antic com a usat.
    const newRefresh = generateRefreshToken(user, tokenDoc.familia_id);
    const now = new Date();

    // Creem el nou document ABANS de consumir l'antic. Si una altra petició simultània
    // detecta reutilització i revoca la família, el token nou també quedarà revocat.
    await Token.create({
        usuari_id: user._id,
        jti: newRefresh.jti,
        token_hash: hashToken(newRefresh.token),
        familia_id: newRefresh.familiaId,
        expira_el: newRefresh.expiraEl,
        ip: context.ip || null,
        user_agent: context.userAgent ? String(context.userAgent).slice(0, 500) : null
    });

    // Operació atòmica: només una petició pot "consumir" el token.
    // Si dues peticions el fan servir alhora, la segona no actualitza cap document
    // i es tracta com un intent de reutilització.
    const claimed = await Token.findOneAndUpdate(
        { _id: tokenDoc._id, revocat: false, expira_el: { $gt: now } },
        {
            $set: {
                revocat: true,
                revocat_el: now,
                motiu_revocacio: 'rotacio',
                reemplacat_per: newRefresh.jti
            }
        },
        { returnDocument: 'before' }
    );

    if (!claimed) {
        // Aquesta petició ha perdut la cursa: revoquem també el token nou que acabem de crear.
        await revokeFamily(tokenDoc.familia_id, 'reutilitzacio');
        throw createError(
            401,
            'REFRESH_TOKEN_REUSED',
            'Reutilització de refresh token detectada. S\'ha revocat tota la sessió'
        );
    }

    const accessToken = generateAccessToken(user);
    return buildTokenResponse(accessToken, newRefresh.token);
};

// LOGOUT: revoca la família del refresh token enviat.
// És idempotent: si el token no existeix o ja està revocat, també respon correctament.
const revokeRefreshToken = async (rawToken, motiu = 'logout') => {
    if (!rawToken) {
        throw createError(400, 'REFRESH_TOKEN_REQUIRED', 'Cal enviar el refresh token');
    }

    const payload = decodeRefreshToken(rawToken);
    if (!payload || payload.type !== 'refresh' || !payload.jti) {
        return { revokedTokens: 0 };
    }

    const tokenDoc = await Token.findOne({ jti: payload.jti });
    if (!tokenDoc) {
        return { revokedTokens: 0 };
    }

    const revokedTokens = await revokeFamily(tokenDoc.familia_id, motiu);
    return { revokedTokens };
};

// LOGOUT DE TOTS ELS DISPOSITIUS: revoca tots els refresh tokens actius de l'usuari.
const revokeAllUserTokens = async (userId, motiu = 'logout') => {
    const result = await Token.updateMany(
        { usuari_id: userId, revocat: false },
        {
            $set: {
                revocat: true,
                revocat_el: new Date(),
                motiu_revocacio: motiu
            }
        }
    );

    return { revokedTokens: result.modifiedCount };
};

module.exports = {
    issueTokenPair,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens
};
