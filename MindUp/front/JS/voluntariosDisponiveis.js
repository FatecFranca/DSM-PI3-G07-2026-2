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

// Armazenar disponibilidade selecionada
let disponibilidadeSelecionada = null;

// Carregar disponibilidades do backend
async function loadDisponibilidades() {
    try {
        await waitForAuthFunctions();
        
        const token = window.getAuthToken();
        
        if (!token) {
            console.error('Usuário não autenticado');
            renderEmptyState('Você precisa estar autenticado');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(`${window.API_BASE_URL}/disponibilidade/disponiveis`, { headers });
            
            if (response.ok) {
                const disponibilidades = await response.json();
                renderDisponibilidades(disponibilidades);
            } else if (response.status === 404) {
                renderEmptyState('Não há voluntários disponíveis no momento');
            } else {
                console.error('Erro ao carregar disponibilidades:', response.status);
                renderEmptyState('Erro ao carregar disponibilidades');
            }
        } catch (error) {
            console.error('Erro ao carregar disponibilidades:', error);
            renderEmptyState('Erro ao carregar disponibilidades');
        }
    } catch (error) {
        console.error('Erro geral ao carregar disponibilidades:', error);
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

// Formatar data (2024-06-07 → 07 de junho, 2024)
function formatarData(data) {
    if (!data) return '-';
    
    try {
        // Se a data já tiver T ou Z, use direto. Se não, concatene
        const dataString = typeof data === 'string' ? data : data.toString();
        const dateObj = dataString.includes('T') 
            ? new Date(dataString)
            : new Date(dataString + 'T00:00:00Z');
        
        if (isNaN(dateObj.getTime())) {
            return '-';
        }
        
        return dateObj.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        });
    } catch (error) {
        console.error('Erro ao formatar data:', error, data);
        return '-';
    }
}

// Renderizar grid de disponibilidades
function renderDisponibilidades(disponibilidades) {
    const grid = document.getElementById('voluntarios-grid');
    
    if (!grid) return;

    grid.innerHTML = '';

    if (!Array.isArray(disponibilidades) || disponibilidades.length === 0) {
        renderEmptyState('Não há voluntários disponíveis no momento');
        return;
    }

    disponibilidades.forEach(disp => {
        const card = document.createElement('div');
        card.style.cssText = `
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        
        card.onmouseover = () => {
            card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            card.style.transform = 'translateY(-4px)';
        };
        
        card.onmouseout = () => {
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            card.style.transform = 'translateY(0)';
        };

        const iniciais = gerarIniciais(disp.nome_usr);
        const dataFormatada = formatarData(disp.data_dis);
        const horario = `${disp.hora_ini_dis} - ${disp.hora_fim_dis}`;
        const especialidade = disp.especialidade_vol || 'Sem especialidade informada';

        card.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 16px;">
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
                    margin-right: 12px;
                ">
                    ${iniciais}
                </div>
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #333;">
                        ${disp.nome_usr}
                    </h3>
                    <p style="margin: 0; font-size: 12px; color: #999;">
                        ${especialidade}
                    </p>
                </div>
            </div>

            <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 500; color: #333;">📅 ${dataFormatada}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: 500; color: #333;">⏰ ${horario}</span>
                </div>
            </div>

            <button class="btn-primary" style="width: 100%; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; background: #5c63f5; color: white; transition: background 0.2s;">
                Agendar Agora
            </button>
        `;

        card.addEventListener('click', () => {
            abrirModalAgendamento(disp);
        });

        grid.appendChild(card);
    });
}

