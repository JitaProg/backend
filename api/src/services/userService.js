const Usuari = require('../models/usuari');

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
    updateUser,
    deleteUser
};