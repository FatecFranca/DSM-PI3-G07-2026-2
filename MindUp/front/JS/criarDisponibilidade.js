async function waitForAuthFunctions(timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (window.getCurrentUser && window.getAuthToken && window.API_BASE_URL) return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Auth functions não disponíveis');
}

function obterDataLocalISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function calcularDuracaoMinutos(horaIni, horaFim) {
    const [horaInicio, minutoInicio] = horaIni.split(':').map(Number);
    const [horaFimNum, minutoFim] = horaFim.split(':').map(Number);

    if ([horaInicio, minutoInicio, horaFimNum, minutoFim].some(Number.isNaN)) {
        return NaN;
    }

    return (horaFimNum * 60 + minutoFim) - (horaInicio * 60 + minutoInicio);
}

function esconderMensagens() {
    const erroEl = document.getElementById('disp-erro');
    const sucessoEl = document.getElementById('disp-sucesso');

    if (erroEl) erroEl.classList.add('hidden');
    if (sucessoEl) sucessoEl.classList.add('hidden');
}

function mostrarErro(mensagem, campo) {
    const erroEl = document.getElementById('disp-erro');
    const sucessoEl = document.getElementById('disp-sucesso');

    if (sucessoEl) sucessoEl.classList.add('hidden');

    if (erroEl) {
        erroEl.textContent = mensagem;
        erroEl.classList.remove('hidden');
    }

    if (campo) {
        campo.classList.add('error');
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
    }
}

function mostrarSucesso(mensagem) {
    const erroEl = document.getElementById('disp-erro');
    const sucessoEl = document.getElementById('disp-sucesso');

    if (erroEl) erroEl.classList.add('hidden');

    if (sucessoEl) {
        sucessoEl.textContent = mensagem;
        sucessoEl.classList.remove('hidden');
    }
}

function limparErroCampo(campo) {
    campo.classList.remove('error');
    campo.removeAttribute('aria-invalid');
}

function initFormDisponibilidade() {
    const form = document.getElementById('form-disponibilidade');
    if (!form) return;

    const dataInput = document.getElementById('disp-data');
    const horaIniInput = document.getElementById('disp-hora-ini');
    const horaFimInput = document.getElementById('disp-hora-fim');

    if (!dataInput || !horaIniInput || !horaFimInput) return;

    dataInput.min = obterDataLocalISO();

    form.addEventListener('submit', salvarDisponibilidade);

    [dataInput, horaIniInput, horaFimInput].forEach(input => {
        input.addEventListener('input', () => {
            limparErroCampo(input);
            esconderMensagens();
        });
    });
}

async function salvarDisponibilidade(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const btn = document.getElementById('disp-btn-salvar');
    const dataInput = document.getElementById('disp-data');
    const horaIniInput = document.getElementById('disp-hora-ini');
    const horaFimInput = document.getElementById('disp-hora-fim');

    if (!form || !btn || !dataInput || !horaIniInput || !horaFimInput) return;

    const data = dataInput.value;
    const horaIni = horaIniInput.value;
    const horaFim = horaFimInput.value;

    esconderMensagens();

    if (!data || !horaIni || !horaFim) {
        const campoFaltante = !data ? dataInput : (!horaIni ? horaIniInput : horaFimInput);
        mostrarErro('Preencha todos os campos.', campoFaltante);
        return;
    }

    if (data < dataInput.min) {
        mostrarErro('Escolha uma data a partir de hoje.', dataInput);
        return;
    }

    if (horaIni >= horaFim) {
        mostrarErro('O horário de início deve ser anterior ao horário de fim.', horaIniInput);
        return;
    }

    const duracao = calcularDuracaoMinutos(horaIni, horaFim);

    if (Number.isNaN(duracao)) {
        mostrarErro('Informe um horário válido.', horaIniInput);
        return;
    }

    if (duracao < 15) {
        mostrarErro('O intervalo mínimo é de 15 minutos.', horaIniInput);
        return;
    }

    if (duracao > 60) {
        mostrarErro('O intervalo máximo é de 1 hora.', horaFimInput);
        return;
    }

    try {
        await waitForAuthFunctions();
        const user = window.getCurrentUser();
        const token = window.getAuthToken();

        if (!user || !token) {
            mostrarErro('Você precisa estar autenticado.');
            return;
        }

        btn.textContent = 'Salvando...';
        btn.disabled = true;

        const response = await fetch(`${window.API_BASE_URL}/disponibilidade`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data_dis: data,
                hora_ini_dis: horaIni,
                hora_fim_dis: horaFim
            })
        });

        const responseData = await response.json().catch(() => ({}));

        if (response.ok) {
            form.reset();
            dataInput.min = obterDataLocalISO();
            mostrarSucesso('Disponibilidade cadastrada com sucesso!');
            [dataInput, horaIniInput, horaFimInput].forEach(limparErroCampo);
            carregarMinhasDisponibilidades();
        } else {
            mostrarErro(responseData.error || 'Erro ao salvar. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro ao salvar disponibilidade:', error);
        mostrarErro('Erro de conexão. Verifique se o servidor está rodando.');
    } finally {
        btn.textContent = 'Salvar disponibilidade';
        btn.disabled = false;
    }
}

