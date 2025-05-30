const fs = require('fs');
const path = require('path');

// Garante que a pasta de logs existe
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });

function logMiddleware(req, res, next) {
  const timestamp = new Date().toISOString();
  const ip = req.ip;
  const rota = req.originalUrl;
  const metodo = req.method;
  const usuario = req.usuario ? `${req.usuario.nome} (${req.usuario.id})` : 'Anônimo';

  // Clonar body/query/params para redigir campos sensíveis
  const safeBody = { ...req.body };
  const safeQuery = { ...req.query };
  const safeParams = { ...req.params };
  const camposSensiveis = ['senha', 'senhaHash', 'token', 'accessToken', 'refreshToken'];

  camposSensiveis.forEach(campo => {
    if (campo in safeBody) safeBody[campo] = '***';
    if (campo in safeQuery) safeQuery[campo] = '***';
    if (campo in safeParams) safeParams[campo] = '***';
  });

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
