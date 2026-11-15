const mensagemModel = require("../models/mensagem.model");
const conversaModel = require("../models/conversa.model");
const jwt = require("jsonwebtoken");
const { isValidObjectId, sameId } = require("../utils/mongoose");

module.exports = (io) => {
  // Autenticação via token no WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error("Token não fornecido"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Usuário conectado: ${socket.user.id}`);

    // Entrar numa sala de conversa
    socket.on("entrar_conversa", async (id_con) => {
      try {
        if (!isValidObjectId(id_con)) {
          return socket.emit("erro", "Conversa inválida");
        }

        const conversa = await conversaModel.findById(id_con);

        if (!conversa) {
          return socket.emit("erro", "Conversa não encontrada");
        }

        if (
          !sameId(socket.user.id, conversa.id_usr) &&
          !sameId(socket.user.id, conversa.id_vol)
        ) {
          return socket.emit(
            "erro",
            "Você não tem permissão para acessar esta conversa",
          );
        }

        socket.join(`conversa_${id_con}`);
        socket.emit("entrou_conversa", `Você entrou na conversa ${id_con}`);
      } catch (error) {
        socket.emit("erro", error.message);
      }
    });

    // Sair da sala ao trocar de conversa no cliente.
    socket.on("sair_conversa", (id_con) => {
      if (!id_con) return;
      socket.leave(`conversa_${id_con}`);
    });

    // Enviar mensagem
    socket.on("enviar_mensagem", async (data) => {
      try {
        const { id_con, conteudo } = data || {};

        if (!isValidObjectId(id_con) || !conteudo) {
          return socket.emit("erro", "Dados da mensagem inválidos");
        }

        const conversa = await conversaModel.findById(id_con);

        if (!conversa) {
          return socket.emit("erro", "Conversa não encontrada");
        }

        if (
          !sameId(socket.user.id, conversa.id_usr) &&
          !sameId(socket.user.id, conversa.id_vol)
        ) {
          return socket.emit("erro", "Você não tem permissão");
        }

        const idMensagem = await mensagemModel.create({
          id_con,
          id_remetente: socket.user.id,
          conteudo_men: conteudo,
        });

        await conversaModel.atualizarUltimaMensagem(id_con, conteudo);

        io.to(`conversa_${id_con}`).emit("mensagem_recebida", {
          id_men: String(idMensagem),
          id_con: String(id_con),
          id_remetente: socket.user.id,
          conteudo_men: conteudo,
          enviada_em: new Date(),
        });
      } catch (error) {
        socket.emit("erro", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Usuário desconectado: ${socket.user.id}`);
    });
  });
};
