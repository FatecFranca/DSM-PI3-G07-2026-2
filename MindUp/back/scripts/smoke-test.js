require("dotenv").config();

const path = require("path");
const { spawnSync } = require("child_process");
const jwt = require("jsonwebtoken");
const {
  MongoMemoryServer,
  MongoMemoryReplSet,
} = require("mongodb-memory-server");

const ROOT = path.resolve(__dirname, "..");
const BASE = "http://127.0.0.1:3123";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`${BASE}/usuario`);
      if (response.status === 401) return;
    } catch (error) {
      // O servidor ainda não subiu.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("O servidor não respondeu na porta 3123");
}

async function request(pathname, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = text;

  try {
    data = JSON.parse(text);
  } catch (error) {
    // Resposta HTML (por exemplo, 404).
  }

  return { status: response.status, data };
}

async function login(email, senha = "123456") {
  const response = await request("/auth/login", {
    method: "POST",
    body: { email, senha },
  });

  assert(response.status === 200, `Login falhou para ${email}`);

  const payload = jwt.decode(response.data.token);
  return { token: response.data.token, id: payload.id };
}

function requireModel(name) {
  return require(path.join(ROOT, "src", "models", `${name}.model`));
}

async function main() {
  const useReplSet = process.argv.includes("--replset");

  const mongod = useReplSet
    ? await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    : await MongoMemoryServer.create();

  process.env.MONGODB_URI = mongod.getUri("psi");
  process.env.JWT_SECRET = "smoke-test-secret";
  process.env.PORT = "3123";
  process.env.CORS_ORIGIN = "http://127.0.0.1:5500";

  const seed = spawnSync(process.execPath, ["database/seed.js"], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
  });

  if (seed.status !== 0) {
    throw new Error(`Seed falhou:\n${seed.stdout}\n${seed.stderr}`);
  }

  require(path.join(ROOT, "src", "server.js"));
  await waitForServer();

  const Usuario = requireModel("usuario");
  const Disponibilidade = requireModel("disponibilidade");
  const Agendamento = requireModel("agendamento");
  const Conversa = requireModel("conversa");
  const Mensagem = requireModel("mensagem");

  const admin = await login("admin@email.com");
  const carlos = await login("carlos@email.com");
  const ana = await login("ana@email.com");
  const joao = await login("joao@email.com");
  const maria = await login("maria@email.com");
  const carlosComEmailMaiusculo = await login("CARLOS@EMAIL.COM");
  assert(
    carlosComEmailMaiusculo.id === carlos.id,
    "Login com e-mail em maiúsculas não retornou o mesmo usuário",
  );

  const corsPermitido = await fetch(`${BASE}/usuario`, {
    headers: { Origin: "http://127.0.0.1:5500" },
  });
  assert(
    corsPermitido.headers.get("access-control-allow-origin") ===
      "http://127.0.0.1:5500",
    "CORS não liberou a origem configurada",
  );

  const corsNegado = await fetch(`${BASE}/usuario`, {
    headers: { Origin: "http://localhost:9999" },
  });
  assert(
    corsNegado.headers.get("access-control-allow-origin") !==
      "http://localhost:9999",
    "CORS liberou uma origem não configurada",
  );

  const usuarios = await request("/usuario", { token: carlos.token });
  assert(usuarios.status === 200, "GET /usuario falhou");
  assert(usuarios.data.length === 5, "Quantidade inicial de usuários inesperada");
  assert(
    usuarios.data.every((usuario) => usuario.senha_usr === undefined),
    "A senha foi exposta em GET /usuario",
  );
  assert(usuarios.data[0].id_usr, "id_usr não foi exposto");

  const updateDeOutroUsuario = await request(`/usuario/${carlos.id}`, {
    method: "PUT",
    token: joao.token,
    body: { nome_usr: "Alteração indevida" },
  });
  assert(
    updateDeOutroUsuario.status === 403,
    "Usuário comum não deveria alterar outro usuário",
  );

  const deleteDeOutroUsuario = await request(`/usuario/${carlos.id}`, {
    method: "DELETE",
    token: joao.token,
  });
  assert(
    deleteDeOutroUsuario.status === 403,
    "Usuário comum não deveria deletar outro usuário",
  );

  const criarAdminSemPermissao = await request("/usuario", {
    method: "POST",
    token: joao.token,
    body: {
      nome_usr: "Admin Indevido",
      email_usr: "admin-indevido@email.com",
      senha_usr: "123456",
      perfil_usr: "admin",
    },
  });
  assert(
    criarAdminSemPermissao.status === 403,
    "Usuário comum não deveria criar administrador",
  );

  const novoUsuario = await request("/usuario", {
    method: "POST",
    token: admin.token,
    body: {
      nome_usr: "Usuário Cascade",
      email_usr: "cascade@email.com",
      senha_usr: "123456",
      perfil_usr: "usuario",
      faixa_etaria_usr: "20-40",
    },
  });
  assert(novoUsuario.status === 201, "Admin não conseguiu criar usuário");
  const novoUsuarioId = novoUsuario.data.id;
  const cascade = await login("cascade@email.com");

  const atualizacaoPropria = await request(`/usuario/${novoUsuarioId}`, {
    method: "PUT",
    token: cascade.token,
    body: { contato_usr: "11999999999" },
  });
  assert(
    atualizacaoPropria.status === 200,
    `Usuário não conseguiu atualizar o próprio perfil: ${JSON.stringify(atualizacaoPropria.data)}`,
  );

  const disponiveis = await request("/disponibilidade/disponiveis", {
    token: joao.token,
  });
  assert(disponiveis.status === 200, "GET /disponibilidade/disponiveis falhou");
  assert(disponiveis.data.length >= 1, "Nenhuma disponibilidade disponível");

  const novaDisponibilidade = await request("/disponibilidade", {
    method: "POST",
    token: carlos.token,
    body: {
      data_dis: "2026-09-01",
      hora_ini_dis: "08:00",
      hora_fim_dis: "09:00",
    },
  });
  assert(
    novaDisponibilidade.status === 201,
    `Criação de disponibilidade falhou: ${JSON.stringify(novaDisponibilidade.data)}`,
  );
  const idDisponibilidade = novaDisponibilidade.data.id;

  const updateDeOutroVoluntario = await request(
    `/disponibilidade/${idDisponibilidade}`,
    {
      method: "PUT",
      token: ana.token,
      body: {
        data_dis: "2026-09-01",
        hora_ini_dis: "08:00",
        hora_fim_dis: "09:00",
      },
    },
  );
  assert(
    updateDeOutroVoluntario.status === 403,
    "Voluntária não deveria alterar disponibilidade de outro voluntário",
  );

  const deleteDeOutroVoluntario = await request(
    `/disponibilidade/${idDisponibilidade}`,
    { method: "DELETE", token: ana.token },
  );
  assert(
    deleteDeOutroVoluntario.status === 403,
    "Voluntária não deveria excluir disponibilidade de outro voluntário",
  );

  const conflito = await request("/disponibilidade", {
    method: "POST",
    token: carlos.token,
    body: {
      data_dis: "2026-09-01",
      hora_ini_dis: "08:30",
      hora_fim_dis: "09:30",
    },
  });
  assert(conflito.status === 400, "Conflito de horário não foi detectado");

  const dataInexistente = await request("/disponibilidade", {
    method: "POST",
    token: carlos.token,
    body: {
      data_dis: "2026-02-30",
      hora_ini_dis: "08:00",
      hora_fim_dis: "09:00",
    },
  });
  assert(
    dataInexistente.status === 400,
    "Data inexistente deveria retornar 400",
  );

  const horarioInvalido = await request("/disponibilidade", {
    method: "POST",
    token: carlos.token,
    body: {
      data_dis: "2026-09-03",
      hora_ini_dis: "25:00",
      hora_fim_dis: "26:00",
    },
  });
  assert(
    horarioInvalido.status === 400,
    "Horário inválido deveria retornar 400",
  );

  const agendamento = await request("/agendamento", {
    method: "POST",
    token: cascade.token,
    body: {
      id_dis: idDisponibilidade,
      descricao_agn: "Agendamento do teste de cascade",
    },
  });
  assert(
    agendamento.status === 201,
    `Criação de agendamento falhou: ${JSON.stringify(agendamento.data)}`,
  );
  const idAgendamento = agendamento.data.data.id;

  const agendamentosDoUsuario = await request(
    `/agendamento/usuario/${cascade.id}`,
    { token: cascade.token },
  );
  assert(
    agendamentosDoUsuario.status === 200 &&
      agendamentosDoUsuario.data.some(
        (item) => item.id_agn === idAgendamento,
      ),
    "Agendamento não apareceu na listagem do usuário",
  );

  const agendamentosDoVoluntario = await request(
    `/agendamento/voluntario/${carlos.id}`,
    { token: carlos.token },
  );
  assert(
    agendamentosDoVoluntario.status === 200 &&
      agendamentosDoVoluntario.data.some(
        (item) => item.id_agn === idAgendamento,
      ),
    "Agendamento não apareceu na listagem do voluntário",
  );

  const minhasDisponibilidades = await request("/disponibilidade/minhas", {
    token: carlos.token,
  });
  assert(
    minhasDisponibilidades.status === 200 &&
      minhasDisponibilidades.data.some(
        (item) => item.id_dis === idDisponibilidade,
      ),
    "Disponibilidade não apareceu em /disponibilidade/minhas",
  );

  const confirmacaoSemPermissao = await request(
    `/agendamento/confirmar/${idAgendamento}`,
    { method: "PATCH", token: cascade.token },
  );
  assert(
    confirmacaoSemPermissao.status === 403,
    "Usuário não deveria confirmar o próprio agendamento",
  );

  const cancelamentoSemPermissao = await request(
    `/agendamento/cancelar/${idAgendamento}`,
    { method: "PATCH", token: maria.token },
  );
  assert(
    cancelamentoSemPermissao.status === 403,
    "Usuário sem vínculo não deveria cancelar o agendamento",
  );

  const confirmacao = await request(`/agendamento/confirmar/${idAgendamento}`, {
    method: "PATCH",
    token: carlos.token,
  });
  assert(
    confirmacao.status === 200,
    `Confirmação falhou: ${JSON.stringify(confirmacao.data)}`,
  );

  const desconfirmacao = await request(
    `/agendamento/desconfirmar/${idAgendamento}`,
    { method: "PATCH", token: carlos.token },
  );
  assert(
    desconfirmacao.status === 200,
    `Desconfirmação falhou: ${JSON.stringify(desconfirmacao.data)}`,
  );

  const slotPendente = await request(`/disponibilidade/${carlos.id}`, {
    token: joao.token,
  });
  const slotAposDesconfirmar = slotPendente.data.find(
    (item) => item.id_dis === idDisponibilidade,
  );
  assert(
    slotAposDesconfirmar && slotAposDesconfirmar.status_dis === "pendente",
    "Disponibilidade não voltou para pendente após desconfirmação",
  );

  const reconfirmacao = await request(
    `/agendamento/confirmar/${idAgendamento}`,
    { method: "PATCH", token: carlos.token },
  );
  assert(
    reconfirmacao.status === 200,
    `Reconfirmação falhou: ${JSON.stringify(reconfirmacao.data)}`,
  );

  const cancelamento = await request(`/agendamento/cancelar/${idAgendamento}`, {
    method: "PATCH",
    token: cascade.token,
  });
  assert(
    cancelamento.status === 200,
    `Cancelamento falhou: ${JSON.stringify(cancelamento.data)}`,
  );

  const disponibilidadeAposCancelar = await request(
    `/disponibilidade/${carlos.id}`,
    { token: joao.token },
  );
  const slot = disponibilidadeAposCancelar.data.find(
    (item) => item.id_dis === idDisponibilidade,
  );
  assert(slot, "Disponibilidade criada não foi encontrada");
  assert(
    slot.status_dis === "disponivel",
    "Disponibilidade não voltou para disponivel após cancelamento",
  );

  const disponibilidadeParaExcluir = await request("/disponibilidade", {
    method: "POST",
    token: carlos.token,
    body: {
      data_dis: "2026-09-02",
      hora_ini_dis: "10:00",
      hora_fim_dis: "11:00",
    },
  });
  assert(
    disponibilidadeParaExcluir.status === 201,
    "Não foi possível criar a disponibilidade do teste de exclusão",
  );
  const idDisponibilidadeParaExcluir =
    disponibilidadeParaExcluir.data.id;

  const agendamentoParaExcluir = await request("/agendamento", {
    method: "POST",
    token: cascade.token,
    body: {
      id_dis: idDisponibilidadeParaExcluir,
      descricao_agn: "Agendamento que deve sumir com a disponibilidade",
    },
  });
  assert(
    agendamentoParaExcluir.status === 201,
    "Não foi possível criar o agendamento do teste de exclusão",
  );
  const idAgendamentoParaExcluir = agendamentoParaExcluir.data.data.id;

  const exclusaoDisponibilidade = await request(
    `/disponibilidade/${idDisponibilidadeParaExcluir}`,
    { method: "DELETE", token: carlos.token },
  );
  assert(
    exclusaoDisponibilidade.status === 200,
    `Exclusão de disponibilidade falhou: ${JSON.stringify(exclusaoDisponibilidade.data)}`,
  );
  assert(
    (await Agendamento.model.findById(idAgendamentoParaExcluir)) === null,
    "Agendamento não foi removido junto com a disponibilidade",
  );

  const agendamentoParaDeletar = await request("/agendamento", {
    method: "POST",
    token: cascade.token,
    body: {
      id_dis: idDisponibilidade,
      descricao_agn: "Agendamento que será deletado diretamente",
    },
  });
  assert(
    agendamentoParaDeletar.status === 201,
    "Não foi possível criar o agendamento do teste de delete",
  );
  const idAgendamentoParaDeletar = agendamentoParaDeletar.data.data.id;

  const deleteAgendamento = await request(
    `/agendamento/${idAgendamentoParaDeletar}`,
    { method: "DELETE", token: cascade.token },
  );
  assert(
    deleteAgendamento.status === 200,
    `Exclusão de agendamento falhou: ${JSON.stringify(deleteAgendamento.data)}`,
  );

  const slotAposDelete = await Disponibilidade.model.findById(
    idDisponibilidade,
  );
  assert(
    slotAposDelete && slotAposDelete.status_dis === "disponivel",
    "Disponibilidade não foi liberada após excluir o agendamento",
  );

  const disponibilidadeConcorrente = await request("/disponibilidade", {
    method: "POST",
    token: carlos.token,
    body: {
      data_dis: "2026-09-04",
      hora_ini_dis: "14:00",
      hora_fim_dis: "15:00",
    },
  });
  assert(
    disponibilidadeConcorrente.status === 201,
    "Não foi possível criar a disponibilidade do teste de concorrência",
  );
  const idDisponibilidadeConcorrente = disponibilidadeConcorrente.data.id;

  const [reservaJoao, reservaMaria] = await Promise.all([
    request("/agendamento", {
      method: "POST",
      token: joao.token,
      body: {
        id_dis: idDisponibilidadeConcorrente,
        descricao_agn: "Reserva concorrente do João",
      },
    }),
    request("/agendamento", {
      method: "POST",
      token: maria.token,
      body: {
        id_dis: idDisponibilidadeConcorrente,
        descricao_agn: "Reserva concorrente da Maria",
      },
    }),
  ]);

  const statusConcorrencia = [reservaJoao.status, reservaMaria.status].sort();
  assert(
    statusConcorrencia[0] === 201 && statusConcorrencia[1] === 400,
    `Dupla reserva não foi bloqueada: ${JSON.stringify(statusConcorrencia)}`,
  );

  assert(
    (await Agendamento.model.countDocuments({
      id_dis: idDisponibilidadeConcorrente,
    })) === 1,
    "Mais de um agendamento foi criado para o mesmo horário",
  );

  const limpezaConcorrencia = await request(
    `/disponibilidade/${idDisponibilidadeConcorrente}`,
    { method: "DELETE", token: carlos.token },
  );
  assert(
    limpezaConcorrencia.status === 200,
    "Não foi possível limpar a disponibilidade do teste de concorrência",
  );

  const conversas = await request("/conversa/minhas", { token: joao.token });
  assert(conversas.status === 200, "GET /conversa/minhas falhou");
  assert(conversas.data.length >= 1, "Nenhuma conversa encontrada");
  const idConversa = conversas.data[0].id_con;

  const mensagens = await request(`/mensagem/conversa/${idConversa}`, {
    token: joao.token,
  });
  assert(mensagens.status === 200, "GET /mensagem/conversa falhou");
  assert(mensagens.data.length >= 1, "Nenhuma mensagem encontrada");
  assert(mensagens.data[0].nome_usr, "nome_usr não foi retornado");

  const visualizacao = await request(
    `/mensagem/${mensagens.data[0].id_men}/visualizar`,
    { method: "PATCH", token: joao.token },
  );
  assert(
    visualizacao.status === 200,
    `Marcação de mensagem como visualizada falhou: ${JSON.stringify(visualizacao.data)}`,
  );

  const mensagensAposVisualizacao = await request(
    `/mensagem/conversa/${idConversa}`,
    { token: joao.token },
  );
  assert(
    mensagensAposVisualizacao.data[0].visualizada_em,
    "visualizada_em não foi preenchido",
  );

  const { io } = require("socket.io-client");

  const socketSemToken = io(BASE, {
    auth: {},
    transports: ["websocket"],
    reconnection: false,
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout ao validar socket sem token")),
      5000,
    );

    socketSemToken.on("connect_error", (error) => {
      clearTimeout(timer);
      assert(
        /Token não fornecido/.test(error.message),
        `Erro inesperado no socket sem token: ${error.message}`,
      );
      socketSemToken.close();
      resolve();
    });
  });

  const socketMaria = io(BASE, {
    auth: { token: maria.token },
    transports: ["websocket"],
    reconnection: false,
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout ao conectar socket da Maria")),
      5000,
    );

    socketMaria.on("connect", () => {
      clearTimeout(timer);
      resolve();
    });

    socketMaria.on("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout ao validar acesso indevido ao socket")),
      5000,
    );

    socketMaria.on("erro", (message) => {
      clearTimeout(timer);
      assert(
        /permissão/.test(message),
        `Erro inesperado para participante indevido: ${message}`,
      );
      resolve();
    });

    socketMaria.emit("entrar_conversa", idConversa);
  });

  socketMaria.disconnect();

  const socket = io(BASE, {
    auth: { token: joao.token },
    transports: ["websocket"],
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout ao conectar no Socket.IO")),
      5000,
    );

    socket.on("connect", () => {
      clearTimeout(timer);
      resolve();
    });

    socket.on("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  const entrouNaConversa = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout ao entrar na conversa")),
      5000,
    );

    socket.on("entrou_conversa", (message) => {
      clearTimeout(timer);
      resolve(message);
    });

    socket.on("erro", (error) => {
      clearTimeout(timer);
      reject(new Error(error));
    });
  });

  socket.emit("entrar_conversa", idConversa);
  await entrouNaConversa;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout ao validar conversa inválida")),
      5000,
    );

    socket.once("erro", (message) => {
      clearTimeout(timer);
      assert(
        /Conversa inválida/.test(message),
        `Erro inesperado para conversa inválida: ${message}`,
      );
      resolve();
    });

    socket.emit("entrar_conversa", "abc");
  });

  const mensagemRecebida = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout ao receber mensagem")),
      5000,
    );

    socket.on("mensagem_recebida", (message) => {
      clearTimeout(timer);
      resolve(message);
    });
  });

  socket.emit("enviar_mensagem", {
    id_con: idConversa,
    conteudo: "Mensagem enviada pelo smoke test",
  });

  const mensagemSocket = await mensagemRecebida;
  assert(
    mensagemSocket.conteudo_men === "Mensagem enviada pelo smoke test",
    "Mensagem do socket não foi retornada",
  );

  socket.disconnect();

  const historicoAtualizado = await request(`/mensagem/conversa/${idConversa}`, {
    token: joao.token,
  });
  assert(
    historicoAtualizado.data.some(
      (mensagem) =>
        mensagem.conteudo_men === "Mensagem enviada pelo smoke test",
    ),
    "Mensagem do socket não foi persistida",
  );

  const conversaDuplicada = await request("/conversa", {
    method: "POST",
    token: joao.token,
    body: { id_vol: carlos.id },
  });
  assert(
    conversaDuplicada.status === 400,
    "Conversa duplicada deveria retornar 400",
  );

  const usuarioDuplicado = await request("/usuario", {
    method: "POST",
    token: admin.token,
    body: {
      nome_usr: "Duplicado",
      email_usr: "carlos@email.com",
      senha_usr: "123456",
      perfil_usr: "usuario",
    },
  });
  assert(
    usuarioDuplicado.status === 409,
    `E-mail duplicado deveria retornar 409: ${JSON.stringify(usuarioDuplicado.data)}`,
  );

  const idInvalido = await request("/usuario/abc", { token: carlos.token });
  assert(idInvalido.status === 400, "ObjectId inválido deveria retornar 400");

  const semToken = await request("/usuario");
  assert(semToken.status === 401, "Rota protegida sem token deveria retornar 401");

  const tokenInvalido = await request("/usuario", { token: "token-invalido" });
  assert(
    tokenInvalido.status === 401,
    "Rota protegida com token inválido deveria retornar 401",
  );

  // Prepara dados dependentes do usuário que será excluído em cascata.
  const agendamentoCascade = await request("/agendamento", {
    method: "POST",
    token: cascade.token,
    body: {
      id_dis: idDisponibilidade,
      descricao_agn: "Agendamento para testar cascade",
    },
  });
  assert(
    agendamentoCascade.status === 201,
    "Não foi possível criar o agendamento para o teste de cascade",
  );

  const conversaCascade = await request("/conversa", {
    method: "POST",
    token: cascade.token,
    body: { id_vol: carlos.id },
  });
  assert(
    conversaCascade.status === 201,
    `Não foi possível criar a conversa do cascade: ${JSON.stringify(conversaCascade.data)}`,
  );
  const idConversaCascade = conversaCascade.data.id_con;

  await Mensagem.model.create({
    id_con: idConversaCascade,
    id_remetente: novoUsuarioId,
    conteudo_men: "Mensagem do usuário que será excluído",
  });

  const deleteCascade = await request(`/usuario/${novoUsuarioId}`, {
    method: "DELETE",
    token: admin.token,
  });
  assert(
    deleteCascade.status === 200,
    `Exclusão do usuário cascade falhou: ${JSON.stringify(deleteCascade.data)}`,
  );

  assert(
    (await Usuario.model.findById(novoUsuarioId)) === null,
    "Usuário não foi removido",
  );
  assert(
    (await Agendamento.model.find({ id_usr: novoUsuarioId })).length === 0,
    "Agendamentos do usuário não foram removidos",
  );
  assert(
    (
      await Conversa.model.find({
        $or: [{ id_usr: novoUsuarioId }, { id_vol: novoUsuarioId }],
      })
    ).length === 0,
    "Conversas do usuário não foram removidas",
  );
  assert(
    (await Mensagem.model.find({ id_con: idConversaCascade })).length === 0,
    "Mensagens do usuário não foram removidas",
  );

  const slotAposCascade = await Disponibilidade.model.findById(
    idDisponibilidade,
  );
  assert(
    slotAposCascade && slotAposCascade.status_dis === "disponivel",
    "Disponibilidade não foi liberada após o cascade",
  );

  // Agora exclui o voluntário Carlos e verifica os dependentes dele.
  const conversasCarlos = await Conversa.model.find({
    $or: [{ id_usr: carlos.id }, { id_vol: carlos.id }],
  });
  const idsConversasCarlos = conversasCarlos.map((conversa) => conversa._id);

  const deleteCarlos = await request(`/usuario/${carlos.id}`, {
    method: "DELETE",
    token: admin.token,
  });
  assert(
    deleteCarlos.status === 200,
    `Exclusão do Carlos falhou: ${JSON.stringify(deleteCarlos.data)}`,
  );

  assert(
    (await Usuario.model.findById(carlos.id)) === null,
    "Voluntário não foi removido",
  );
  assert(
    (await Disponibilidade.model.find({ id_vol: carlos.id })).length === 0,
    "Disponibilidades do voluntário não foram removidas",
  );
  assert(
    (
      await Agendamento.model.find({
        $or: [{ id_usr: carlos.id }, { id_vol: carlos.id }],
      })
    ).length === 0,
    "Agendamentos do voluntário não foram removidos",
  );
  assert(
    (
      await Conversa.model.find({
        $or: [{ id_usr: carlos.id }, { id_vol: carlos.id }],
      })
    ).length === 0,
    "Conversas do voluntário não foram removidas",
  );
  assert(
    (
      await Mensagem.model.find({ id_con: { $in: idsConversasCarlos } })
    ).length === 0,
    "Mensagens das conversas do voluntário não foram removidas",
  );

  console.log(`Smoke test concluído (${useReplSet ? "replica set" : "standalone"}).`);
  console.log(
    JSON.stringify(
      {
        usuariosIniciais: usuarios.data.length,
        disponiveis: disponiveis.data.length,
        idDisponibilidade,
        idAgendamento,
        idConversa,
        mensagens: mensagens.data.length,
      },
      null,
      2,
    ),
  );

  await mongod.stop();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("FALHA NO SMOKE TEST:", error);
    process.exit(1);
  });
