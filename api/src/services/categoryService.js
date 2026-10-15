const Categoria = require('../models/Categoria');

const createCategory = async (categoryData) => {
    const newCategory = new Categoria(categoryData);
    return await newCategory.save();
};

const getAllCategories = async () => {
    return await Categoria.find();
};

module.exports = {
    createCategory,
    getAllCategories
};