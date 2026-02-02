// api/lembretes-pwa.js - API para PWA
export default async function handler(req, res) {
  // Permitir CORS (importante para PWA)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responder OPTIONS para CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET: Listar lembretes
  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: "API PWA funcionando!",
      lembretes: [
        {
          id: 1,
          task: "Exemplo: Tomar remédio",
          scheduled_time: new Date(Date.now() + 300000).toISOString(),
          status: "pending"
        },
        {
          id: 2,
          task: "Exemplo: Reunião",
          scheduled_time: new Date(Date.now() + 3600000).toISOString(),
          status: "pending" 
        }
      ]
    });
  }
  
  // POST: Criar lembrete
  if (req.method === 'POST') {
    try {
      const { texto } = req.body;
      
      return res.json({
        success: true,
        message: "✅ Lembrete criado via PWA!",
        tarefa: texto || "Tarefa de exemplo",
        hora: new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        id: Date.now(),
        nota: "Esta é uma API de teste. Conectaremos ao Supabase depois."
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  return res.status(404).json({ error: "Endpoint não encontrado" });
}
