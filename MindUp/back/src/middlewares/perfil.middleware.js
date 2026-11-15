module.exports = { checkPerfil, checkPerfilUsuario };

async function checkPerfil(req, res, next) {
    try {
        if (req.user.perfil !== 'voluntario'){
            return res.status(403).json({ error: 'Acesso negado: perfil não autorizado' });
        }
        next();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function checkPerfilUsuario(req, res, next) {
    try {
        if (req.user.perfil !== 'usuario'){
            return res.status(403).json({ error: 'Acesso negado: perfil não autorizado' });
        }
        next();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}
