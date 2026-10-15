const Producte = require('../models/Producte');

// Crear un nou producte
const createProduct = async (productData) => {
    const newProduct = new Producte(productData);
    return await newProduct.save();
};

// Obtenir tots els productes
const getAllProducts = async () => {
    // .populate('categoria_id') permet portar la informació de la Categoria relacionada
    return await Producte.find().populate('categoria_id');
};

// Obtenir un producte per ID
const getProductById = async (id) => {
    return await Producte.findById(id).populate('categoria_id');
};

// Actualitzar un producte per ID
const updateProduct = async (id, productData) => {
    return await Producte.findByIdAndUpdate(id, productData, {
        new: true,          // Retorna el document actualitzat
        runValidators: true // Aplica les validacions definides a l'esquema
    });
};

// Eliminar un producte per ID
const deleteProduct = async (id) => {
    return await Producte.findByIdAndDelete(id);
};

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct
};