const express = require('express');
const router = express.Router();
const Projeto = require('../models/Projeto');
const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const Sprint = require('../models/Sprint');
const verifyToken = require('../middlewares/authMiddleware');

// 🔁 Função auxiliar para verificar vínculo com empresa
function usuarioVinculadoAoProjeto(usuario, projeto) {
  const empresas = Array.isArray(usuario.empresaId) ? usuario.empresaId.map(id => id.toString()) : [usuario.empresaId?.toString()];
  return empresas.includes(projeto.empresaId.toString());
}

// Criar projeto (só ADM)
router.post('/', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') {
    return res.status(403).json({ mensagem: 'Apenas administradores podem criar projetos.' });
  }

  const { nome, descricao, dataInicio, dataFim, usuarios, empresaId } = req.body;

  try {
    if (!empresaId) {
      return res.status(400).json({ mensagem: 'ID da empresa é obrigatório.' });
    }

    const usuario = await Usuario.findById(req.usuario.id);
    // Verifica se o ADM está vinculado à empresa
    const estaVinculado = Array.isArray(usuario.empresaId)
      ? usuario.empresaId.map(id => id.toString()).includes(empresaId)
      : usuario.empresaId?.toString() === empresaId;
    if (!estaVinculado) {
      return res.status(403).json({ mensagem: 'Você só pode criar projetos nas empresas às quais está vinculado.' });
    }

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ mensagem: 'Empresa não encontrada.' });
    }

    // Adiciona o ADM automaticamente à lista de usuários
    const usuariosComAdm = Array.from(new Set([...(usuarios || []), empresa.admId.toString()]));

    const novoProjeto = new Projeto({
      nome,
      descricao,
      dataInicio,
      dataFim,
      empresaId,
      usuarios: usuariosComAdm,
      entregas: []
    });

    await novoProjeto.save();

    await Empresa.findByIdAndUpdate(
      empresaId,
      { $push: { projetos: novoProjeto._id } }
    );

    // Adiciona o projeto aos usuários filhos
    await Usuario.updateMany(
      { _id: { $in: usuariosComAdm } },
      { $push: { projetosIds: novoProjeto._id } }
    );

    res.status(201).json(novoProjeto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao criar projeto.' });
  }
});

// Listar projetos de todas as empresas do ADM
router.get('/', verifyToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    const empresas = Array.isArray(usuario.empresaId) ? usuario.empresaId : [usuario.empresaId];
    const projetos = await Projeto.find({ empresaId: { $in: empresas } })
      .populate('usuarios', 'nome email');

    res.json(projetos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao buscar projetos.' });
  }
});

// Editar projeto (só ADM)
router.put('/:id', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') {
    return res.status(403).json({ mensagem: 'Apenas administradores podem editar projetos.' });
  }

  const { nome, descricao, dataInicio, dataFim, usuarios } = req.body;

  try {
    const projeto = await Projeto.findById(req.params.id);

    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuarioVinculadoAoProjeto(usuario, projeto)) {
      return res.status(403).json({ mensagem: 'Você só pode editar projetos da sua empresa.' });
    }

    // Identificar alterações de usuários vinculados
    const antigosUsuariosIds = projeto.usuarios.map(u => u.toString());
    const novosUsuariosIds = usuarios || [];

    // Remover projeto dos antigos usuários que não estão mais vinculados
    const usuariosRemovidos = antigosUsuariosIds.filter(id => !novosUsuariosIds.includes(id));
    await Usuario.updateMany(
      { _id: { $in: usuariosRemovidos } },
      { $pull: { projetosIds: projeto._id } }
    );

    // Adicionar projeto aos novos usuários que ainda não o possuem
    const usuariosAdicionados = novosUsuariosIds.filter(id => !antigosUsuariosIds.includes(id));
    await Usuario.updateMany(
      { _id: { $in: usuariosAdicionados } },
      { $addToSet: { projetosIds: projeto._id } }
    );

    projeto.nome = nome || projeto.nome;
    projeto.descricao = descricao || projeto.descricao;
    projeto.dataInicio = dataInicio || projeto.dataInicio;
    projeto.dataFim = dataFim || projeto.dataFim;
    projeto.usuarios = novosUsuariosIds;

    await projeto.save();
    res.json(projeto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao editar projeto.' });
  }
});

// Deletar projeto (só ADM)
router.delete('/:id', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') {
    return res.status(403).json({ mensagem: 'Apenas administradores podem deletar projetos.' });
  }

  try {
    const projeto = await Projeto.findById(req.params.id);

    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuarioVinculadoAoProjeto(usuario, projeto)) {
      return res.status(403).json({ mensagem: 'Você só pode deletar projetos da sua empresa.' });
    }

    // Remove referência nos usuários
    await Usuario.updateMany(
      { projetosIds: projeto._id },
      { $pull: { projetosIds: projeto._id } }
    );

    // Remove referência da empresa
    await Empresa.findByIdAndUpdate(
      projeto.empresaId,
      { $pull: { projetos: projeto._id } }
    );

    await Projeto.findByIdAndDelete(req.params.id);

    res.json({ mensagem: 'Projeto deletado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao deletar projeto.' });
  }
});

