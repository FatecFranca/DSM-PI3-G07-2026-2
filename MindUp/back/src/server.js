require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const { connectDatabase } = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Aceita uma lista separada por vírgulas para cobrir Live Server em
// 127.0.0.1 e em localhost sem precisar reiniciar o servidor.
const CORS_ORIGINS = (
  process.env.CORS_ORIGIN || "http://127.0.0.1:5500,http://localhost:5500"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Requisições sem Origin (curl, mesma origem) e arquivos abertos
    // diretamente (file://) também são aceitos em desenvolvimento.
    if (!origin || origin === "null" || CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const io = new Server(server, { cors: corsOptions });

const socketHandler = require("./socket/index");
socketHandler(io);

const usuarioRoutes = require("./routes/usuario.routes");
const authRoutes = require("./routes/auth.routes");
const disponibilidadeRoutes = require("./routes/disponibilidade.routes");
const agendamentoRoutes = require("./routes/agendamento.routes");
const conversaRoutes = require("./routes/conversa.routes");
const mensagemRoutes = require("./routes/mensagem.routes");

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));
// Serve o frontend estático do repositório. Assim é possível abrir
// http://localhost:3000/login.html e usar a API na mesma origem.
app.use(express.static(path.join(__dirname, "../frront")));

// Configurar template engine EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Rotas
app.use("/usuario", usuarioRoutes);
app.use("/auth", authRoutes);
app.use("/disponibilidade", disponibilidadeRoutes);
app.use("/agendamento", agendamentoRoutes);
app.use("/conversa", conversaRoutes);
app.use("/mensagem", mensagemRoutes);

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).render("404");
});

// Tratamento centralizado de erros da API
app.use(errorHandler);

async function start() {
  try {
    await connectDatabase();

    server.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao iniciar o servidor:", error.message);
    process.exit(1);
  }
}

start();

module.exports = app;
