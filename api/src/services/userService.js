// QUÈ FA: conté la lògica de negoci dels usuaris (CRUD, registre i login).
// AMB QUÈ CONNECTA:
//   - Model Usuari -> MongoDB.
//   - bcryptjs (a través del model) per xifrar i comparar contrasenyes.
//   - tokenService.js genera els tokens un cop les credencials són correctes.
const Usuari = require('../models/usuari');
const { createError } = require('../utils/httpError');

const getAllUsers = async (queryParams = {}) => {
    const { active, name, sort, page = 1, limit = 10 } = queryParams;
    const query = {};

    // Filtre per estat actiu (si s'indica, sinó per defecte actius o segons convingui)
    if (active !== undefined) {
        query.actiu = active === 'true';
    } else {
        query.actiu = true; // Per defecte només els actius
    }

    // Filtre per nom o cognoms (equivalent a name)
    if (name) {
        query.$or = [
            { nom: { $regex: name, $options: 'i' } },
            { cognoms: { $regex: name, $options: 'i' } },
            { email: { $regex: name, $options: 'i' } }
        ];
    }

    const parsedPage = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (parsedPage - 1) * parsedLimit;

    // Gestió de l'ordenació
    let sortOption = {};
    if (sort) {
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;
        sortOption[sortField] = sortOrder;
    } else {
        sortOption = { createdAt: -1 };
    }

    const [users, total] = await Promise.all([
        Usuari.find(query)
            .select('-password_hash')
            .sort(sortOption)
            .skip(skip)
            .limit(parsedLimit),
        Usuari.countDocuments(query)
    ]);

    return {
        data: users,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    };
};

const getUserById = async (id) => {
    return await Usuari.findOne({ _id: id, actiu: true }).select('-password_hash');
};

const createUser = async (userData) => {
    if (userData.password) {
        userData.password_hash = userData.password;
        delete userData.password;
    }
    const user = new Usuari(userData);
    await user.save();
    const userObj = user.toObject();
    delete userObj.password_hash;
    return userObj;
};

// REGISTRE: només agafa els camps públics (whitelist).
// Això evita que el client enviï camps com rol o actiu i escali privilegis.
const registerUser = async (userData) => {
    const { nom, cognoms, email, password, telefon } = userData;

    if (!password) {
        // 422 = dades no vàlides (falta un camp obligatori).
        throw createError(422, 'VALIDATION_ERROR', 'La contrasenya és obligatòria');
    }

    const user = new Usuari({
        nom,
        cognoms,
        email,
        password_hash: password,
        telefon
    });

    await user.save();
    return user;
};

// LOGIN: 1) busca l'usuari, 2) comprova la contrasenya i 3) retorna l'usuari.
// El controlador és qui demana a tokenService el parell access token + refresh token.
const loginUser = async (email, password) => {
    if (!email || !password) {
        throw createError(400, 'VALIDATION_ERROR', 'Cal indicar el correu i la contrasenya');
    }

    // El model amaga password_hash per defecte; aquí el necessitem per comparar.
    const user = await Usuari.findOne({ email: email.toLowerCase().trim() })
        .select('+password_hash');

    if (!user) {
        // Mateix missatge que amb contrasenya incorrecta: no revelem si l'email existeix.
        throw createError(401, 'INVALID_CREDENTIALS', 'Correu o contrasenya incorrectes');
    }

    if (!user.actiu) {
        // Usuari desactivat (soft delete): no pot iniciar sessió.
        throw createError(403, 'ACCOUNT_DISABLED', "L'usuari està desactivat");
    }

    // comparePassword ve del model i utilitza bcryptjs.
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw createError(401, 'INVALID_CREDENTIALS', 'Correu o contrasenya incorrectes');
    }

    return user;
};

const updateUser = async (id, userData) => {
    if (userData.password || userData.password_hash) {
        delete userData.password;
        delete userData.password_hash;
    }
    return await Usuari.findOneAndUpdate(
        { _id: id, actiu: true },
        userData,
        { new: true, runValidators: true }
    ).select('-password_hash');
};

const deleteUser = async (id) => {
    return await Usuari.findOneAndUpdate(
        { _id: id, actiu: true },
        { actiu: false },
        { new: true }
    );
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    registerUser,
    loginUser,
    updateUser,
    deleteUser
};