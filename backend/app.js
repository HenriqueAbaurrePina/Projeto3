require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const iniciarLimpezaDeTokens = require('./jobs/limparTokensExpirados');
const cors = require('cors');

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ['http://localhost:4200'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization']
};

app.set('trust proxy', 1);

// Conexão com o banco
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch((err) => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Middleware de métricas Prometheus
const promBundle = require("express-prom-bundle");
const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// Middlewares de segurança
app.use(helmet());

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  skip: (req) => req.path === "/metrics",
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
