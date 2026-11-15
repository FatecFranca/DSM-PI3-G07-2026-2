document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('cadastroForm');
    const cpfInput = document.getElementById('cpf');
    const telefoneInput = document.getElementById('telefone');
    const mensagem = document.getElementById('mensagem');

    const uploadFields = [
        ['uploadCRP', 'boxCRP'],
        ['uploadRG', 'boxRG'],
        ['uploadFoto', 'boxFoto']
    ];

    if (cpfInput) {
        cpfInput.addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            v = v.replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            this.value = v;
        });
    }

    if (telefoneInput) {
        telefoneInput.addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            v = v.replace(/^(\d{2})(\d)/, '($1) $2')
                 .replace(/(\d{5})(\d{4})$/, '$1-$2');
            this.value = v;
        });
    }

    uploadFields.forEach(([inputId, boxId]) => {
        const input = document.getElementById(inputId);
        const box = document.getElementById(boxId);

        if (input && box) {
            const buttonText = box.querySelector('.upload-btn');
            input.addEventListener('change', function () {
                if (this.files.length > 0) {
                    const fileName = this.files[0].name;
                    if (buttonText) {
                        buttonText.textContent = '✓ ' + (fileName.length > 20 ? fileName.substring(0, 20) + '…' : fileName);
                    }
                    box.classList.add('selecionado');
                }
            });
        }
    });

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            limparErros();

            const dados = {
                nome: valorDe('nome'),
                cpf: valorDe('cpf'),
                nascimento: valorDe('nascimento'),
                email: valorDe('email'),
                telefone: valorDe('telefone'),
                cidade: valorDe('cidade'),
                estado: valorDe('estado'),
                senha: valorDe('senha'),
                confirmarSenha: valorDe('confirmarSenha'),
                crp: valorDe('crp'),
                crpEstado: valorDe('crpEstado'),
                formacao: valorDe('formacao'),
                especialidade: valorDe('especialidade')
            };

            let isValido = true;

            if (dados.nome.length < 3) {
                mostrarErroCampo('nome', 'Informe seu nome completo');
                isValido = false;
            }

            if (!validarEmail(dados.email)) {
                mostrarErroCampo('email', 'E-mail inválido');
                isValido = false;
            }

            const telefoneLimpo = dados.telefone.replace(/\D/g, '');
            if (telefoneLimpo.length < 10) {
                mostrarErroCampo('telefone', 'Telefone inválido');
                isValido = false;
            }

            if (!validarNascimento(dados.nascimento)) {
                mostrarErroCampo('nascimento', 'Informe uma data de nascimento válida');
                isValido = false;
            }

            if (dados.cidade.length < 2) {
                mostrarErroCampo('cidade', 'Informe sua cidade');
                isValido = false;
            }

            if (!dados.estado) {
                mostrarErroCampo('estado', 'Selecione o estado');
                isValido = false;
            }

            if (dados.senha.length < 8) {
                mostrarErroCampo('senha', 'A senha deve ter pelo menos 8 caracteres');
                isValido = false;
            }

            if (dados.senha !== dados.confirmarSenha) {
                mostrarErroCampo('confirmarSenha', 'As senhas não coincidem');
                isValido = false;
            }

            if (!dados.crp) {
                mostrarErroCampo('crp', 'Informe o número do CRP');
                isValido = false;
            }

            if (!dados.crpEstado) {
                mostrarErroCampo('crpEstado', 'Selecione o estado do CRP');
                isValido = false;
            }

            if (!dados.formacao) {
                mostrarErroCampo('formacao', 'Informe sua formação');
                isValido = false;
            }

            if (!dados.especialidade) {
                mostrarErroCampo('especialidade', 'Selecione sua especialidade');
                isValido = false;
            }

            if (!isValido) {
                form.querySelector('.error')?.focus();
                return;
            }

            const botao = form.querySelector('button[type="submit"]');
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
                    perfil_usr: 'voluntario',
                    contato_usr: telefoneLimpo,
                    faixa_etaria_usr: calcularFaixaEtaria(dados.nascimento) || undefined,
                    cidade_usr: dados.cidade,
                    estado_usr: dados.estado,
                    especialidade_vol: dados.especialidade
                });

                showMessage('success', '✓ Cadastro enviado com sucesso! Redirecionando para o login...');
                form.reset();
                resetUploads();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } catch (error) {
                if (error.status === 409) {
                    mostrarErroCampo('email', 'Este e-mail já está cadastrado');
                    showMessage('error', 'Este e-mail já está cadastrado. Tente fazer login.');
                } else {
                    showMessage('error', error.message || 'Não foi possível concluir o cadastro.');
                }
            } finally {
                if (botao) {
                    botao.disabled = false;
                    botao.textContent = textoOriginal || 'Realizar cadastro';
                }
            }
        });

        ['nome', 'email', 'telefone', 'nascimento', 'cidade', 'estado', 'senha', 'confirmarSenha', 'crp', 'crpEstado', 'formacao', 'especialidade']
            .forEach((id) => {
                const campo = document.getElementById(id);
                if (!campo) return;

                const evento = campo.tagName === 'SELECT' ? 'change' : 'input';
                campo.addEventListener(evento, () => limparErroCampo(id));
            });
    }

    function valorDe(id) {
        return document.getElementById(id)?.value.trim() || '';
    }

    function limparErroCampo(id) {
        const campo = document.getElementById(id);
        if (!campo) return;

        campo.classList.remove('error');
        campo.removeAttribute('aria-invalid');

        const errorSpan = campo.closest('.form-group')?.querySelector('.error-message');
        if (errorSpan) {
            errorSpan.classList.add('hidden');
            errorSpan.textContent = '';
        }
    }

    function mostrarErroCampo(id, texto) {
        const campo = document.getElementById(id);
        if (!campo) return;

        campo.classList.add('error');
        campo.setAttribute('aria-invalid', 'true');

        const errorSpan = campo.closest('.form-group')?.querySelector('.error-message');
        if (errorSpan) {
            errorSpan.classList.remove('hidden');
            errorSpan.textContent = texto;
        }
    }

    function limparErros() {
        form?.querySelectorAll('input, select').forEach((campo) => {
            campo.classList.remove('error');
            campo.removeAttribute('aria-invalid');
        });

        form?.querySelectorAll('.error-message').forEach((span) => {
            span.classList.add('hidden');
            span.textContent = '';
        });
    }

    function resetUploads() {
        uploadFields.forEach(([inputId, boxId]) => {
            const input = document.getElementById(inputId);
            const box = document.getElementById(boxId);

            if (input) input.value = '';
            if (box) {
                box.classList.remove('selecionado');
                const buttonText = box.querySelector('.upload-btn');
                if (buttonText) buttonText.textContent = 'Selecionar arquivo';
            }
        });
    }

    function showMessage(type, text) {
        if (!mensagem) return;
        mensagem.textContent = text;
        mensagem.className = 'mensagem ' + type;
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
});
