const mongoose = require('mongoose');

const entregaSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  dataPrevista: { type: Date, required: true },
  dataEntregue: { type: Date }
});

const sprintSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date, required: true }, // automaticamente 15 dias após dataInicio
  projetoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Projeto', required: true },
  usuarios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
  entregas: [entregaSchema]
}, { timestamps: true });

module.exports = mongoose.model('Sprint', sprintSchema);
