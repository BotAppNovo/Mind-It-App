// api/check-reminders.js - VERSÃO SIMPLIFICADA
export default async function handler(req, res) {
  console.log('🔔 CRON TESTE - Funcionando!', new Date().toISOString());
  
  return res.status(200).json({
    success: true,
    message: 'Cron job funcionando!',
    timestamp: new Date().toISOString(),
    teste: '✅ Tudo ok!'
  });
}
