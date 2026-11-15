// Chat real: lista de conversas via API, histórico via REST e
// mensagens em tempo real via Socket.IO.

let socket = null;
let conversas = [];
let conversaAtiva = null;
let usuarioAtual = null;

document.addEventListener('DOMContentLoaded', iniciarChat);

async function iniciarChat() {
    usuarioAtual = window.getCurrentUser?.();

    if (!usuarioAtual) {
        // O routeGuard já redireciona, mas evita erros no console.
        return;
    }

    ajustarNavegacao();
    configurarEventos();

    await carregarConversas();

    try {
        await conectarSocket();
    } catch (error) {
        console.error(error);
        mostrarToast('Não foi possível conectar ao chat em tempo real.');
    }
}

function ajustarNavegacao() {
    const painel = usuarioAtual.perfil === 'voluntario'
        ? 'paginavolu.html'
        : 'paginapac.html';

    document.querySelector('.btn-back')?.setAttribute('href', painel);

    document.querySelectorAll('.menu-links a').forEach((link) => {
        if (link.getAttribute('href') === 'paginapac.html') {
            link.setAttribute('href', painel);
        }
    });

    // Voluntários não iniciam conversas: o backend exige perfil "usuario".
    if (usuarioAtual.perfil === 'voluntario') {
        const btnNova = document.getElementById('btn-nova-conversa');
        if (btnNova) btnNova.style.display = 'none';
    }
}

function configurarEventos() {
    document.getElementById('chatForm')?.addEventListener('submit', enviarMensagem);

    document.getElementById('btn-nova-conversa')?.addEventListener('click', abrirNovaConversa);

    document.getElementById('searchContact')?.addEventListener('input', function () {
        filtrarContatos(this.value.trim().toLowerCase());
    });

    document.getElementById('messageInput')?.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            document.getElementById('chatForm')?.requestSubmit();
        }
    });

    document.getElementById('btn-info')?.addEventListener('click', function () {
        if (!conversaAtiva) return;
        const nome = nomeDaConversa(conversaAtiva);
        const especialidade = conversaAtiva.voluntario_especialidade;
        mostrarToast(especialidade ? `${nome} — ${especialidade}` : nome);
    });

    window.addEventListener('beforeunload', () => socket?.disconnect());
}

async function carregarConversas(idSelecionado) {
    const lista = document.getElementById('contactList');

    try {
        const resultado = await window.apiFetch('/conversa/minhas');
        conversas = Array.isArray(resultado) ? resultado : [];
    } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        conversas = [];
        mostrarToast(error.message || 'Erro ao carregar conversas.');
    }

    renderContatos();

    const idParam = idSelecionado || new URLSearchParams(window.location.search).get('id_con');
    const atual = conversaAtiva?.id_con;

    const alvo = conversas.find((conversa) => String(conversa.id_con) === String(idParam))
        || conversas.find((conversa) => String(conversa.id_con) === String(atual))
        || conversas[0];

    if (alvo) {
        selecionarConversa(alvo, true);
    } else {
        conversaAtiva = null;
        renderSemConversa();
        if (lista && lista.children.length === 0) {
            const vazio = document.createElement('li');
            vazio.className = 'contact contact-empty';
            vazio.innerHTML = '<div><strong>Sem conversas</strong><p>Nenhuma conversa encontrada.</p></div>';
            lista.appendChild(vazio);
        }
    }
}

function nomeDaConversa(conversa) {
    if (!conversa) return 'Conversa';

    if (usuarioAtual.perfil === 'voluntario') {
        return conversa.usuario_nome || 'Usuário';
    }

    return conversa.voluntario_nome || 'Voluntário';
}

function gerarIniciais(nome) {
    if (!nome) return '?';

    const partes = String(nome).trim().split(/\s+/);
    if (partes.length >= 2) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

    return String(nome).substring(0, 2).toUpperCase();
}

