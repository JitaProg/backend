const categoryService = require('../services/categoryService');

const createCategory = async (req, res) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json({ status: 'success', data: category });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const getAllCategories = async (req, res) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.status(200).json({ status: 'success', data: categories });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    createCategory,
    getAllCategories
};