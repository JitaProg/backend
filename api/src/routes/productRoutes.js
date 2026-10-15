const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Definició de rutes CRUD
router.post('/', productController.createProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;