function renderContatos() {
    const lista = document.getElementById('contactList');
    if (!lista) return;

    lista.innerHTML = '';

    conversas.forEach((conversa) => {
        const nome = nomeDaConversa(conversa);
        const item = document.createElement('li');

        item.className = 'contact';
        item.dataset.contact = nome;
        item.dataset.id = conversa.id_con;

        if (conversaAtiva && String(conversa.id_con) === String(conversaAtiva.id_con)) {
            item.classList.add('active');
        }

        const avatar = document.createElement('div');
        avatar.className = 'contact-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = gerarIniciais(nome);

        const info = document.createElement('div');

        const nomeEl = document.createElement('strong');
        nomeEl.textContent = nome;

        const previa = document.createElement('p');
        previa.textContent = conversa.ultima_mensagem
            ? String(conversa.ultima_mensagem).slice(0, 60)
            : 'Sem mensagens ainda';

        info.append(nomeEl, previa);
        item.append(avatar, info);

        item.addEventListener('click', () => selecionarConversa(conversa));
        lista.appendChild(item);
    });
}

async function selecionarConversa(conversa, forcar = false) {
    if (!conversa) return;
    if (!forcar && conversaAtiva && String(conversa.id_con) === String(conversaAtiva.id_con)) return;

    if (socket && conversaAtiva && String(conversaAtiva.id_con) !== String(conversa.id_con)) {
        socket.emit('sair_conversa', conversaAtiva.id_con);
    }

    conversaAtiva = conversa;

    document.querySelectorAll('#contactList .contact').forEach((item) => {
        item.classList.toggle('active', item.dataset.id === String(conversa.id_con));
    });

    const titulo = document.getElementById('chatTitle');
    if (titulo) titulo.textContent = nomeDaConversa(conversa);

    if (socket?.connected) {
        socket.emit('entrar_conversa', conversa.id_con);
    }

    const url = new URL(window.location.href);
    url.searchParams.set('id_con', conversa.id_con);
    window.history.replaceState({}, '', url);

    await carregarHistorico(conversa.id_con);
}

async function carregarHistorico(idCon) {
    const lista = document.getElementById('messageList');
    if (!lista) return;

    lista.innerHTML = '<p class="chat-empty">Carregando mensagens...</p>';

    let mensagens = [];

    try {
        mensagens = await window.apiFetch(`/mensagem/conversa/${idCon}`);
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        lista.innerHTML = '<p class="chat-empty">Não foi possível carregar as mensagens.</p>';
        return;
    }

    lista.innerHTML = '';

    if (!Array.isArray(mensagens) || mensagens.length === 0) {
        const vazio = document.createElement('p');
        vazio.className = 'chat-empty';
        vazio.textContent = 'Nenhuma mensagem ainda. Envie a primeira!';
        lista.appendChild(vazio);
        return;
    }

    mensagens.forEach((mensagem) => renderMensagem(mensagem));
    marcarComoVisualizadas(mensagens);
    rolarParaFim();
}

function renderMensagem(mensagem) {
    const lista = document.getElementById('messageList');
    if (!lista) return;

    lista.querySelector('.chat-empty')?.remove();

    const propria = String(mensagem.id_remetente) === String(usuarioAtual.id);
    const dia = chaveDoDia(mensagem.enviada_em);

    // Só cria um novo separador quando o dia muda em relação à última mensagem.
    const anteriores = lista.querySelectorAll('.message');
    const diaAnterior = anteriores.length
        ? anteriores[anteriores.length - 1].dataset.dia
        : null;

    if (dia !== diaAnterior) {
        lista.appendChild(criarSeparadorDeData(mensagem.enviada_em, dia));
    }

    const item = document.createElement('div');
    item.className = `message ${propria ? 'sent' : 'received'}`;
    item.dataset.dia = dia;

    const texto = document.createElement('p');
    texto.textContent = mensagem.conteudo_men;

    const hora = document.createElement('span');
    hora.textContent = formatarHora(mensagem.enviada_em);

    const dataCompleta = formatarDataCompleta(mensagem.enviada_em);
    if (dataCompleta) hora.title = dataCompleta;

    item.append(texto, hora);
    lista.appendChild(item);
    rolarParaFim();
}

function criarSeparadorDeData(data, dia) {
    const rotulo = rotuloDoDia(data);

    const separador = document.createElement('div');
    separador.className = 'chat-date-divider';
    separador.dataset.dia = dia;
    separador.setAttribute('role', 'separator');
    separador.setAttribute('aria-label', `Mensagens de ${rotulo.toLowerCase()}`);

    const texto = document.createElement('span');
    texto.textContent = rotulo;
    separador.appendChild(texto);

    return separador;
}

