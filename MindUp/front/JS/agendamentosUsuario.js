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

function escapeAgendamentoHtml(value) {
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

// Carregar agendamentos do usuário
async function loadAgendamentosUsuario() {
    try {
        await waitForAuthFunctions();

        const user = window.getCurrentUser();
        const token = window.getAuthToken();

        if (!user || !token) {
            console.error('Usuário não autenticado');
            renderAgendamentosEmpty();
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(`${window.API_BASE_URL}/agendamento/usuario/${user.id}`, { headers });

            if (response.ok) {
                const agendamentos = await response.json();
                renderAgendamentos(agendamentos);
            } else if (response.status === 404) {
                renderAgendamentosEmpty();
            } else {
                console.error('Erro ao carregar agendamentos:', response.status);
                renderAgendamentosEmpty();
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            renderAgendamentosEmpty();
        }
    } catch (error) {
        console.error('Erro geral ao carregar agendamentos:', error);
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
            month: 'long',
            year: 'numeric'
        });

        const horario = horaIni && horaFim ? `${horaIni} - ${horaFim}` : 'Horário não definido';

        return `${dataFormatada}, ${horario}`;
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return 'Data inválida';
    }
}

function getStatusLabel(status) {
    const labels = {
        pendente: 'Pendente',
        confirmado: 'Confirmado',
        realizado: 'Realizado',
        cancelado: 'Cancelado'
    };

    return labels[status] || labels.pendente;
}

// Agrupar agendamentos por status
function agruparPorStatus(agendamentos) {
    const agrupados = {
        confirmado: [],
        pendente: [],
        realizado: [],
        cancelado: []
    };

    if (Array.isArray(agendamentos)) {
        agendamentos.forEach(agn => {
            let status = agn.status_agn || 'pendente';

            if (status === 'confirmado' && agn.data_dis) {
                const dataAgendamento = new Date(agn.data_dis + 'T00:00:00Z');
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);

                if (dataAgendamento < hoje) {
                    status = 'realizado';
                }
            }

            if (agrupados[status]) {
                agrupados[status].push({ ...agn, status_agn: status });
            } else {
                agrupados.pendente.push({ ...agn, status_agn: status });
            }
        });
    }

    return agrupados;
}

// Renderizar agendamentos agrupados por status
function renderAgendamentos(agendamentos) {
    const cardBody = document.querySelector('#consultas .card-body');

    if (!cardBody) return;

    cardBody.innerHTML = '';

    const agrupados = agruparPorStatus(agendamentos);
    const ordem = ['confirmado', 'pendente', 'realizado', 'cancelado'];

    ordem.forEach(status => {
        const items = agrupados[status];

        if (items.length === 0) return;

        const grupo = document.createElement('div');
        grupo.className = 'agendamento-grupo';

        const title = document.createElement('h3');
        title.className = `grupo-status grupo-status--${status}`;
        title.textContent = `${getStatusLabel(status)} (${items.length})`;
        grupo.appendChild(title);

        const lista = document.createElement('div');
        lista.className = 'consulta-lista';

        items.forEach(agn => {
            const item = document.createElement('article');
            item.className = `consulta-item consulta-item--${status}`;

            const dataFormatada = formatarDataHora(
                agn.data_dis,
                agn.hora_ini_dis,
                agn.hora_fim_dis
            );
            const pendente = status === 'pendente';

            item.innerHTML = `
                <div class="consulta-info">
                    <div class="consulta-topo">
                        <h3>${escapeAgendamentoHtml(agn.nome_usr || 'Voluntário')}</h3>
                        <span class="status-pill status-pill--${status}">${getStatusLabel(status)}</span>
                    </div>
                    <p class="consulta-data">${escapeAgendamentoHtml(dataFormatada)}</p>
                    ${pendente ? '<p class="consulta-nota">Aguardando confirmação do voluntário</p>' : ''}
                </div>
                ${pendente ? `
                    <button
                        type="button"
                        class="btn-sair btn-sm btn-cancelar-agendamento"
                        data-id="${agn.id_agn}">
                        Cancelar
                    </button>
                ` : ''}
            `;

            const btnCancelar = item.querySelector('.btn-cancelar-agendamento');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', (event) => {
                    event.stopPropagation();
                    cancelarAgendamento(agn.id_agn);
                });
            }

            lista.appendChild(item);
        });

        grupo.appendChild(lista);
        cardBody.appendChild(grupo);
    });

    if (Object.values(agrupados).every(arr => arr.length === 0)) {
        renderAgendamentosEmpty();
    }
}

// Renderizar estado vazio
function renderAgendamentosEmpty() {
    const cardBody = document.querySelector('#consultas .card-body');

    if (!cardBody) return;

    cardBody.innerHTML = `
        <div class="empty-state">
            <h3>Você ainda não tem agendamentos</h3>
            <p>Clique em "Agendar" para marcar uma sessão com um voluntário.</p>
            <a class="btn-primary" href="voluntarios-disponiveis.html">Ver voluntários disponíveis</a>
        </div>
    `;
}

// Cancelar agendamento
async function cancelarAgendamento(idAgendamento) {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
        return;
    }

    try {
        await waitForAuthFunctions();

        const token = window.getAuthToken();

        if (!token) {
            alert('Você precisa estar autenticado');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const response = await fetch(`${window.API_BASE_URL}/agendamento/cancelar/${idAgendamento}`, {
            method: 'PATCH',
            headers
        });

        if (response.ok) {
            alert('Agendamento cancelado com sucesso');
            loadAgendamentosUsuario();
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(`Erro ao cancelar: ${errorData.error || 'Tente novamente'}`);
        }
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        alert('Erro ao cancelar. Tente novamente.');
    }
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', async function () {
    await loadAgendamentosUsuario();
});
