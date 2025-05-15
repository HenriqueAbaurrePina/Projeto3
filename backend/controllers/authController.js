const Usuario = require('../models/Usuario');
const Projeto = require('../models/Projeto');
const Empresa = require('../models/Empresa');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ mensagem: 'Email ou senha inválidos.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: 'Email ou senha inválidos.' });
    }

    const payload = {
      id: usuario._id,
      nome: usuario.nome,
      tipo: usuario.tipo,
      empresaId: usuario.empresaId || null
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
};

const criarUsuarioFilho = async (req, res) => {
  const { nome, email, senha, empresaId, projetosIds = [] } = req.body;

  if (!req.usuario || req.usuario.tipo !== 'adm') {
    return res.status(403).json({ mensagem: 'Apenas administradores podem criar usuários filhos.' });
  }

  if (!nome || !email || !senha || !empresaId) {
    return res.status(400).json({ mensagem: 'Campos obrigatórios faltando.' });
  }

  try {
    const existente = await Usuario.findOne({ email });
    if (existente) {
      return res.status(409).json({ mensagem: 'Já existe um usuário com este email.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const novoUsuario = new Usuario({
      nome,
      email,
      senhaHash,
      tipo: 'filho',
      empresaId
    });

    await novoUsuario.save();

    // Associar o novo usuário aos projetos selecionados
    if (projetosIds.length > 0) {
      await Projeto.updateMany(
        { _id: { $in: projetosIds } },
        { $addToSet: { usuarios: novoUsuario._id } }
      );
    }

    // ✅ Atualiza a empresa com o ID do novo usuário filho
    await Empresa.findByIdAndUpdate(empresaId, {
      $addToSet: { usuariosFilhos: novoUsuario._id }
    });

    res.status(201).json({ mensagem: 'Usuário filho criado com sucesso.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro ao criar usuário filho.' });
  }
};

module.exports = {
  login,
  criarUsuarioFilho
};
