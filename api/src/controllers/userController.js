// QUÈ FA: rep les peticions HTTP i delega la feina al servei.
// AMB QUÈ CONNECTA:
//   - routes/userRoutes.js l'invoca.
//   - userService.js executa la lògica (MongoDB, bcrypt i JWT).
//   - errorHandler.js rep els errors que passem amb next(error).
const userService = require('../services/userService');

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

// POST /api/users/login -> valida les credencials i respon 200 amb el token.
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { user, token } = await userService.loginUser(email, password);
        res.status(200).json({ success: true, data: { user, token } });
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
    getMe,
    updateUser,
    deleteUser
};