// Obter dados de um projeto específico (ADM da empresa ou usuário vinculado)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const projeto = await Projeto.findById(req.params.id)
      .populate('usuarios', 'nome email')
      .populate({
        path: 'sprints',
        populate: {path: 'entregas.usuarioId', select: 'nome email'}
      })
      .populate('empresaId', '_id nome admId');

    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });

    const isAdm = req.usuario.tipo === 'adm';
    const isAdmDonoDaEmpresa = isAdm && projeto.empresaId.admId.toString() === req.usuario.id;
    const isUsuarioDoProjeto = projeto.usuarios.some(u => u._id.toString() === req.usuario.id);

    if (!isAdmDonoDaEmpresa && !isUsuarioDoProjeto) {
      return res.status(404).json({ mensagem: 'Página não encontrada.' });
    }

    res.json(projeto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao buscar projeto.' });
  }
});

// Listar todas as sprints de um projeto
router.get('/:id/sprints', verifyToken, async (req, res) => {
  try {
    const projeto = await Projeto.findById(req.params.id);
    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });

    // Verifica se o usuário tem permissão (ADM vinculado ou filho do projeto)
    const usuario = await Usuario.findById(req.usuario.id);
    const empresas = Array.isArray(usuario.empresaId) ? usuario.empresaId.map(e => e.toString()) : [usuario.empresaId?.toString()];
    const admVinculado = projeto && empresas.includes(projeto.empresaId.toString());
    const usuarioVinculado = projeto.usuarios.includes(req.usuario.id);

    if (!admVinculado && !usuarioVinculado) {
      return res.status(403).json({ mensagem: 'Acesso negado ao projeto.' });
    }

    const sprints = await Sprint.find({ projetoId: req.params.id }).sort({ dataInicio: 1 });
    res.json(sprints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao buscar sprints.' });
  }
});

// Criar Sprint para um Projeto
router.post('/:id/sprints', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') {
    return res.status(403).json({ mensagem: 'Apenas administradores podem criar sprints.' });
  }

  const { nome, dataInicio } = req.body;
  const projetoId = req.params.id;

  if (!nome || !dataInicio) {
    return res.status(400).json({ mensagem: 'Nome e data de início são obrigatórios.' });
  }

  try {
    const projeto = await Projeto.findById(projetoId);
    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });

    const usuario = await Usuario.findById(req.usuario.id);
    const empresas = Array.isArray(usuario.empresaId) ? usuario.empresaId.map(e => e.toString()) : [usuario.empresaId?.toString()];
    const admVinculado = empresas.includes(projeto.empresaId.toString());

    if (!admVinculado) {
      return res.status(403).json({ mensagem: 'Você não pode criar sprints para projetos de outras empresas.' });
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 14); // duração total = 15 dias (início + 14)

    const novaSprint = new Sprint({
      nome,
      dataInicio: inicio,
      dataFim: fim,
      projetoId,
      usuarios: projeto.usuarios
    });

    await novaSprint.save();

    await Projeto.findByIdAndUpdate(
      projetoId,
      { $push: { sprints: novaSprint._id } }
    );

    res.status(201).json(novaSprint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao criar sprint.' });
  }
});

// Obter uma sprint específica
router.get('/sprints/:id', verifyToken, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id)
      .populate('projetoId', 'empresaId usuarios')
      .populate('entregas.usuarioId', 'nome email')
      .populate('usuarios', 'nome email');

    if (!sprint) return res.status(404).json({ mensagem: 'Sprint não encontrada.' });

    const projeto = sprint.projetoId;
    const isAdm = req.usuario.tipo === 'adm';
    const isFilho = req.usuario.tipo === 'filho';

    // Verifica se o usuário está vinculado à empresa/projeto
    if (isAdm) {
      const usuario = await Usuario.findById(req.usuario.id);
      const empresas = Array.isArray(usuario.empresaId) ? usuario.empresaId.map(e => e.toString()) : [usuario.empresaId?.toString()];
      if (!empresas.includes(projeto.empresaId.toString())) {
        return res.status(403).json({ mensagem: 'Você não tem acesso a esta sprint.' });
      }
    } else if (isFilho) {
      const participaDoProjeto = projeto.usuarios.some(u => u.toString() === req.usuario.id);
      if (!participaDoProjeto) {
        return res.status(403).json({ mensagem: 'Você não participa do projeto desta sprint.' });
      }
    }

    res.json(sprint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao buscar sprint.' });
  }
});

module.exports = router;
