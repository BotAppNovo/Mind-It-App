// api/lembretes-pwa.js - API para PWA Mind It
export default async function handler(req, res) {
  // Permitir CORS (IMPORTANTE para PWA)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Para requisições OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET - Listar lembretes de teste
  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: "✅ API do Mind It PWA funcionando!",
      lembretes: [
        {
          id: 1,
          task: "Tomar remédio às 20:00",
          scheduled_time: new Date(Date.now() + 3600000).toISOString(),
          status: "pending"
        },
        {
          id: 2,
          task: "Reunião amanhã às 14:00",
          scheduled_time: new Date(Date.now() + 86400000).toISOString(),
          status: "pending"
        }
      ],
      timestamp: new Date().toISOString()
    });
  }
  
  // POST - Criar novo lembrete
  if (req.method === 'POST') {
    try {
      const { texto } = req.body;
      
      if (!texto) {
        return res.status(400).json({
          success: false,
          error: "Texto é obrigatório"
        });
      }
      
      // Simular processamento
      const agora = new Date();
      const umaHora = new Date(agora.getTime() + 3600000);
      
      return res.json({
        success: true,
        message: "✅ Lembrete criado com sucesso!",
        tarefa: texto,
        hora: `${umaHora.getHours().toString().padStart(2, '0')}:${umaHora.getMinutes().toString().padStart(2, '0')}`,
        id: Date.now(),
        data: umaHora.toISOString(),
        nota: "API de teste - Conectaremos ao Supabase em breve!"
      });
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Método não suportado
  return res.status(405).json({
    success: false,
    error: "Método não permitido"
  });
}