// Renderizar estado vazio
function renderEmptyState(mensagem) {
    const grid = document.getElementById('voluntarios-grid');
    
    if (!grid) return;

    grid.innerHTML = '';
    
    const empty = document.createElement('div');
    empty.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 20px;
        background: #f9f9f9;
        border-radius: 12px;
        border: 2px dashed #ddd;
    `;
    
    empty.innerHTML = `
        <p style="font-size: 18px; color: #666; margin: 0;">
            ${mensagem}
        </p>
        <p style="font-size: 14px; color: #999; margin: 10px 0 0 0;">
            Verifique novamente em alguns momentos
        </p>
    `;
    
    grid.appendChild(empty);
}

// Abrir modal de agendamento
function abrirModalAgendamento(disponibilidade) {
    disponibilidadeSelecionada = disponibilidade;
    
    const dataFormatada = formatarData(disponibilidade.data_dis);
    const horario = `${disponibilidade.hora_ini_dis} - ${disponibilidade.hora_fim_dis}`;
    
    document.getElementById('modal-voluntario-nome').textContent = disponibilidade.nome_usr;
    document.getElementById('modal-voluntario-especialidade').textContent = disponibilidade.especialidade_vol || 'Sem especialidade informada';
    document.getElementById('modal-data').textContent = dataFormatada;
    document.getElementById('modal-horario').textContent = horario;
    document.getElementById('motivo-agendamento').value = '';
    document.getElementById('erro-agendamento')?.classList.add('hidden');
    
    const modal = document.getElementById('modal-agendamento');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Inicia (ou reabre) a conversa com o voluntário selecionado
async function iniciarConversaComVoluntario() {
    if (!disponibilidadeSelecionada) return;

    const bruto = disponibilidadeSelecionada.id_vol;
    const idVol = typeof bruto === 'object' ? bruto?._id : bruto;

    if (!idVol) {
        alert('Voluntário não identificado nesta disponibilidade.');
        return;
    }

    const botao = document.getElementById('btn-conversar-agendamento');
    const textoOriginal = botao?.textContent;

    if (botao) {
        botao.disabled = true;
        botao.textContent = 'Abrindo...';
    }

    try {
        const conversa = await window.apiFetch('/conversa', {
            method: 'POST',
            body: { id_vol: String(idVol) }
        });

        window.location.href = `chat.html?id_con=${encodeURIComponent(conversa.id_con)}`;
    } catch (error) {
        // Conversa já existente: abre a que já existe.
        if (error.status === 400) {
            try {
                const conversas = await window.apiFetch('/conversa/minhas');
                const existente = (Array.isArray(conversas) ? conversas : [])
                    .find((conversa) => String(conversa.id_vol) === String(idVol));

                if (existente) {
                    window.location.href = `chat.html?id_con=${encodeURIComponent(existente.id_con)}`;
                    return;
                }
            } catch (buscaError) {
                console.error('Erro ao buscar conversa existente:', buscaError);
            }
        }

        alert(error.message || 'Não foi possível iniciar a conversa.');
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal || 'Conversar antes';
        }
    }
}

// Confirmar agendamento
async function confirmarAgendamento() {
    try {
        if (!disponibilidadeSelecionada) {
            alert('Erro: nenhuma disponibilidade selecionada');
            return;
        }

        await waitForAuthFunctions();
        
        const user = window.getCurrentUser();
        const token = window.getAuthToken();
        
        if (!user || !token) {
            alert('Você precisa estar autenticado');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const body = {
            id_dis: disponibilidadeSelecionada.id_dis,
            descricao_agn: document.getElementById('motivo-agendamento')?.value.trim() || undefined
        };

        const response = await fetch(`${window.API_BASE_URL}/agendamento`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (response.ok) {
            fecharModal('modal-agendamento');
            abrirModal('modal-sucesso');
            
            setTimeout(() => {
                fecharModal('modal-sucesso');
                window.location.href = 'paginapac.html';
            }, 3000);
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(`Erro ao agendar: ${errorData.error || 'Tente novamente'}`);
        }
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        alert('Erro ao agendar. Tente novamente.');
    }
}

// Abrir modal
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Fechar modal
function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Fechar modal ao clicar fora
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
});

// Event listener para botão de confirmar agendamento
document.addEventListener('DOMContentLoaded', function() {
    const btnConfirmar = document.getElementById('btn-confirmar-agendamento');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', confirmarAgendamento);
    }

    const btnConversar = document.getElementById('btn-conversar-agendamento');
    if (btnConversar) {
        btnConversar.addEventListener('click', iniciarConversaComVoluntario);
    }

    // Carregar disponibilidades
    loadDisponibilidades();
});
