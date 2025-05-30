const cron = require('node-cron');
const RefreshToken = require('../models/RefreshToken');

function iniciarLimpezaDeTokens() {
  // Roda a cada hora
  cron.schedule('0 * * * *', async () => {
    const agora = new Date();
    const resultado = await RefreshToken.deleteMany({ expiresAt: { $lt: agora } });
    console.log(`🧹 ${resultado.deletedCount} refresh tokens expirados removidos`);
  });
}

module.exports = iniciarLimpezaDeTokens;
