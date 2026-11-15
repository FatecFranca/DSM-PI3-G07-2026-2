// Aguarda que as funções de auth estejam disponíveis
function waitForAuthFunctions(timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const checkAuth = () => {
            if (typeof window.getCurrentUser === 'function' && typeof window.getAuthToken === 'function') {
                resolve(true);
            } else if (Date.now() - startTime < timeout) {
                setTimeout(checkAuth, 100);
            } else {
                console.error('voluDashboard: timeout aguardando auth functions');
                resolve(false);
            }
        };
        checkAuth();
    });
}

async function loadVoluntarioData() {
    // Aguardar que auth functions estejam disponíveis
    const user = window.getCurrentUser();
    if (!user || !user.id) {
        console.error('Usuário não autenticado');
        document.getElementById('volunteerName').textContent = 'Voluntário';
        return;
    }

    try {
        const user = window.getCurrentUser();
        
        if (!user || !user.id) {
            console.error('Usuário não autenticado ou ID não encontrado');
            // exibir valores padrão
            const nameEl = document.getElementById('volunteerName');
            if (nameEl) nameEl.textContent = 'Voluntário';
            const convEl = document.getElementById('stat-conversas');
            if (convEl) convEl.textContent = '0';
            const pedEl = document.getElementById('stat-pedidos');
            if (pedEl) pedEl.textContent = '0';
            return;
        }

        const userId = user.id;
        const token = window.getAuthToken();
        
        if (!token) {
            console.error('voluDashboard: Token não encontrado');
            return;
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 1. Carregar nome do usuário
        try {
            const usuarioResponse = await fetch(`${window.API_BASE_URL}/usuario/${userId}`, { headers });
            
            if (usuarioResponse.ok) {
                const usuario = await usuarioResponse.json();
                const nome = usuario.nome_usr || 'Voluntário';

                const volunteerNameElement = document.getElementById('volunteerName');
                if (volunteerNameElement) volunteerNameElement.textContent = nome;

                const profileNameElement = document.getElementById('profileName');
                if (profileNameElement) profileNameElement.textContent = nome;

                const profileEmailElement = document.getElementById('profileEmail');
                if (profileEmailElement && usuario.email_usr) {
                    profileEmailElement.textContent = usuario.email_usr;
                }

                const profileAreaElement = document.getElementById('profileArea');
                if (profileAreaElement) {
                    profileAreaElement.textContent = usuario.especialidade_vol || 'Escuta ativa e apoio emocional';
                }
            } else {
                const errorData = await usuarioResponse.json().catch(() => ({}));
                console.error('Erro ao carregar usuário:', usuarioResponse.status, errorData);
                const nameEl = document.getElementById('volunteerName');
                if (nameEl) nameEl.textContent = 'Voluntário';
                const profileNameEl = document.getElementById('profileName');
                if (profileNameEl) profileNameEl.textContent = 'Voluntário';
            }
        } catch (error) {
            console.error('Erro ao carregar nome:', error);
            const nameEl = document.getElementById('volunteerName');
            if (nameEl) nameEl.textContent = 'Voluntário';
            const profileNameEl = document.getElementById('profileName');
            if (profileNameEl) profileNameEl.textContent = 'Voluntário';
        }

        // 2. Carregar conversas ativas
        try {
            const conversasResponse = await fetch(`${window.API_BASE_URL}/conversa/minhas`, { headers });
            
            if (conversasResponse.ok) {
                const conversas = await conversasResponse.json();
                const countConversas = Array.isArray(conversas) ? conversas.length : 0;
                const statConversasElement = document.getElementById('stat-conversas');
                if (statConversasElement) {
                    statConversasElement.textContent = String(countConversas);
                }
            } else {
                const errorData = await conversasResponse.json().catch(() => ({}));
                console.error('Erro ao carregar conversas:', conversasResponse.status, errorData);
                const convEl = document.getElementById('stat-conversas');
                if (convEl) convEl.textContent = '0';
            }
        } catch (error) {
            console.error('Erro ao carregar conversas:', error);
            const convEl = document.getElementById('stat-conversas');
            if (convEl) convEl.textContent = '0';
        }

        // 3. Carregar agendamentos pendentes (pedidos)
        try {
            const agendamentosResponse = await fetch(`${window.API_BASE_URL}/agendamento/voluntario/${userId}`, { headers });
            
            if (agendamentosResponse.ok) {
                const agendamentos = await agendamentosResponse.json();
                const pendentes = Array.isArray(agendamentos) 
                    ? agendamentos.filter(agn => agn.status_agn === 'pendente').length 
                    : 0;
                const statPedidosElement = document.getElementById('stat-pedidos');
                if (statPedidosElement) {
                    statPedidosElement.textContent = String(pendentes);
                }
            } else {
                const errorData = await agendamentosResponse.json().catch(() => ({}));
                console.error('Erro ao carregar agendamentos:', agendamentosResponse.status, errorData);
                const pedEl = document.getElementById('stat-pedidos');
                if (pedEl) pedEl.textContent = '0';
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            const pedEl = document.getElementById('stat-pedidos');
            if (pedEl) pedEl.textContent = '0';
        }
    } catch (error) {
        console.error('Erro geral ao carregar dados:', error);
    }
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', loadVoluntarioData);
