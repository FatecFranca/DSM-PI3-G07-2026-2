const express = require('express');
const authController = require('../controllers/auth.controller');
const router = express.Router();

// Exemplo de rota GET
router.post('/login', authController.login);
router.post('/registrar', authController.registrar);

module.exports = router;