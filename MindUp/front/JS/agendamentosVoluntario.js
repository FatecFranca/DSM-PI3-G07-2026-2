async function waitForAuthFunctions(timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (window.getCurrentUser && window.getAuthToken && window.API_BASE_URL) return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Auth functions não disponíveis');
}

async function loadAgendamentosVoluntario() {
    try {
        await waitForAuthFunctions();

        const user = window.getCurrentUser();
        const token = window.getAuthToken();

        if (!user || !token) {
            renderAgendamentosVolEmpty();
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const response = await fetch(`${window.API_BASE_URL}/agendamento/voluntario/${user.id}`, { headers });

        if (response.ok) {
            const agendamentos = await response.json();
            renderAgendamentosVol(agendamentos);
        } else if (response.status === 404) {
            renderAgendamentosVolEmpty();
        } else {
            console.error('Erro ao carregar agendamentos:', response.status);
            renderAgendamentosVolEmpty();
        }
    } catch (error) {
        console.error('Erro geral ao carregar agendamentos do voluntário:', error);
        renderAgendamentosVolEmpty();
    }
}

function formatarDataHoraVol(data, horaIni, horaFim) {
    if (!data) return 'Data não disponível';
    try {
        const dataString = typeof data === 'string' ? data : data.toString();
        const dateObj = dataString.includes('T')
            ? new Date(dataString)
            : new Date(dataString + 'T00:00:00Z');

        if (isNaN(dateObj.getTime())) return 'Data inválida';

        const dataFormatada = dateObj.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const horario = horaIni && horaFim ? `${horaIni} - ${horaFim}` : 'Horário não definido';
        return `${dataFormatada}, ${horario}`;
    } catch (error) {
        return 'Data inválida';
    }
}

function getStatusInfoVol(status) {
    const statuses = {
        'pendente':   { label: 'Pendente', classe: 'pendente' },
        'confirmado': { label: 'Confirmado', classe: 'confirmado' },
        'realizado':  { label: 'Realizado', classe: 'realizado' },
        'cancelado':  { label: 'Cancelado', classe: 'cancelado' }
    };
    return statuses[status] || statuses['pendente'];
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function notificarVol(mensagem) {
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast(mensagem);
        return;
    }
    alert(mensagem);
}

function agruparPorStatusVol(agendamentos) {
    const agrupados = { confirmado: [], pendente: [], realizado: [], cancelado: [] };

    if (Array.isArray(agendamentos)) {
        agendamentos.forEach(agn => {
            let status = agn.status_agn || 'pendente';

            if (status === 'confirmado' && agn.data_dis) {
                const dataAgendamento = new Date(agn.data_dis + 'T00:00:00Z');
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                if (dataAgendamento < hoje) status = 'realizado';
            }

            if (agrupados[status]) {
                agrupados[status].push({ ...agn, status_agn: status });
            } else {
                agrupados['pendente'].push({ ...agn, status_agn: status });
            }
        });
    }

    return agrupados;
}

function renderAgendamentosVol(agendamentos) {
    const cardBody = document.querySelector('#agenda .card-body');
    if (!cardBody) return;

    cardBody.innerHTML = '';
    const agrupados = agruparPorStatusVol(agendamentos);
    const ordem = ['confirmado', 'pendente', 'realizado', 'cancelado'];

    ordem.forEach(status => {
        const items = agrupados[status];
        if (items.length === 0) return;

        const statusInfo = getStatusInfoVol(status);

        const grupo = document.createElement('section');
        grupo.className = 'agendamento-grupo';

        const titulo = document.createElement('h3');
        titulo.className = `grupo-status grupo-status--${statusInfo.classe}`;
        titulo.textContent = `${statusInfo.label} (${items.length})`;
        grupo.appendChild(titulo);

        const lista = document.createElement('div');
        lista.className = 'consulta-lista';

        items.forEach(agn => {
            const agendamentoInfo = getStatusInfoVol(agn.status_agn);
            const nome = agn.nome_usr || 'Usuário';
            const dataFormatada = formatarDataHoraVol(agn.data_dis, agn.hora_ini_dis, agn.hora_fim_dis);
            const id = escapeHtml(agn.id_agn);

            const item = document.createElement('article');
            item.className = `consulta-item consulta-item--${agendamentoInfo.classe}`;

            item.innerHTML = `
                <div class="consulta-info">
                    <div class="consulta-topo">
                        <h3>${escapeHtml(nome)}</h3>
                        <span class="status-pill status-pill--${agendamentoInfo.classe}">${agendamentoInfo.label}</span>
                    </div>
                    <p class="consulta-data">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="3" y="5" width="18" height="16" rx="3"/>
                            <path d="M8 3v4M16 3v4M3 10h18"/>
                        </svg>
                        ${escapeHtml(dataFormatada)}
                    </p>
                    ${agn.status_agn === 'pendente' ? '<p class="consulta-nota">Aguardando sua confirmação.</p>' : ''}
                    ${agn.status_agn === 'confirmado' ? '<p class="consulta-nota">Sessão confirmada.</p>' : ''}
                </div>
                <div class="consulta-acoes">
                    ${agn.status_agn === 'pendente' ? `
                        <button type="button" class="btn-accept btn-sm btn-confirmar-vol" data-id="${id}" aria-label="Confirmar agendamento de ${escapeHtml(nome)}">Confirmar</button>
                    ` : ''}
                    ${agn.status_agn === 'confirmado' ? `
                        <button type="button" class="btn-secondary btn-sm btn-desconfirmar-vol" data-id="${id}" aria-label="Desconfirmar agendamento de ${escapeHtml(nome)}">Desconfirmar</button>
                    ` : ''}
                    ${agn.status_agn === 'confirmado' || agn.status_agn === 'pendente' ? `
                        <button type="button" class="btn-sair btn-sm btn-cancelar-vol" data-id="${id}" aria-label="Cancelar agendamento de ${escapeHtml(nome)}">Cancelar</button>
                    ` : ''}
                </div>
            `;

            const btnCancelar = item.querySelector('.btn-cancelar-vol');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => cancelarAgendamentoVol(agn.id_agn));
            }

            const btnConfirmar = item.querySelector('.btn-confirmar-vol');
            if (btnConfirmar) {
                btnConfirmar.addEventListener('click', () => confirmarAgendamentoVol(agn.id_agn));
            }

            const btnDesconfirmar = item.querySelector('.btn-desconfirmar-vol');
            if (btnDesconfirmar) {
                btnDesconfirmar.addEventListener('click', () => desconfirmarAgendamentoVol(agn.id_agn));
            }

            lista.appendChild(item);
        });

        grupo.appendChild(lista);
        cardBody.appendChild(grupo);
    });

    if (Object.values(agrupados).every(arr => arr.length === 0)) {
        renderAgendamentosVolEmpty();
    }
}