function inicioDoDia(data) {
    const date = new Date(data);
    date.setHours(0, 0, 0, 0);
    return date;
}

function chaveDoDia(data) {
    const date = new Date(data);
    if (Number.isNaN(date.getTime())) return 'sem-data';

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
}

function rotuloDoDia(data) {
    const date = new Date(data);
    if (Number.isNaN(date.getTime())) return 'Mensagens anteriores';

    const hoje = inicioDoDia(new Date());
    const alvo = inicioDoDia(date);
    const diferencaEmDias = Math.round((hoje - alvo) / 86400000);

    if (diferencaEmDias === 0) return 'Hoje';
    if (diferencaEmDias === 1) return 'Ontem';

    const opcoes = { weekday: 'long', day: '2-digit', month: 'long' };
    if (alvo.getFullYear() !== hoje.getFullYear()) opcoes.year = 'numeric';

    const rotulo = alvo.toLocaleDateString('pt-BR', opcoes);
    return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

function formatarDataCompleta(data) {
    const date = new Date(data);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatarHora(data) {
    if (!data) return 'Agora';

    const date = new Date(data);
    if (Number.isNaN(date.getTime())) return 'Agora';

    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function rolarParaFim() {
    const lista = document.getElementById('messageList');
    if (lista) lista.scrollTop = lista.scrollHeight;
}

function marcarComoVisualizadas(mensagens) {
    mensagens.forEach((mensagem) => {
        const recebida = String(mensagem.id_remetente) !== String(usuarioAtual.id);

        if (recebida && !mensagem.visualizada_em) {
            window.apiFetch(`/mensagem/${mensagem.id_men}/visualizar`, { method: 'PATCH' })
                .catch(() => {});
        }
    });
}

function enviarMensagem(event) {
    event.preventDefault();

    const input = document.getElementById('messageInput');
    const texto = input?.value.trim();

    if (!texto) return;

    if (!conversaAtiva) {
        mostrarToast('Selecione uma conversa antes de enviar.');
        return;
    }

    if (!socket?.connected) {
        mostrarToast('Sem conexão com o chat. Recarregue a página.');
        return;
    }

    socket.emit('enviar_mensagem', {
        id_con: conversaAtiva.id_con,
        conteudo: texto
    });

    input.value = '';
    input.focus();
}

function renderSemConversa() {
    const titulo = document.getElementById('chatTitle');
    if (titulo) titulo.textContent = 'Nenhuma conversa';

    const lista = document.getElementById('messageList');
    if (lista) {
        lista.innerHTML = '<p class="chat-empty">Selecione ou inicie uma conversa para começar.</p>';
    }
}

function filtrarContatos(query) {
    document.querySelectorAll('#contactList .contact').forEach((contato) => {
        const nome = (contato.dataset.contact || '').toLowerCase();
        contato.style.display = nome.includes(query) ? '' : 'none';
    });
}

function mostrarToast(texto) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = texto;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hidden');
    }, 3000);
}

function carregarClienteSocketIO() {
    return new Promise((resolve, reject) => {
        if (window.io) return resolve(window.io);

        const script = document.createElement('script');
        script.src = `${window.API_BASE_URL}/socket.io/socket.io.js`;
        script.onload = () => resolve(window.io);
        script.onerror = () => reject(new Error('Falha ao carregar o cliente Socket.IO'));
        document.head.appendChild(script);
    });
}

