// QUÈ FA: defineix les URL d'usuaris i les connecta amb el controlador.
// AMB QUÈ CONNECTA:
//   - index.js munta aquest router a /api/users.
//   - Les rutes criden userController, que alhora crida userService i tokenService.
//   - Les rutes /me i /logout-all passen abans per authMiddleware.
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Autenticació: públiques (registre, login, refresh i logout).
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/refresh', userController.refreshToken);
router.post('/logout', userController.logoutUser);

// Rutes protegides: authMiddleware comprova l'access token abans d'arribar al controlador.
router.get('/me', authMiddleware.protect, userController.getMe);
router.post('/logout-all', authMiddleware.protect, userController.logoutAll);

// CRUD d'usuaris.
router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