function renderAgendamentosVolEmpty() {
    const cardBody = document.querySelector('#agenda .card-body');
    if (!cardBody) return;

    cardBody.innerHTML = '';

    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const titulo = document.createElement('h3');
    titulo.textContent = 'Nenhum agendamento encontrado';

    const texto = document.createElement('p');
    texto.textContent = 'Seus agendamentos aparecerão aqui quando os usuários marcarem um horário com você.';

    empty.append(titulo, texto);
    cardBody.appendChild(empty);
}

async function cancelarAgendamentoVol(idAgendamento) {
    if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    try {
        await waitForAuthFunctions();
        const token = window.getAuthToken();
        if (!token) { notificarVol('Você precisa estar autenticado.'); return; }

        const response = await fetch(`${window.API_BASE_URL}/agendamento/cancelar/${idAgendamento}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            notificarVol('Agendamento cancelado com sucesso.');
            loadAgendamentosVoluntario();
            if (typeof loadVoluntarioData === 'function') loadVoluntarioData();
        } else {
            const errorData = await response.json().catch(() => ({}));
            notificarVol(`Erro ao cancelar: ${errorData.error || 'Tente novamente.'}`);
        }
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        notificarVol('Erro ao cancelar. Tente novamente.');
    }
}

async function confirmarAgendamentoVol(idAgendamento) {
    if (!window.confirm('Confirmar este agendamento?')) return;

    try {
        await waitForAuthFunctions();
        const token = window.getAuthToken();
        if (!token) { notificarVol('Você precisa estar autenticado.'); return; }

        const response = await fetch(`${window.API_BASE_URL}/agendamento/confirmar/${idAgendamento}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            notificarVol('Agendamento confirmado com sucesso!');
            loadAgendamentosVoluntario();
            if (typeof loadVoluntarioData === 'function') loadVoluntarioData();
        } else {
            const errorData = await response.json().catch(() => ({}));
            notificarVol(`Erro ao confirmar: ${errorData.error || 'Tente novamente.'}`);
        }
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        notificarVol('Erro ao confirmar. Tente novamente.');
    }
}

async function desconfirmarAgendamentoVol(idAgendamento) {
    if (!window.confirm('Desconfirmar este agendamento? A disponibilidade voltará a ficar pendente.')) return;

    try {
        await waitForAuthFunctions();
        const token = window.getAuthToken();
        if (!token) { notificarVol('Você precisa estar autenticado.'); return; }

        const response = await fetch(`${window.API_BASE_URL}/agendamento/desconfirmar/${idAgendamento}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            notificarVol('Agendamento desconfirmado com sucesso.');
            loadAgendamentosVoluntario();
            if (typeof loadVoluntarioData === 'function') loadVoluntarioData();
        } else {
            const errorData = await response.json().catch(() => ({}));
            notificarVol(`Erro ao desconfirmar: ${errorData.error || 'Tente novamente.'}`);
        }
    } catch (error) {
        console.error('Erro ao desconfirmar agendamento:', error);
        notificarVol('Erro ao desconfirmar. Tente novamente.');
    }
}

document.addEventListener('DOMContentLoaded', loadAgendamentosVoluntario);