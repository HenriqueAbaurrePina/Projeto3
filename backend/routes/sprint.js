const express = require('express');
const router = express.Router();
const Empresa = require('../models/Empresa');
const Sprint = require('../models/Sprint');
const Projeto = require('../models/Projeto');
const Usuario = require('../models/Usuario');
const verifyToken = require('../middlewares/authMiddleware');

// 🔁 Função auxiliar para verificar vínculo com empresa
function usuarioVinculadoAoProjeto(usuario, projeto) {
  const empresas = Array.isArray(usuario.empresaId) ? usuario.empresaId.map(id => id.toString()) : [usuario.empresaId?.toString()];
  return empresas.includes(projeto.empresaId.toString());
}

// Criar sprint para um projeto
router.post('/projetos/:id/sprints', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') return res.status(403).json({ mensagem: 'Apenas administradores podem criar sprints.' });

  const { nome, dataInicio } = req.body;
  const projetoId = req.params.id;

  try {
    const projeto = await Projeto.findById(projetoId);
    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });

    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 14); // sprint de 15 dias incluindo a data de início

    const sprint = new Sprint({ nome, dataInicio, dataFim, projetoId, usuarios: projeto.usuarios });
    await sprint.save();

    // Salva o ID da sprint dentro do projeto
    await Projeto.findByIdAndUpdate(projetoId, {
      $push: { sprints: sprint._id }
    });

    res.status(201).json(sprint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao criar sprint.' });
  }
});

// Buscar sprints de um projeto
router.get('/', verifyToken, async (req, res) => {
    const { projetoId } = req.query;
  
    if (!projetoId) {
      return res.status(400).json({ mensagem: 'ID do projeto é obrigatório.' });
    }
  
    try {
      const sprints = await Sprint.find({ projetoId })
        .populate('entregas.usuarioId', 'nome email');
  
      res.json(sprints);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensagem: 'Erro ao buscar sprints.' });
    }
});

// Listar sprints por projeto
router.get('/projetos/:id/sprints', verifyToken, async (req, res) => {
  try {
    const sprints = await Sprint.find({ projetoId: req.params.id });
    res.json(sprints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao listar sprints.' });
  }
});

// Obter detalhes de uma sprint
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id)
      .populate('entregas.usuarioId', 'nome email')
      .populate('usuarios', 'nome email');
    if (!sprint) return res.status(404).json({ mensagem: 'Sprint não encontrada.' });

    res.json(sprint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao buscar sprint.' });
  }
});

// Adicionar Entrega em uma Sprint
router.post('/:sprintId/entregas', verifyToken, async (req, res) => {
    const { titulo, usuarioId, dataPrevista } = req.body;
  
    if (!titulo || !usuarioId || !dataPrevista) {
      return res.status(400).json({ mensagem: 'Campos obrigatórios ausentes.' });
    }
  
    try {
      const sprint = await Sprint.findById(req.params.sprintId);
      if (!sprint) return res.status(404).json({ mensagem: 'Sprint não encontrada.' });
  
      const entrega = {
        titulo,
        usuarioId,
        dataPrevista: new Date(dataPrevista)
      };
  
      sprint.entregas.push(entrega);
      await sprint.save();
  
      res.status(201).json({ mensagem: 'Entrega adicionada com sucesso à sprint.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensagem: 'Erro ao adicionar entrega na sprint.' });
    }
});
  
// Curva S de uma Sprint
router.get('/:id/curva-s', verifyToken, async (req, res) => {
    try {
      const sprint = await Sprint.findById(req.params.id);
      if (!sprint) return res.status(404).json({ mensagem: 'Sprint não encontrada.' });
  
      const entregas = sprint.entregas;
  
      const previstasMap = {};
      const realizadasMap = {};
  
      entregas.forEach(e => {
        const prevista = new Date(e.dataPrevista).toISOString().split('T')[0];
        previstasMap[prevista] = (previstasMap[prevista] || 0) + 1;
  
        if (e.dataEntregue) {
          const realizada = new Date(e.dataEntregue).toISOString().split('T')[0];
          realizadasMap[realizada] = (realizadasMap[realizada] || 0) + 1;
        }
      });
  
      const todasDatas = new Set([...Object.keys(previstasMap), ...Object.keys(realizadasMap)]);
      const datasOrdenadas = Array.from(todasDatas).sort();
  
      let totalPrevistas = 0;
      let totalRealizadas = 0;
      const curvaS = datasOrdenadas.map(data => {
        totalPrevistas += previstasMap[data] || 0;
        totalRealizadas += realizadasMap[data] || 0;
        return {
          data,
          previstasAcumuladas: totalPrevistas,
          realizadasAcumuladas: totalRealizadas
        };
      });
  
      res.json(curvaS);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensagem: 'Erro ao gerar Curva S da sprint.' });
    }
});

