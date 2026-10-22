const categoryService = require('../services/categoryService');

const createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

const getCategories = async (req, res, next) => {
    try {
        const result = await categoryService.getCategories(req.query);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

const getCategoryById = async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Categoria no trobada' });
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body);
        if (!category) return res.status(404).json({ success: false, message: 'Categoria no trobada' });
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const category = await categoryService.deleteCategory(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Categoria no trobada' });
        res.status(200).json({ success: true, message: 'Categoria eliminada correctament' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};