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

// Carregar conversas do voluntário
async function loadConversasVoluntario() {
    try {
        await waitForAuthFunctions();
        
        const user = window.getCurrentUser();
        const token = window.getAuthToken();
        
        if (!user || !token) {
            console.error('Usuário não autenticado');
            renderConversasEmpty();
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(`${window.API_BASE_URL}/conversa/minhas`, { headers });
            
            if (response.ok) {
                const conversas = await response.json();
                renderConversas(conversas);
            } else if (response.status === 404) {
                renderConversasEmpty();
            } else {
                console.error('Erro ao carregar conversas:', response.status);
                renderConversasEmpty();
            }
        } catch (error) {
            console.error('Erro ao carregar conversas:', error);
            renderConversasEmpty();
        }
    } catch (error) {
        console.error('Erro geral ao carregar conversas:', error);
        renderConversasEmpty();
    }
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

// Calcular tempo relativo
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

// Renderizar conversas
function renderConversas(conversas) {
    const conversasList = document.querySelector('#mensagens .conversas-lista');

    if (!conversasList) return;

    conversasList.innerHTML = '';

    if (!Array.isArray(conversas) || conversas.length === 0) {
        renderConversasEmpty();
        return;
    }

    conversas.forEach(conversa => {
        const nome = conversa.usuario_nome || 'Usuário';
        const iniciais = gerarIniciais(nome);
        const tempoRelativo = calcularTempoRelativo(conversa.criada_em);
        const mensagemPrevia = String(conversa.ultima_mensagem || 'Sem mensagens ainda');

        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'conversa-item ativa';
        item.setAttribute('aria-label', `Abrir conversa com ${nome}`);

        const avatar = document.createElement('span');
        avatar.className = 'conversa-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = iniciais;

        const info = document.createElement('span');
        info.className = 'conversa-info';

        const nomeEl = document.createElement('span');
        nomeEl.className = 'conversa-nome';
        nomeEl.textContent = nome;

        const previaEl = document.createElement('span');
        previaEl.className = 'ultima-msg';
        previaEl.textContent = mensagemPrevia.length > 60
            ? `${mensagemPrevia.substring(0, 60)}...`
            : mensagemPrevia;

        const tempoEl = document.createElement('span');
        tempoEl.className = 'conversa-data';
        tempoEl.textContent = tempoRelativo;

        info.append(nomeEl, previaEl, tempoEl);

        const status = document.createElement('span');
        status.className = 'conversa-status';
        status.textContent = 'Ativa';

        item.append(avatar, info, status);

        item.addEventListener('click', () => {
            if (!conversa.id_con) return;
            window.location.href = `chat.html?id_con=${encodeURIComponent(conversa.id_con)}`;
        });

        conversasList.appendChild(item);
    });
}

// Renderizar estado vazio
function renderConversasEmpty() {
    const conversasList = document.querySelector('#mensagens .conversas-lista');

    if (!conversasList) return;

    conversasList.innerHTML = '';

    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const titulo = document.createElement('h3');
    titulo.textContent = 'Você não tem conversas ativas no momento';

    const texto = document.createElement('p');
    texto.textContent = 'Quando um paciente iniciar uma conversa, ela aparecerá aqui.';

    empty.append(titulo, texto);
    conversasList.appendChild(empty);
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', async function() {
    await loadConversasVoluntario();
});
