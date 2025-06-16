const fs = require('fs');
const path = require('path');

// Detecta se está rodando no Kubernetes
const isKubernetes = process.env.KUBERNETES_SERVICE_HOST !== undefined;
const logFilePath = isKubernetes
  ? '/app/logs/backend/access.log'
  : path.join(__dirname, '../logs/access.log');

// Garante que a pasta de logs existe
const logDir = path.dirname(logFilePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

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
  if (req.originalUrl === '/metrics') {
    return next(); // Ignora log da rota do Prometheus
  }
  
  const timestamp = new Date().toISOString();
  const ip = req.ip;
  const rota = req.originalUrl;
  const metodo = req.method;
  const usuario = req.usuario ? `${req.usuario.nome} (${req.usuario.id})` : 'Anônimo';

  // Clonar body/query/params para redigir campos sensíveis
  const safeBody = sanitize(req.body);
  const safeQuery = sanitize(req.query);
  const safeParams = sanitize(req.params);

  const logDetalhado = {
    timestamp,
    metodo,
    rota,
    ip,
    usuario,
    body: safeBody,
    query: safeQuery,
    params: safeParams
  };

  const logTexto = `[${timestamp}] ${metodo} ${rota} - IP: ${ip} - Usuário: ${usuario}\n`;
  logStream.write(logTexto);
  console.log(logTexto.trim());
  console.debug('🧾 Detalhes da requisição:', JSON.stringify(logDetalhado, null, 2));

  next();
}

module.exports = logMiddleware;