async function conectarSocket() {
    const io = await carregarClienteSocketIO();
    const token = window.getAuthToken();

    socket = io(window.API_BASE_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        if (conversaAtiva) {
            socket.emit('entrar_conversa', conversaAtiva.id_con);
        }
    });

    socket.on('connect_error', (error) => {
        console.error('Erro de conexão no socket:', error.message);
        mostrarToast('Não foi possível conectar ao chat em tempo real.');
    });

    socket.on('erro', (mensagem) => {
        mostrarToast(typeof mensagem === 'string' ? mensagem : 'Erro no chat.');
    });

    socket.on('mensagem_recebida', (mensagem) => {
        if (!conversaAtiva || String(mensagem.id_con) !== String(conversaAtiva.id_con)) {
            return;
        }

        renderMensagem(mensagem);

        if (String(mensagem.id_remetente) !== String(usuarioAtual.id)) {
            window.apiFetch(`/mensagem/${mensagem.id_men}/visualizar`, { method: 'PATCH' })
                .catch(() => {});
        }

        atualizarPrevia(mensagem.conteudo_men);
    });

    // Caso a conexão já esteja pronta antes do listener acima.
    if (socket.connected && conversaAtiva) {
        socket.emit('entrar_conversa', conversaAtiva.id_con);
    }
}

function atualizarPrevia(conteudo) {
    if (!conversaAtiva) return;

    conversaAtiva.ultima_mensagem = conteudo;

    const item = document.querySelector(
        `#contactList .contact[data-id="${conversaAtiva.id_con}"] p`
    );

    if (item) item.textContent = String(conteudo).slice(0, 60);
}

async function abrirNovaConversa() {
    if (usuarioAtual.perfil !== 'usuario') return;

    const lista = document.getElementById('contactList');
    if (!lista) return;

    lista.innerHTML = '<li class="contact contact-empty"><div><strong>Carregando...</strong><p>Buscando voluntários disponíveis.</p></div></li>';

    let disponibilidades = [];

    try {
        disponibilidades = await window.apiFetch('/disponibilidade/disponiveis');
    } catch (error) {
        if (error.status !== 404) {
            console.error('Erro ao carregar voluntários:', error);
        }
    }

    const voluntarios = new Map();

    (Array.isArray(disponibilidades) ? disponibilidades : []).forEach((disp) => {
        const id = typeof disp.id_vol === 'object' ? disp.id_vol?._id : disp.id_vol;
        if (!id) return;

        const chave = String(id);
        if (voluntarios.has(chave)) return;

        voluntarios.set(chave, {
            id: chave,
            nome: disp.nome_usr || 'Voluntário',
            especialidade: disp.especialidade_vol || 'Sem especialidade informada'
        });
    });

    lista.innerHTML = '';

    if (voluntarios.size === 0) {
        const vazio = document.createElement('li');
        vazio.className = 'contact contact-empty';
        vazio.innerHTML = '<div><strong>Nenhum voluntário</strong><p>Não há horários disponíveis no momento.</p></div>';
        lista.appendChild(vazio);
    } else {
        voluntarios.forEach((voluntario) => {
            const item = document.createElement('li');
            item.className = 'contact';
            item.dataset.contact = voluntario.nome;

            const avatar = document.createElement('div');
            avatar.className = 'contact-avatar';
            avatar.setAttribute('aria-hidden', 'true');
            avatar.textContent = gerarIniciais(voluntario.nome);

            const info = document.createElement('div');

            const nome = document.createElement('strong');
            nome.textContent = voluntario.nome;

            const especialidade = document.createElement('p');
            especialidade.textContent = voluntario.especialidade;

            info.append(nome, especialidade);
            item.append(avatar, info);

            item.addEventListener('click', () => iniciarConversa(voluntario));
            lista.appendChild(item);
        });
    }

    const voltar = document.createElement('li');
    voltar.className = 'contact';
    voltar.innerHTML = '<div><strong>Voltar</strong><p>Retornar às minhas conversas</p></div>';
    voltar.addEventListener('click', () => carregarConversas());
    lista.appendChild(voltar);
}

async function iniciarConversa(voluntario) {
    try {
        const conversa = await window.apiFetch('/conversa', {
            method: 'POST',
            body: { id_vol: voluntario.id }
        });

        await carregarConversas(conversa.id_con);
    } catch (error) {
        if (error.status === 400) {
            await carregarConversas();

            const existente = conversas.find(
                (conversa) => String(conversa.id_vol) === voluntario.id
            );

            if (existente) {
                await carregarConversas(existente.id_con);
                return;
            }
        }

        mostrarToast(error.message || 'Não foi possível iniciar a conversa.');
        await carregarConversas();
    }
}
