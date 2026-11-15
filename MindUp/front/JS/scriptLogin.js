document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            limparErros();
            
            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value;
            const lembrar = document.getElementById('lembrar').checked;
            
            let isValido = true;
            if (!email || !validarEmail(email)) {
                mostrarErro('email', 'E-mail inválido');
                isValido = false;
            }
            
            if (!senha || senha.length < 1) {
                mostrarErro('senha', 'Senha não pode estar vazia');
                isValido = false;
            }
            
            if (isValido) {
                enviarLogin(email, senha, lembrar);
            } else {
                form.querySelector('.form-group input.error')?.focus();
            }
        });

        ['email', 'senha'].forEach(function(id) {
            document.getElementById(id)?.addEventListener('input', function() {
                if (this.classList.contains('error')) limparErroEspecifico(id);
            });
        });
    }
    
    document.getElementById('email')?.addEventListener('blur', function() {
        if (this.value.trim().length > 0 && !validarEmail(this.value.trim())) {
            mostrarErro('email', 'E-mail inválido');
        } else {
            limparErroEspecifico('email');
        }
    });
    
    document.getElementById('senha')?.addEventListener('blur', function() {
        if (this.value.length > 0) {
            limparErroEspecifico('senha');
        }
    });
});

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
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

function limparErros() {
    const campos = ['email', 'senha'];
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
}

async function enviarLogin(email, senha, lembrar) {
    try {
        const data = await apiLogin(email, senha);
        saveAuthToken(data.token, lembrar);
        mostrarMensagemSucesso('Login realizado com sucesso! Redirecionando...');
        const perfil = window.getUserPerfil();
        const destino = perfil === 'voluntario' ? 'paginavolu.html' : 'paginapac.html';
        setTimeout(() => {
            window.location.href = destino;
        }, 1500);
    } catch (error) {
        mostrarMensagemErro(error.message || 'Erro ao realizar login. Verifique suas credenciais.');
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
