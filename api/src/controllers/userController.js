// QUÈ FA: rep les peticions HTTP i delega la feina al servei.
// AMB QUÈ CONNECTA:
//   - routes/userRoutes.js l'invoca.
//   - userService.js valida les credencials (MongoDB i bcrypt).
//   - tokenService.js genera, rota i revoca els tokens JWT.
//   - errorHandler.js rep els errors que passem amb next(error).
const userService = require('../services/userService');
const tokenService = require('../services/tokenService');

const getUsers = async (req, res, next) => {
    try {
        const result = await userService.getAllUsers(req.query);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

const getUser = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuari no trobat' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

const createUser = async (req, res, next) => {
    try {
        const newUser = await userService.createUser(req.body);
        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        next(error);
    }
};

// POST /api/users/register -> crea l'usuari i respon 201.
const registerUser = async (req, res, next) => {
    try {
        const newUser = await userService.registerUser(req.body);
        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        next(error);
    }
};

// POST /api/users/login -> valida les credencials i respon 200 amb dos tokens.
// accessToken: curt (per defecte 15m) per accedir a rutes protegides.
// refreshToken: llarg (per defecte 7d) per renovar l'accessToken.
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        const user = await userService.loginUser(email, password);

        const tokens = await tokenService.issueTokenPair(user, {
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            data: {
                user,
                ...tokens,
                // Compatibilitat amb el client anterior, que llegia data.token.
                token: tokens.accessToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/users/refresh -> rep { refreshToken } i retorna un parell nou.
// El refresh token utilitzat queda revocat (rotació): només es pot usar una vegada.
const refreshToken = async (req, res, next) => {
    try {
        const tokens = await tokenService.rotateRefreshToken(req.body?.refreshToken, {
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({ success: true, data: tokens });
    } catch (error) {
        next(error);
    }
};

// POST /api/users/logout -> rep { refreshToken } i revoca tota la sessió (família de tokens).
// És idempotent: si el token ja no existeix, també respon 200.
const logoutUser = async (req, res, next) => {
    try {
        const result = await tokenService.revokeRefreshToken(req.body?.refreshToken, 'logout');

        res.status(200).json({
            success: true,
            message: 'Sessió tancada correctament',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/users/logout-all -> ruta protegida; revoca totes les sessions de l'usuari.
const logoutAll = async (req, res, next) => {
    try {
        const result = await tokenService.revokeAllUserTokens(req.user._id, 'logout');

        res.status(200).json({
            success: true,
            message: 'Totes les sessions s\'han tancat',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/users/me -> ruta protegida; req.user l'ha posat authMiddleware.
const getMe = async (req, res) => {
    res.status(200).json({ success: true, data: req.user });
};

const updateUser = async (req, res, next) => {
    try {
        const updatedUser = await userService.updateUser(req.params.id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'Usuari no trobat' });
        }
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const deletedUser = await userService.deleteUser(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: 'Usuari no trobat' });
        }
        res.status(200).json({ success: true, message: 'Usuari eliminat correctament (soft delete)' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsers,
    getUser,
    createUser,
    registerUser,
    loginUser,
    refreshToken,
    logoutUser,
    logoutAll,
    getMe,
    updateUser,
    deleteUser
};