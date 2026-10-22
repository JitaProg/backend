const Producte = require('../models/producte');

// Crear un nou producte
const createProduct = async (productData) => {
    const newProduct = new Producte(productData);
    return await newProduct.save();
};

// Obtenir tots els productes amb filtres, ordenació i paginació
const getAllProducts = async (queryParams = {}) => {
    const { active, name, sort, page = 1, limit = 10 } = queryParams;
    const query = {};

    // Filtre per estat actiu (per defecte només els actius)
    if (active !== undefined) {
        query.actiu = active === 'true';
    } else {
        query.actiu = true;
    }

    // Filtre per nom
    if (name) {
        query.nom = { $regex: name, $options: 'i' };
    }

    const parsedPage = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (parsedPage - 1) * parsedLimit;

    // Ordenació
    let sortOption = {};
    if (sort) {
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;
        sortOption[sortField] = sortOrder;
    } else {
        sortOption = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
        Producte.find(query)
            .populate('categoria_id')
            .sort(sortOption)
            .skip(skip)
            .limit(parsedLimit),
        Producte.countDocuments(query)
    ]);

    return {
        data: products,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    };
};

// Obtenir un producte per ID
const getProductById = async (id) => {
    return await Producte.findOne({ _id: id, actiu: true }).populate('categoria_id');
};

// Actualitzar un producte per ID
const updateProduct = async (id, productData) => {
    return await Producte.findOneAndUpdate(
        { _id: id, actiu: true },
        productData,
        {
            new: true,          // Retorna el document actualitzat
            runValidators: true // Aplica les validacions definides a l'esquema
        }
    ).populate('categoria_id');
};

// Eliminar un producte per ID (Soft Delete)
const deleteProduct = async (id) => {
    return await Producte.findOneAndUpdate(
        { _id: id, actiu: true },
        { actiu: false },
        { new: true }
    );
};

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct
};