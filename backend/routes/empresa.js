const express = require('express');
const router = express.Router();
const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const Projeto = require('../models/Projeto');
const verifyToken = require('../middlewares/authMiddleware');
const bcrypt = require('bcrypt');

// Criar nova empresa (só ADM)
router.post('/', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') return res.status(403).json({ mensagem: 'Acesso negado.' });

  const { nome } = req.body;
  try {
    const novaEmpresa = new Empresa({
      nome,
      admId: req.usuario.id,
      usuariosFilhos: [],
      projetos: []
    });

    await novaEmpresa.save();
    await Usuario.findByIdAndUpdate(req.usuario.id, { $addToSet: { empresaId: novaEmpresa._id } });

    res.status(201).json(novaEmpresa);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao criar empresa.' });
  }
});

router.get('/do-usuario', verifyToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario || !usuario.empresaId || usuario.empresaId.length === 0) {
      return res.status(404).json({ mensagem: 'Usuário sem empresas vinculadas.' });
    }


    const empresas = await Empresa.find({ _id: { $in: usuario.empresaId } });
    res.json(empresas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao buscar empresa do usuário.' });
  }
});

// Listar empresa do usuário
router.get('/', verifyToken, async (req, res) => {
  try {
    let empresa;
    if (req.usuario.tipo === 'adm') {
      empresa = await Empresa.find({ admId: req.usuario.id }).populate('usuariosFilhos').populate('projetos');
    } else {
      empresa = await Empresa.findById(req.usuario.empresaId)
        .populate('usuariosFilhos')
        .populate({
          path: 'projetos',
          match: { usuarios: req.usuario.id }
        });
    }

    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada.' });

    res.json(empresa);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar empresa.' });
  }
});

// Editar nome da empresa (só ADM)
router.put('/:id', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') return res.status(403).json({ mensagem: 'Acesso negado.' });

  const { nome } = req.body;

  try {
    const empresa = await Empresa.findById(req.params.id);

    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada.' });

    if (empresa.admId.toString() !== req.usuario.id) {
      return res.status(403).json({ mensagem: 'Somente o administrador pode editar.' });
    }

    empresa.nome = nome || empresa.nome;
    await empresa.save();

    res.json(empresa);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao editar empresa.' });
  }
});

// Buscar empresa por ID (acesso apenas do ADM dono ou usuário vinculado)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.id)
      .populate('usuariosFilhos')
      .populate('projetos');

    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada.' });

    const isAdm = req.usuario.tipo === 'adm' && empresa.admId.toString() === req.usuario.id;
    const isVinculado = req.usuario.tipo === 'filho' && empresa.usuariosFilhos.some(u => u._id.toString() === req.usuario.id);

    if (!isAdm && !isVinculado) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada.' });
    }

    res.json(empresa);
  } catch (err) {
    console.error('[ERRO real ao buscar empresa por ID]', err);
    res.status(500).json({ mensagem: 'Erro ao buscar empresa por ID.' });
  }
});

// Listar todos os usuários (filhos) de uma empresa
router.get('/:empresaId/usuarios', verifyToken, async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.empresaId);

    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada.' });

    if (empresa.admId.toString() !== req.usuario.id) {
      return res.status(403).json({ mensagem: 'Apenas o administrador pode acessar os usuários da empresa.' });
    }

    const usuarios = await Usuario.find({ empresaId: empresa._id, tipo: 'filho' }, 'nome email');
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao buscar usuários da empresa.' });
  }
});

// Excluir usuário filho da empresa e dos projetos
router.delete('/:empresaId/usuarios/:usuarioId', verifyToken, async (req, res) => {
  try {
    const { empresaId, usuarioId } = req.params;
    const empresa = await Empresa.findById(empresaId);

    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada.' });
    if (empresa.admId.toString() !== req.usuario.id) {
      return res.status(403).json({ mensagem: 'Apenas o administrador pode excluir usuários.' });
    }

    await Empresa.findByIdAndUpdate(empresaId, { $pull: { usuariosFilhos: usuarioId } });
    await Projeto.updateMany(
      { empresaId, usuarios: usuarioId },
      { $pull: { usuarios: usuarioId } }
    );
    await Usuario.findByIdAndDelete(usuarioId);

    res.json({ mensagem: 'Usuário filho excluído com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao excluir usuário filho.' });
  }
});

// Excluir empresa com confirmação (só ADM)
router.delete('/excluir/:empresaId', verifyToken, async (req, res) => {
  const { empresaId } = req.params;
  const { email, senha } = req.body;

  try {
    if (req.usuario.tipo !== 'adm') {
      return res.status(403).json({ mensagem: 'Apenas administradores podem excluir empresas.' });
    }

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario || usuario.email !== email) {
      return res.status(401).json({ mensagem: 'Email incorreto.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      return res.status(401).json({ mensagem: 'Senha incorreta.' });
    }

    const empresa = await Empresa.findById(empresaId);
    if (!empresa || empresa.admId.toString() !== req.usuario.id) {
      return res.status(403).json({ mensagem: 'Você não tem permissão para excluir esta empresa.' });
    }

    // Remove todos os projetos e desvincula usuários
    await Projeto.deleteMany({ _id: { $in: empresa.projetos } });
    await Usuario.updateMany(
      { _id: { $in: empresa.usuariosFilhos } },
      { $unset: { empresaId: "", projetosIds: "" } }
    );
    await Usuario.deleteMany({ tipo: 'filho', empresaId: { $exists: false } });
    await Usuario.findByIdAndUpdate(
      req.usuario.id,
      { $pull: { empresaId: empresaId } }
    );    
    await Empresa.findByIdAndDelete(empresaId);

    res.json({ mensagem: 'Empresa excluída com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao excluir empresa.' });
  }
});

module.exports = router;
