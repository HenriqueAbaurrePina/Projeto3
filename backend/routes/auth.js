const express = require('express');
const router = express.Router();
const { login, criarUsuarioFilho } = require('../controllers/authController');
const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');
const verifyToken = require('../middlewares/authMiddleware');

// Rota de login
router.post('/login', login);

// Rota de cadastro genérico
router.post('/register', async (req, res) => {
  const { nome, email, senha, tipo, empresaId } = req.body;

  try {
    const existente = await Usuario.findOne({ email });
    if (existente) {
      return res.status(409).json({ mensagem: 'Email já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = new Usuario({ nome, email, senhaHash, tipo, empresaId });

    await novoUsuario.save();
    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro ao registrar usuário.' });
  }
});

// ✅ Rota modularizada para criar usuário filho
router.post('/filho', verifyToken, criarUsuarioFilho);

// Rota para obter dados do usuário logado
router.get('/usuario-logado', verifyToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-senhaHash');
    if (!usuario) return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao buscar usuário logado.' });
  }
});

module.exports = router;
