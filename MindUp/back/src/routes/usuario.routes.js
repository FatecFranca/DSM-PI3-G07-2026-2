const express = require('express');
const usuarioController = require('../controllers/usuario.controller');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');

// Exemplo de rota GET
router.get('/', authenticate, usuarioController.getAll);
router.get('/:id', authenticate, usuarioController.getById);
router.post('/', authenticate, usuarioController.create);
router.put('/:id', authenticate, usuarioController.update);
router.delete('/:id', authenticate, usuarioController.delete);

module.exports = router;
