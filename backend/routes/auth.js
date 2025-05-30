const express = require('express');
const router = express.Router();
const { login, criarUsuarioFilho } = require('../controllers/authController');
const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');
const RefreshToken = require('../models/RefreshToken');
const verifyToken = require('../middlewares/authMiddleware');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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

// Rota criar usuário filho
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

// Rota para renovar o access token
router.post('/refresh', async (req, res) => {
  const refreshTokenRaw = req.cookies?.refreshToken;
  if (!refreshTokenRaw) return res.status(401).json({ mensagem: 'Refresh token ausente' });

  try {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    const tokenDoc = await RefreshToken.findOne({ token: refreshTokenHash, ip: req.ip, userAgent: req.get('User-Agent') });
    if (!tokenDoc) {
      console.warn(`⚠️ Possível reuso de refresh token de IP ${req.ip}`);
      // Tenta identificar o usuário com base apenas no hash (mesmo sem IP/User-Agent)
      const tokenBackup = await RefreshToken.findOne({ token: refreshTokenHash });
      if (tokenBackup) {
        await RefreshToken.deleteMany({ userId: tokenBackup.userId });
      }
      return res.status(403).json({ mensagem: 'Token reutilizado ou inválido. Faça login novamente.' });
    }
    
    if (tokenDoc.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: tokenDoc._id });
      return res.status(403).json({ mensagem: 'Refresh token expirado' });
    }

    const usuario = await Usuario.findById(tokenDoc.userId);
    if (!usuario) return res.status(403).json({ mensagem: 'Usuário não encontrado' });

    const payload = {
      id: usuario._id,
      nome: usuario.nome,
      tipo: usuario.tipo,
      empresaId: usuario.empresaId || null
    };

    // Rotaciona o refresh token
    await RefreshToken.deleteOne({ _id: tokenDoc._id });

    const novoRefreshRaw = crypto.randomBytes(64).toString('hex');
    const novoRefreshHash = crypto.createHash('sha256').update(novoRefreshRaw).digest('hex');
    await RefreshToken.create({
      userId: usuario._id,
      token: novoRefreshHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.cookie('refreshToken', novoRefreshRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error(err);
    res.status(403).json({ mensagem: 'Erro ao validar o refresh token' });
  }
});

// Rota de logout
router.post('/logout', async (req, res) => {
  const refreshTokenRaw = req.cookies?.refreshToken;
  if (!refreshTokenRaw) return res.status(401).json({ mensagem: 'Refresh token ausente' });

  try {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    await RefreshToken.deleteOne({ token: refreshTokenHash });
    res.clearCookie('refreshToken');
    res.status(200).json({ mensagem: 'Logout realizado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(403).json({ mensagem: 'Erro ao realizar logout' });
  }
});

module.exports = router;
