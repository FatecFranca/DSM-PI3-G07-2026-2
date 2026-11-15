// Aguardar que as funções de auth estejam disponíveis
async function waitForAuthFunctions(timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (window.getCurrentUser && window.getAuthToken && window.API_BASE_URL) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Auth functions não disponíveis');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char];
    });
}

// Carregar conversas reais do backend
async function loadPacConversas() {
    try {
        await waitForAuthFunctions();

        const user = window.getCurrentUser();
        const token = window.getAuthToken();

        if (!user || !token) {
            console.error('Usuário não autenticado');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            const conversasResponse = await fetch(`${window.API_BASE_URL}/conversa/minhas`, { headers });

            if (conversasResponse.ok) {
                const conversas = await conversasResponse.json();
                renderConversasList(conversas);
            } else {
                console.error('Erro ao carregar conversas:', conversasResponse.status);
                renderConversasEmpty();
            }
        } catch (error) {
            console.error('Erro ao carregar conversas:', error);
            renderConversasEmpty();
        }
    } catch (error) {
        console.error('Erro geral ao carregar conversas:', error);
    }
}

function criarBotaoNovaConversa() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-primary';
    btn.textContent = '+ Iniciar nova conversa';
    btn.addEventListener('click', criarNovaConversa);
    return btn;
}

// Renderizar lista de conversas
function renderConversasList(conversas) {
    const chatContainer = document.querySelector('.chat-container .card-body.chat-body');

    if (!chatContainer) return;

    chatContainer.innerHTML = '';

    const title = document.createElement('h3');
    title.className = 'chat-section-title';
    title.textContent = 'Minhas conversas com voluntários';
    chatContainer.appendChild(title);

    if (Array.isArray(conversas) && conversas.length > 0) {
        const conversasList = document.createElement('div');
        conversasList.className = 'conversas-lista';

        conversas.forEach(conversa => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'conversa-item';

            const nome = conversa.voluntario_nome || 'Voluntário';
            const iniciais = gerarIniciais(nome);
            const dataFormatada = conversa.criada_em
                ? new Date(conversa.criada_em).toLocaleDateString('pt-BR')
                : 'Data não disponível';

            item.innerHTML = `
                <span class="conversa-avatar" aria-hidden="true">${escapeHtml(iniciais)}</span>
                <span class="conversa-info">
                    <span class="conversa-nome">${escapeHtml(nome)}</span>
                    <span class="conversa-data">Criada em ${escapeHtml(dataFormatada)}</span>
                </span>
                <span class="conversa-status">Abrir</span>
            `;

            item.addEventListener('click', () => {
                abrirConversa(conversa);
            });

            conversasList.appendChild(item);
        });

        chatContainer.appendChild(conversasList);
    } else {
        const empty = document.createElement('p');
        empty.className = 'chat-empty';
        empty.textContent = 'Você ainda não tem conversas com voluntários.';
        chatContainer.appendChild(empty);
    }

    chatContainer.appendChild(criarBotaoNovaConversa());
}

// Renderizar estado vazio
function renderConversasEmpty() {
    renderConversasList([]);
}

// Abrir conversa existente no chat
function abrirConversa(conversa) {
    if (!conversa?.id_con) {
        alert('Não foi possível abrir esta conversa.');
        return;
    }

    window.location.href = `chat.html?id_con=${encodeURIComponent(conversa.id_con)}`;
}

// Lista voluntários com horário disponível para iniciar uma conversa
async function criarNovaConversa() {
    const chatContainer = document.querySelector('.chat-container .card-body.chat-body');
    if (!chatContainer) return;

    chatContainer.innerHTML = '';

    const titulo = document.createElement('h3');
    titulo.className = 'chat-section-title';
    titulo.textContent = 'Escolha um voluntário';
    chatContainer.appendChild(titulo);

    const carregando = document.createElement('p');
    carregando.className = 'chat-empty';
    carregando.textContent = 'Carregando voluntários disponíveis...';
    chatContainer.appendChild(carregando);

    let disponibilidades = [];

    try {
        disponibilidades = await window.apiFetch('/disponibilidade/disponiveis');
    } catch (error) {
        if (error.status !== 404) {
            console.error('Erro ao carregar voluntários:', error);
        }
        disponibilidades = [];
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

    carregando.remove();

    if (voluntarios.size === 0) {
        const vazio = document.createElement('p');
        vazio.className = 'chat-empty';
        vazio.textContent = 'Nenhum voluntário com horário disponível no momento.';
        chatContainer.appendChild(vazio);
    } else {
        const lista = document.createElement('div');
        lista.className = 'conversas-lista';

        voluntarios.forEach((voluntario) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'conversa-item';

            item.innerHTML = `
                <span class="conversa-avatar" aria-hidden="true">${escapeHtml(gerarIniciais(voluntario.nome))}</span>
                <span class="conversa-info">
                    <span class="conversa-nome">${escapeHtml(voluntario.nome)}</span>
                    <span class="conversa-data">${escapeHtml(voluntario.especialidade)}</span>
                </span>
                <span class="conversa-status">Conversar</span>
            `;

            item.addEventListener('click', () => iniciarConversa(voluntario));
            lista.appendChild(item);
        });

        chatContainer.appendChild(lista);
    }

    const voltar = document.createElement('button');
    voltar.type = 'button';
    voltar.className = 'btn-secondary';
    voltar.textContent = 'Voltar para minhas conversas';
    voltar.addEventListener('click', () => loadPacConversas());
    chatContainer.appendChild(voltar);
}

