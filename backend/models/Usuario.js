const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senhaHash: { type: String, required: true },
  tipo: { type: String, enum: ['adm', 'filho'], required: true },
  empresaId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' }],
  projetosIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Projeto' }],
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
