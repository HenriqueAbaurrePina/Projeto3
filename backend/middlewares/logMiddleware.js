const fs = require('fs');
const path = require('path');

// Detecta se está rodando no Kubernetes
const isKubernetes = process.env.KUBERNETES_SERVICE_HOST !== undefined;
let logStream = null;

if (!isKubernetes) {
  const logFilePath = path.join(__dirname, '../logs/access.log');
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
}

function sanitize(obj, camposSensiveis = ['senha', 'senhaHash', 'token', 'accessToken', 'refreshToken']) {
  if (typeof obj !== 'object' || obj === null) return obj;

  const copia = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in copia) {
    if (typeof copia[key] === 'object' && copia[key] !== null) {
      copia[key] = sanitize(copia[key], camposSensiveis);
    } else if (typeof copia[key] === 'string') {
      if (camposSensiveis.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
        copia[key] = '***';
      }
    }
  }

  return copia;
}

function logMiddleware(req, res, next) {
  if (req.originalUrl === '/metrics') return next();

  const timestamp = new Date().toISOString();
  const ip = req.ip;
  const rota = req.originalUrl;
  const metodo = req.method;
  const usuario = req.usuario ? `${req.usuario.nome} (${req.usuario.id})` : 'Anônimo';

  // Clonar body/query/params para redigir campos sensíveis
  const safeBody = sanitize(req.body);
  const safeQuery = sanitize(req.query);
  const safeParams = sanitize(req.params);

  const logLinha = `[${timestamp}] ${metodo} ${rota} - IP: ${ip} - Usuário: ${usuario}`;

  // Log para console (Kubernetes + Docker)
  console.log(logLinha);
  console.debug('🧾 Detalhes da requisição:', JSON.stringify({
    timestamp, metodo, rota, ip, usuario, body: safeBody, query: safeQuery, params: safeParams
  }, null, 2));

  // Log para arquivo (apenas fora do Kubernetes)
  if (!isKubernetes && logStream) {
    logStream.write(logLinha + '\n');
  }

  next();
}

module.exports = logMiddleware;
