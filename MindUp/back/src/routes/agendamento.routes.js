const agendamentoController = require("../controllers/agendamento.controller");
const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const { checkPerfil, checkPerfilUsuario } = require('../middlewares/perfil.middleware');

router.use(authenticate);

router.post('/', checkPerfilUsuario, agendamentoController.create);
router.get('/voluntario/:id', checkPerfil, agendamentoController.findByvoluntarioId);
router.get('/usuario/:id', checkPerfilUsuario, agendamentoController.findByUsuarioId);
router.patch('/confirmar/:id', checkPerfil, agendamentoController.confirmarAgendamento);
router.patch('/desconfirmar/:id', checkPerfil, agendamentoController.desconfirmarAgendamento);
router.patch('/cancelar/:id', agendamentoController.cancelarAgendamento);
router.delete('/:id', checkPerfilUsuario, agendamentoController.deleteAgendamento);

module.exports = router;

