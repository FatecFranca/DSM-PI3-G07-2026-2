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

// Carregar agendamentos pendentes do voluntário
async function loadPedidosAgendamento() {
    try {
        await waitForAuthFunctions();
        
        const user = window.getCurrentUser();
        const token = window.getAuthToken();
        
        if (!user || !token || user.perfil !== 'voluntario') {
            console.error('Usuário não é voluntário');
            renderPedidosEmpty();
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(`${window.API_BASE_URL}/agendamento/voluntario/${user.id}`, { headers });
            
            if (response.ok) {
                const agendamentos = await response.json();
                // Filtrar apenas os pendentes
                const pendentes = Array.isArray(agendamentos)
                    ? agendamentos.filter(agn => agn.status_agn === 'pendente')
                    : [];
                renderPedidos(pendentes);
            } else if (response.status === 404) {
                renderPedidosEmpty();
            } else {
                console.error('Erro ao carregar pedidos:', response.status);
                renderPedidosEmpty();
            }
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
            renderPedidosEmpty();
        }
    } catch (error) {
        console.error('Erro geral ao carregar pedidos:', error);
    }
}

// Formatar data e hora
function formatarDataHora(data, horaIni, horaFim) {
    if (!data) return 'Data não disponível';
    
    try {
        const dataString = typeof data === 'string' ? data : data.toString();
        const dateObj = dataString.includes('T') 
            ? new Date(dataString)
            : new Date(dataString + 'T00:00:00Z');
        
        if (isNaN(dateObj.getTime())) {
            return 'Data inválida';
        }
        
        const dataFormatada = dateObj.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit',
            year: '2-digit'
        });

        const horario = horaIni && horaFim ? `${horaIni} - ${horaFim}` : 'Horário não definido';
        
        return `${dataFormatada} às ${horaIni || '--:--'}`;
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return 'Data inválida';
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

// Renderizar pedidos
function renderPedidos(pedidos) {
    const requestList = document.querySelector('#pedidos .request-list');
    
    if (!requestList) return;

    requestList.innerHTML = '';

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
        renderPedidosEmpty();
        return;
    }

    pedidos.forEach(pedido => {
        const article = document.createElement('article');
        article.className = 'request-card';
        
        const iniciais = gerarIniciais(pedido.nome_usr);
        const dataHora = formatarDataHora(
            pedido.data_dis,
            pedido.hora_ini_dis,
            pedido.hora_fim_dis
        );

        article.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                <div style="
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 18px;
                ">
                    ${iniciais}
                </div>
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #333;">
                        ${pedido.nome_usr}
                    </h3>
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">
                        📅 ${dataHora}
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #999;">
                        Status: <strong style="color: #ff9800;">Pendente de confirmação</strong>
                    </p>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-decline" data-id="${pedido.id_agn}" style="
                    padding: 8px 16px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background 0.2s;
                    font-size: 14px;
                ">
                    Recusar
                </button>
                <button class="btn-accept-agendamento" data-id="${pedido.id_agn}" style="
                    padding: 8px 16px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background 0.2s;
                    font-size: 14px;
                ">
                    Confirmar
                </button>
            </div>
        `;

        // Event listeners
        const btnConfirmar = article.querySelector('.btn-accept-agendamento');
        const btnRecusar = article.querySelector('.btn-decline');
        
        if (btnConfirmar) {
            btnConfirmar.addEventListener('click', () => confirmarAgendamento(pedido.id_agn));
        }
        
        if (btnRecusar) {
            btnRecusar.addEventListener('click', () => recusarAgendamento(pedido.id_agn));
        }

        requestList.appendChild(article);
    });
}

// Renderizar estado vazio
function renderPedidosEmpty() {
    const requestList = document.querySelector('#pedidos .request-list');
    
    if (!requestList) return;

    requestList.innerHTML = '';

    const empty = document.createElement('div');
    empty.style.cssText = `
        text-align: center;
        padding: 60px 20px;
        background: #f9f9f9;
        border-radius: 12px;
        border: 2px dashed #ddd;
    `;
    
    empty.innerHTML = `
        <p style="font-size: 18px; color: #666; margin: 0;">
            Nenhum pedido pendente no momento
        </p>
        <p style="font-size: 14px; color: #999; margin: 10px 0 0 0;">
            Você está com as mãos livres! 🎉
        </p>
    `;
    
    requestList.appendChild(empty);
}

// Confirmar agendamento
async function confirmarAgendamento(idAgendamento) {
    try {
        await waitForAuthFunctions();
        const token = window.getAuthToken();
        if (!token) { alert('Você precisa estar autenticado'); return; }

        const response = await fetch(`${window.API_BASE_URL}/agendamento/confirmar/${idAgendamento}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert('Agendamento confirmado com sucesso!');
            loadPedidosAgendamento();
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(`Erro ao confirmar: ${errorData.error || 'Tente novamente'}`);
        }
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        alert('Erro ao confirmar. Tente novamente.');
    }
}

async function recusarAgendamento(idAgendamento) {
    if (!confirm('Tem certeza que deseja recusar este agendamento?')) return;

    try {
        await waitForAuthFunctions();
        const token = window.getAuthToken();
        if (!token) { alert('Você precisa estar autenticado'); return; }

        const response = await fetch(`${window.API_BASE_URL}/agendamento/cancelar/${idAgendamento}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert('Agendamento recusado');
            loadPedidosAgendamento();
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(`Erro ao recusar: ${errorData.error || 'Tente novamente'}`);
        }
    } catch (error) {
        console.error('Erro ao recusar agendamento:', error);
        alert('Erro ao recusar. Tente novamente.');
    }
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', async function() {
    await loadPedidosAgendamento();
});
