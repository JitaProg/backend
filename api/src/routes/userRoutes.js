// QUÈ FA: defineix les URL d'usuaris i les connecta amb el controlador.
// AMB QUÈ CONNECTA:
//   - index.js munta aquest router a /api/users.
//   - Les rutes criden userController, que alhora crida userService.
//   - La ruta /me passa abans per authMiddleware per validar el JWT.
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Autenticació: públiques (registre i login).
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Ruta protegida: authMiddleware comprova el token abans d'arribar al controlador.
router.get('/me', authMiddleware.protect, userController.getMe);

// CRUD d'usuaris.
router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
