// Máscara de telefone
function aplicarMascaraTelefone(input) {
    input.addEventListener('input', function() {
        let v = this.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/^(\d{2})(\d)/, '($1) $2')
             .replace(/(\d{5})(\d{4})$/, '$1-$2');
        this.value = v;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cadastroForm');
    const telefoneInput = document.getElementById('telefone');
    
    if (telefoneInput) {
        aplicarMascaraTelefone(telefoneInput);
    }
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Limpar mensagens anteriores
            limparErros();
            
            // Obter valores
            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value;
            const confirmarSenha = document.getElementById('confirmarSenha').value;
            const telefone = document.getElementById('telefone').value.trim();
            const nascimento = document.getElementById('nascimento').value;
            const cidade = document.getElementById('cidade').value.trim();
            const estado = document.getElementById('estado').value;
            const termos = document.getElementById('termos').checked;
            
            let isValido = true;
            
            if (!nome || nome.length < 3) {
                mostrarErro('nome', 'Nome deve ter pelo menos 3 caracteres');
                isValido = false;
            }
            
            if (!validarEmail(email)) {
                mostrarErro('email', 'Email inválido');
                isValido = false;
            }
            
            if (!senha || senha.length < 8) {
                mostrarErro('senha', 'Senha deve ter pelo menos 8 caracteres');
                isValido = false;
            }
            
            if (senha !== confirmarSenha) {
                mostrarErro('confirmarSenha', 'As senhas não coincidem');
                isValido = false;
            }
            
            const telefoneLimpo = telefone.replace(/\D/g, '');
            if (!telefoneLimpo || telefoneLimpo.length < 10) {
                mostrarErro('telefone', 'Telefone inválido');
                isValido = false;
            }
            
            if (!nascimento) {
                mostrarErro('nascimento', 'Data de nascimento é obrigatória');
                isValido = false;
            } else if (!validarNascimento(nascimento)) {
                mostrarErro('nascimento', 'Informe uma data de nascimento válida');
                isValido = false;
            }
            
            if (!cidade || cidade.length < 2) {
                mostrarErro('cidade', 'Cidade é obrigatória');
                isValido = false;
            }
            
            if (!estado) {
                mostrarErro('estado', 'Estado é obrigatório');
                isValido = false;
            }
            
            if (!termos) {
                mostrarErroTermos('Você deve aceitar os termos');
                isValido = false;
            }
            
            if (isValido) {
                enviarCadastro({
                    nome,
                    email,
                    senha,
                    telefone: telefoneLimpo,
                    nascimento,
                    cidade,
                    estado
                });
            } else {
                const primeiroErro = form.querySelector('input.error, select.error');
                if (primeiroErro) primeiroErro.focus();
            }
        });

        ['nome', 'email', 'senha', 'confirmarSenha', 'telefone', 'nascimento', 'cidade'].forEach(function(id) {
            document.getElementById(id)?.addEventListener('input', function() {
                if (this.classList.contains('error')) limparErroEspecifico(id);
            });
        });

        document.getElementById('estado')?.addEventListener('change', function() {
            if (this.value) limparErroEspecifico('estado');
        });

        document.getElementById('termos')?.addEventListener('change', function() {
            if (this.checked) limparErroTermos();
        });
    }
    
    document.getElementById('nome')?.addEventListener('blur', function() {
        if (this.value.trim().length > 0 && this.value.trim().length < 3) {
            mostrarErro('nome', 'Nome deve ter pelo menos 3 caracteres');
        } else {
            limparErroEspecifico('nome');
        }
    });
    
    document.getElementById('email')?.addEventListener('blur', function() {
        if (this.value.trim().length > 0 && !validarEmail(this.value.trim())) {
            mostrarErro('email', 'Email inválido');
        } else {
            limparErroEspecifico('email');
        }
    });
    
    document.getElementById('senha')?.addEventListener('blur', function() {
        if (this.value.length > 0 && this.value.length < 8) {
            mostrarErro('senha', 'Senha deve ter pelo menos 8 caracteres');
        } else {
            limparErroEspecifico('senha');
        }
    });
    
    document.getElementById('confirmarSenha')?.addEventListener('blur', function() {
        const senha = document.getElementById('senha').value;
        if (this.value !== '' && this.value !== senha) {
            mostrarErro('confirmarSenha', 'As senhas não coincidem');
        } else {
            limparErroEspecifico('confirmarSenha');
        }
    });
    
    document.getElementById('telefone')?.addEventListener('blur', function() {
        const telefoneLimpo = this.value.replace(/\D/g, '');
        if (this.value !== '' && telefoneLimpo.length < 10) {
            mostrarErro('telefone', 'Telefone inválido');
        } else {
            limparErroEspecifico('telefone');
        }
    });
    
    document.getElementById('cidade')?.addEventListener('blur', function() {
        if (this.value.trim().length > 0 && this.value.trim().length < 2) {
            mostrarErro('cidade', 'Cidade é obrigatória');
        } else {
            limparErroEspecifico('cidade');
        }
    });
});

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validarNascimento(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;

    const nascimento = new Date(`${data}T00:00:00`);
    if (Number.isNaN(nascimento.getTime())) return false;

    return nascimento <= new Date();
}

