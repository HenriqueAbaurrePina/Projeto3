require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const iniciarLimpezaDeTokens = require('./jobs/limparTokensExpirados');

const app = express();

app.set('trust proxy', 1);

// Conexão com o banco
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch((err) => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Middlewares de segurança
app.use(helmet());

app.use(cors({
  origin: ['http://localhost:4200'], // ✅ Ajuste conforme frontend
  credentials: true
}));

app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: 'Muitas requisições do mesmo IP. Tente novamente em 15 minutos.'
});
app.use(limiter);

// Middlewares globais
app.use(express.json());

const logMiddleware = require('./middlewares/logMiddleware');
app.use(logMiddleware);

// Importa middlewares
const verifyToken = require('./middlewares/authMiddleware');

// Importa rotas
const authRoutes = require('./routes/auth');
const empresaRoutes = require('./routes/empresa');
const projetoRoutes = require('./routes/projeto');
const sprintRoutes = require('./routes/sprint');

// Usa rotas
app.use('/auth', authRoutes);
app.use('/empresa', empresaRoutes);
app.use('/projetos', projetoRoutes);
app.use('/sprints', sprintRoutes);

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

// Inicializa rotina de limpeza de tokens expirados
iniciarLimpezaDeTokens();
