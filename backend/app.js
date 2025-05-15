require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Conexão com o banco
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch((err) => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Middlewares globais
app.use(cors());
app.use(express.json());

// Importa middlewares
const verifyToken = require('./middlewares/authMiddleware');

// Importa rotas
const authRoutes = require('./routes/auth');
const empresaRoutes = require('./routes/empresa');
const projetoRoutes = require('./routes/projeto');

// Usa rotas
app.use('/auth', authRoutes);
app.use('/empresa', empresaRoutes);
app.use('/projetos', projetoRoutes);

// Exemplo de rota protegida
app.get('/protegido', verifyToken, (req, res) => {
  res.json({
    mensagem: `Bem-vindo ${req.usuario.nome}, você está autenticado como ${req.usuario.tipo}.`
  });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Rotas Sprint
const sprintRoutes = require('./routes/sprint');
app.use('/sprints', sprintRoutes);

