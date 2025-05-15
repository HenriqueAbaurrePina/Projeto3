const mongoose = require('mongoose');

const projetoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String },
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date, required: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  usuarios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
  sprints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sprint'}]
}, { timestamps: true });

module.exports = mongoose.model('Projeto', projetoSchema);