async function carregarMinhasDisponibilidades() {
    const container = document.getElementById('disp-lista');
    if (!container) return;

    container.innerHTML = '<p class="form-hint">Carregando horários...</p>';

    try {
        const disponibilidades = await window.apiFetch('/disponibilidade/minhas');
        renderMinhasDisponibilidades(Array.isArray(disponibilidades) ? disponibilidades : []);
    } catch (error) {
        console.error('Erro ao carregar disponibilidades:', error);
        container.innerHTML = '<p class="form-hint">Não foi possível carregar seus horários.</p>';
    }
}

function formatarDataDisponibilidade(data) {
    if (!data) return '-';

    const date = new Date(`${data}T00:00:00`);
    if (Number.isNaN(date.getTime())) return data;

    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function renderMinhasDisponibilidades(disponibilidades) {
    const container = document.getElementById('disp-lista');
    if (!container) return;

    container.innerHTML = '';

    if (disponibilidades.length === 0) {
        const vazio = document.createElement('p');
        vazio.className = 'form-hint';
        vazio.textContent = 'Nenhum horário cadastrado ainda.';
        container.appendChild(vazio);
        return;
    }

    const rotulos = {
        disponivel: 'Disponível',
        pendente: 'Aguardando confirmação',
        ocupado: 'Agendado',
        cancelado: 'Cancelado'
    };

    disponibilidades.forEach((disp) => {
        const status = disp.status_dis || 'indefinido';
        const dataFormatada = formatarDataDisponibilidade(disp.data_dis);
        const referencia = `horário de ${dataFormatada} das ${disp.hora_ini_dis} às ${disp.hora_fim_dis}`;

        const item = document.createElement('article');
        item.className = `disponibilidade-item disponibilidade-item--${status}`;

        const info = document.createElement('div');
        info.className = 'disponibilidade-info';

        const data = document.createElement('h3');
        data.className = 'disponibilidade-data';
        data.textContent = dataFormatada;

        const horario = document.createElement('p');
        horario.className = 'disponibilidade-horario';
        horario.textContent = `${disp.hora_ini_dis} - ${disp.hora_fim_dis}`;

        const statusEl = document.createElement('span');
        statusEl.className = `disp-status disp-status--${status}`;
        statusEl.textContent = rotulos[disp.status_dis] || disp.status_dis || 'Sem status';

        info.append(data, horario, statusEl);

        const acoes = document.createElement('div');
        acoes.className = 'disponibilidade-acoes';

        if (disp.status_dis === 'disponivel') {
            acoes.appendChild(criarBotao('Cancelar', 'btn-secondary btn-sm', () =>
                alterarStatusDisponibilidade(disp.id_dis, 'cancelar'),
                `Cancelar ${referencia}`
            ));
        }

        if (disp.status_dis === 'cancelado') {
            acoes.appendChild(criarBotao('Reativar', 'btn-primary btn-sm', () =>
                alterarStatusDisponibilidade(disp.id_dis, 'reativar'),
                `Reativar ${referencia}`
            ));
        }

        acoes.appendChild(criarBotao('Remover', 'btn-sair btn-sm', () =>
            removerDisponibilidade(disp.id_dis),
            `Remover ${referencia}`
        ));

        item.append(info, acoes);
        container.appendChild(item);
    });
}

function criarBotao(texto, classes, onClick, ariaLabel) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = classes;
    botao.textContent = texto;
    if (ariaLabel) botao.setAttribute('aria-label', ariaLabel);
    botao.addEventListener('click', onClick);
    return botao;
}

function notificarDisponibilidade(mensagem, tipo = 'sucesso') {
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast(mensagem);
        return;
    }

    if (tipo === 'erro') {
        mostrarErro(mensagem);
    } else {
        mostrarSucesso(mensagem);
    }
}

async function alterarStatusDisponibilidade(id, acao) {
    try {
        await window.apiFetch(`/disponibilidade/${acao}/${id}`, { method: 'PATCH' });

        notificarDisponibilidade(
            acao === 'cancelar'
                ? 'Disponibilidade cancelada com sucesso!'
                : 'Disponibilidade reativada com sucesso!'
        );

        await carregarMinhasDisponibilidades();
    } catch (error) {
        notificarDisponibilidade(error.message || 'Não foi possível alterar a disponibilidade.', 'erro');
    }
}

async function removerDisponibilidade(id) {
    if (!confirm('Remover este horário? Os agendamentos vinculados a ele também serão excluídos.')) {
        return;
    }

    try {
        await window.apiFetch(`/disponibilidade/${id}`, { method: 'DELETE' });
        notificarDisponibilidade('Disponibilidade removida com sucesso!');
        await carregarMinhasDisponibilidades();
    } catch (error) {
        notificarDisponibilidade(error.message || 'Não foi possível remover a disponibilidade.', 'erro');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initFormDisponibilidade();
    carregarMinhasDisponibilidades();
});
