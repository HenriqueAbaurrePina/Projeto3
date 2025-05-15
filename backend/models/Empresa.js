const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  admId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  usuariosFilhos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
  projetos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Projeto' }]
}, { timestamps: true });

module.exports = mongoose.model('Empresa', empresaSchema);
