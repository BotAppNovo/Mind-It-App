// api/cron-job.js - AGENDADOR SUPER SIMPLES
// Mind It Bot - Teste de cron

export default async function handler(req, res) {
  console.log('🔧 Cron-job.js executado!');
  
  // Segurança básica
  if (req.query.secret !== 'MindItCron2024') {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  // Resposta simples de teste
  return res.status(200).json({
    success: true,
    message: 'Cron funcionando!',
    time: new Date().toISOString(),
    test: '✅ Sistema OK'
  });
}