function calcularFaixaEtaria(dataNascimento) {
    const nascimento = new Date(`${dataNascimento}T00:00:00`);
    if (Number.isNaN(nascimento.getTime())) return null;

    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }

    if (idade < 0) return null;
    if (idade >= 60) return '60+';

    const inicio = Math.floor(idade / 10) * 10;
    return `${inicio}-${inicio + 9}`;
}

function mostrarErro(fieldId, mensagem) {
    const campo = document.getElementById(fieldId);
    if (!campo) return;
    const errorSpan = campo.parentElement.querySelector('.error-message');
    
    campo.classList.add('error');
    campo.setAttribute('aria-invalid', 'true');
    if (errorSpan) {
        errorSpan.classList.remove('hidden');
        errorSpan.textContent = mensagem;
    }
}

function limparErroEspecifico(fieldId) {
    const campo = document.getElementById(fieldId);
    if (!campo) return;
    const errorSpan = campo.parentElement.querySelector('.error-message');
    
    campo.classList.remove('error');
    campo.removeAttribute('aria-invalid');
    if (errorSpan) {
        errorSpan.classList.add('hidden');
    }
}

function mostrarErroTermos(mensagem) {
    const campo = document.getElementById('termos');
    const errorSpan = document.getElementById('termos-error');

    if (campo) {
        campo.classList.add('error');
        campo.setAttribute('aria-invalid', 'true');
    }
    if (errorSpan) {
        errorSpan.classList.remove('hidden');
        errorSpan.textContent = mensagem;
    }
}

function limparErroTermos() {
    const campo = document.getElementById('termos');
    const errorSpan = document.getElementById('termos-error');

    if (campo) {
        campo.classList.remove('error');
        campo.removeAttribute('aria-invalid');
    }
    if (errorSpan) {
        errorSpan.classList.add('hidden');
        errorSpan.textContent = '';
    }
}

function limparErros() {
    const campos = ['nome', 'email', 'senha', 'confirmarSenha', 'telefone', 'nascimento', 'cidade', 'estado'];
    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.classList.remove('error');
            campo.removeAttribute('aria-invalid');
            const errorSpan = campo.parentElement.querySelector('.error-message');
            if (errorSpan) {
                errorSpan.classList.add('hidden');
            }
        }
    });
    
    limparErroTermos();
}

async function enviarCadastro(dados) {
    const form = document.getElementById('cadastroForm');
    const botao = form?.querySelector('button[type="submit"]');
    const textoOriginal = botao?.textContent;

    if (botao) {
        botao.disabled = true;
        botao.textContent = 'Enviando...';
    }

    try {
        await apiRegistrar({
            nome_usr: dados.nome,
            email_usr: dados.email,
            senha_usr: dados.senha,
            perfil_usr: 'usuario',
            contato_usr: dados.telefone,
            faixa_etaria_usr: calcularFaixaEtaria(dados.nascimento) || undefined,
            cidade_usr: dados.cidade,
            estado_usr: dados.estado
        });

        mostrarMensagemSucesso('Cadastro realizado com sucesso! Redirecionando...');
        form?.reset();

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        if (error.status === 409) {
            mostrarErro('email', 'Este e-mail já está cadastrado');
            mostrarMensagemErro('Este e-mail já está cadastrado. Tente fazer login.');
        } else {
            mostrarMensagemErro(error.message || 'Erro ao realizar o cadastro. Tente novamente.');
        }
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal || 'Criar cadastro';
        }
    }
}

function mostrarMensagemSucesso(texto) {
    const mensagemDiv = document.getElementById('mensagem');
    mensagemDiv.textContent = texto;
    mensagemDiv.classList.remove('hidden', 'error');
    mensagemDiv.classList.add('success');
}

function mostrarMensagemErro(texto) {
    const mensagemDiv = document.getElementById('mensagem');
    mensagemDiv.textContent = texto;
    mensagemDiv.classList.remove('hidden', 'success');
    mensagemDiv.classList.add('error');
}
