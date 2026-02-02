// api/lembretes-pwa.js
export default async function handler(req, res) {
  // Configurar CORS - ESSENCIAL para PWA
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Resposta para OPTIONS (preflight do navegador)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // LOG para debug (aparece no Vercel Logs)
  console.log(`[${new Date().toISOString()}] ${req.method} /api/lembretes-pwa`);
  
  // GET - Retorna status da API
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: "API Mind It PWA funcionando!",
      timestamp: new Date().toISOString(),
      endpoint: "/api/lembretes-pwa",
      instructions: "Use POST para criar lembretes",
      data: []
    });
  }
  
  // POST - Cria novo lembrete
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const texto = body?.texto || "Sem texto";
      
      console.log("Novo lembrete recebido:", texto);
      
      return res.status(200).json({
        success: true,
        message: "Lembrete salvo com sucesso!",
        id: Date.now().toString(),
        texto: texto,
        timestamp: new Date().toISOString(),
        received: body
      });
      
    } catch (error) {
      console.error("Erro no POST:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno no servidor",
        error: error.message
      });
    }
  }
  
  // Método não suportado
  return res.status(405).json({
    success: false,
    message: `Método ${req.method} não permitido. Use GET ou POST.`
  });
}
