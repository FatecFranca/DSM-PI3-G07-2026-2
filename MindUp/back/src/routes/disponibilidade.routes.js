const express = require('express');
const disponibilidadeController = require('../controllers/disponibilidade.controller');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const { checkPerfil } = require('../middlewares/perfil.middleware');

router.use(authenticate);

router.get('/minhas', checkPerfil, disponibilidadeController.findMyDisponibilidades);
router.get('/disponiveis', disponibilidadeController.findAllDisponiveis);

// Usuarios e voluntarios podem acessar.
router.get('/:id', disponibilidadeController.findByvoluntarioId);

// Apenas voluntarios podem acessar.
router.post('/', checkPerfil, disponibilidadeController.create);
router.put('/:id', checkPerfil, disponibilidadeController.update);
router.patch('/cancelar/:id', checkPerfil, disponibilidadeController.cancelarDisponibilidade);
router.patch('/reativar/:id', checkPerfil, disponibilidadeController.reativarDisponibilidade);
router.delete('/:id', checkPerfil, disponibilidadeController.delete);

module.exports = router;