// Marcar entrega como entregue em uma sprint
router.put('/:sprintId/entregas/:entregaId/entregar', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') {
    return res.status(403).json({ mensagem: 'Apenas administradores podem marcar entregas como concluídas.' });
  }

  try {
    const sprint = await Sprint.findById(req.params.sprintId);
    if (!sprint) return res.status(404).json({ mensagem: 'Sprint não encontrada.' });

    const entrega = sprint.entregas.id(req.params.entregaId);
    if (!entrega) return res.status(400).json({ mensagem: 'Entrega não encontrada na sprint.' });

    entrega.dataEntregue = new Date();
    await sprint.save();

    res.json({ mensagem: 'Entrega marcada como concluída com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao marcar entrega como concluída.' });
  }
});

// Editar uma entrega de uma sprint
router.put('/:sprintId/entregas/:entregaId', verifyToken, async (req, res) => {
    if (req.usuario.tipo !== 'adm') {
      return res.status(403).json({ mensagem: 'Apenas administradores podem editar entregas.' });
    }
  
    const { titulo, dataPrevista } = req.body;
  
    try {
      const sprint = await Sprint.findById(req.params.sprintId);
      if (!sprint) return res.status(404).json({ mensagem: 'Sprint não encontrada.' });
  
      const entrega = sprint.entregas.id(req.params.entregaId);
      if (!entrega) return res.status(404).json({ mensagem: 'Entrega não encontrada.' });
  
      if (titulo) entrega.titulo = titulo;
      if (dataPrevista) entrega.dataPrevista = new Date(dataPrevista);
  
      await sprint.save();
      res.json({ mensagem: 'Entrega atualizada com sucesso.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensagem: 'Erro ao editar entrega.' });
    }
});

// Excluir uma entrega de uma sprint
router.delete('/:sprintId/entregas/:entregaId', verifyToken, async (req, res) => {
    if (req.usuario.tipo !== 'adm') {
      return res.status(403).json({ mensagem: 'Apenas administradores podem excluir entregas.' });
    }
  
    try {
      const sprint = await Sprint.findById(req.params.sprintId);
      if (!sprint) return res.status(404).json({ mensagem: 'Sprint não encontrada.' });
  
      sprint.entregas = sprint.entregas.filter(e => e._id.toString() !== req.params.entregaId);
      await sprint.save();
  
      res.json({ mensagem: 'Entrega excluída com sucesso.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensagem: 'Erro ao excluir entrega.' });
    }
});

// Editar sprint (só ADM)
router.put('/:id', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') {
    return res.status(403).json({ mensagem: 'Apenas administradores podem editar sprints.' });
  }

  const { nome, dataInicio } = req.body;

  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ mensagem: 'Sprint não encontrada.' });

    const projetoId = sprint.projetoId;
    if (!projetoId) return res.status(400).json({ mensagem: 'Sprint sem projeto vinculado.' });

    const projeto = await Projeto.findById(projetoId);
    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuarioVinculadoAoProjeto(usuario, projeto)) {
      return res.status(403).json({ mensagem: 'Você só pode editar projetos da sua empresa.' });
    }

    if (!dataInicio || isNaN(new Date(dataInicio).getTime())) {
      return res.status(400).json({ mensagem: 'Data de início inválida.' });
    }

    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 14);

    sprint.nome = nome || sprint.nome;
    sprint.dataInicio = dataInicio;
    sprint.dataFim = dataFim;

    await sprint.save();
    res.json(sprint);
  } catch (err) {
    console.error('Erro ao editar sprint:', err);
    res.status(500).json({ mensagem: 'Erro ao editar sprint.' });
  }
});

// Excluir sprint e removê-la do projeto
router.delete('/:id', verifyToken, async (req, res) => {
  if (req.usuario.tipo !== 'adm') {
    return res.status(403).json({ mensagem: 'Apenas administradores podem excluir sprints.' });
  }

  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ mensagem: 'Sprint não encontrada.' });

    // Remove o ID da sprint do projeto
    await Projeto.findByIdAndUpdate(
      sprint.projetoId,
      { $pull: { sprints: sprint._id } }
    );

    await Sprint.findByIdAndDelete(req.params.id);

    res.json({ mensagem: 'Sprint excluída com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao excluir sprint.' });
  }
});
  
module.exports = router;
