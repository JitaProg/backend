const Categoria = require('../models/categoria');

const createCategory = async (data) => {
    const category = new Categoria(data);
    return await category.save();
};

const getCategories = async (queryParams) => {
    const { active, name, sort, page = 1, limit = 10 } = queryParams;
    const query = {};

    if (active !== undefined) query.active = active === 'true';
    if (name) query.name = { $regex: name, $options: 'i' };

    const parsedPage = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (parsedPage - 1) * parsedLimit;

    let sortOption = {};
    if (sort) {
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;
        sortOption[sortField] = sortOrder;
    } else {
        sortOption = { createdAt: -1 };
    }

    const [categories, total] = await Promise.all([
        Categoria.find(query).sort(sortOption).skip(skip).limit(parsedLimit),
        Categoria.countDocuments(query)
    ]);

    return {
        data: categories,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    };
};

const getCategoryById = async (id) => await Categoria.findById(id);

const updateCategory = async (id, data) => {
    return await Categoria.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

const deleteCategory = async (id) => await Categoria.findByIdAndDelete(id);

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};