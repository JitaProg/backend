const productService = require('../services/productService');

// POST /api/products
const createProduct = async (req, res) => {
    try {
        const product = await productService.createProduct(req.body);
        res.status(201).json({ status: 'success', data: product });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

// GET /api/products
const getAllProducts = async (req, res) => {
    try {
        const products = await productService.getAllProducts();
        res.status(200).json({ status: 'success', data: products });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
    try {
        const product = await productService.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Producte no trobat' });
        }
        res.status(200).json({ status: 'success', data: product });
    } catch (error) {
        res.status(400).json({ status: 'error', message: 'ID no vàlid o error de cerca' });
    }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
    try {
        const updatedProduct = await productService.updateProduct(req.params.id, req.body);
        if (!updatedProduct) {
            return res.status(404).json({ status: 'error', message: 'Producte no trobat' });
        }
        res.status(200).json({ status: 'success', data: updatedProduct });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await productService.deleteProduct(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ status: 'error', message: 'Producte no trobat' });
        }
        res.status(200).json({ status: 'success', message: 'Producte eliminat correctament' });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct
};