async function iniciarConversa(voluntario) {
    try {
        const conversa = await window.apiFetch('/conversa', {
            method: 'POST',
            body: { id_vol: voluntario.id }
        });

        window.location.href = `chat.html?id_con=${encodeURIComponent(conversa.id_con)}`;
    } catch (error) {
        // Conversa já existente: abre a existente em vez de falhar.
        if (error.status === 400) {
            try {
                const conversas = await window.apiFetch('/conversa/minhas');
                const existente = (Array.isArray(conversas) ? conversas : [])
                    .find((conversa) => String(conversa.id_vol) === voluntario.id);

                if (existente) {
                    window.location.href = `chat.html?id_con=${encodeURIComponent(existente.id_con)}`;
                    return;
                }
            } catch (buscaError) {
                console.error('Erro ao buscar conversa existente:', buscaError);
            }
        }

        alert(error.message || 'Não foi possível iniciar a conversa.');
    }
}

// Calcular tempo relativo (ex: "Há 2 horas")
function calcularTempoRelativo(data) {
    if (!data) return 'Recentemente';

    const agora = new Date();
    const dataEvento = new Date(data);
    const diffMs = agora - dataEvento;
    const diffMinutos = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMinutos < 1) return 'Agora';
    if (diffMinutos < 60) return `Há ${diffMinutos} minuto${diffMinutos > 1 ? 's' : ''}`;
    if (diffHoras < 24) return `Há ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    if (diffDias < 7) return `Há ${diffDias} dia${diffDias > 1 ? 's' : ''}`;

    return dataEvento.toLocaleDateString('pt-BR');
}

// Gerar iniciais para avatar
function gerarIniciais(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(' ');
    if (partes.length >= 2) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
}

// Carregar mensagens recentes para a página inicial
async function loadMensagensRecentes() {
    try {
        await waitForAuthFunctions();

        const user = window.getCurrentUser();
        const token = window.getAuthToken();

        if (!user || !token) return;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            const conversasResponse = await fetch(`${window.API_BASE_URL}/conversa/minhas`, { headers });

            if (conversasResponse.ok) {
                const conversas = await conversasResponse.json();
                renderMensagensRecentes(conversas);
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens recentes:', error);
        }
    } catch (error) {
        console.error('Erro ao carregar mensagens recentes:', error);
    }
}

// Renderizar mensagens recentes na página inicial
function renderMensagensRecentes(conversas) {
    let cardBody = null;
    const allCards = document.querySelectorAll('.card-dashboard');

    for (const card of allCards) {
        const header = card.querySelector('.card-header h2');
        if (header && header.textContent.includes('Mensagens recentes')) {
            cardBody = card.querySelector('.card-body');
            break;
        }
    }

    if (!cardBody) return;

    cardBody.innerHTML = '';

    const conversasRecentes = Array.isArray(conversas) && conversas.length > 0
        ? conversas.slice(0, 2)
        : [];

    if (conversasRecentes.length > 0) {
        conversasRecentes.forEach(conversa => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'mensagem-item';

            const iniciais = gerarIniciais(conversa.voluntario_nome);
            const tempoRelativo = calcularTempoRelativo(conversa.criada_em);
            const mensagemPrevia = conversa.ultima_mensagem || 'Nenhuma mensagem ainda';
            const nomeLimitado = conversa.voluntario_nome || 'Voluntário';

            item.innerHTML = `
                <span class="mensagem-avatar" aria-hidden="true">${escapeHtml(iniciais)}</span>
                <span class="mensagem-info">
                    <span class="mensagem-nome">${escapeHtml(nomeLimitado)}</span>
                    <span class="ultima-msg">${escapeHtml(mensagemPrevia.substring(0, 50))}${mensagemPrevia.length > 50 ? '...' : ''}</span>
                    <span class="hora">${escapeHtml(tempoRelativo)}</span>
                </span>
            `;

            item.addEventListener('click', () => {
                abrirConversa(conversa);
            });

            cardBody.appendChild(item);
        });
    } else {
        const empty = document.createElement('p');
        empty.className = 'chat-empty';
        empty.textContent = 'Você ainda não tem conversas.';
        cardBody.appendChild(empty);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-novo-chat';
    btn.textContent = '+ Iniciar nova conversa';
    btn.addEventListener('click', () => {
        document.querySelector('.tab-btn[data-tab="chat"]')?.click();
        criarNovaConversa();
    });
    cardBody.appendChild(btn);
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', async function () {
    await loadPacConversas();
    await loadMensagensRecentes();
});
