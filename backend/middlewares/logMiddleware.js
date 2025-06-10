const fs = require('fs');
const path = require('path');

// Garante que a pasta de logs existe
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });

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
