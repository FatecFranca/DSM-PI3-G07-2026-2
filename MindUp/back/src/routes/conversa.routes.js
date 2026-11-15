const express = require('express')
const router = express.Router()
const conversaController = require('../controllers/conversa.controller')
const authenticate = require('../middlewares/auth.middleware')
const { checkPerfilUsuario } = require('../middlewares/perfil.middleware')

router.use(authenticate)

router.post('/', checkPerfilUsuario, conversaController.criarConversa)
router.get('/minhas', conversaController.getMinhasConversas)
router.get('/:id', conversaController.getConversaById)

module.exports = router