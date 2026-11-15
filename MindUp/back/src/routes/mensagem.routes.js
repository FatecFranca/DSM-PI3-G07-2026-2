const express = require('express')
const router = express.Router()
const mensagemController = require('../controllers/mensagem.controller')
const authenticate = require('../middlewares/auth.middleware')

router.use(authenticate)

router.get('/conversa/:id_con', mensagemController.getHistorico)
router.patch('/:id_men/visualizar', mensagemController.marcarComoVisualizada)

module.exports = router