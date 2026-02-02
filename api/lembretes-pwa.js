// api/lembretes-pwa.js - API para PWA Mind It
export default async function handler(req, res) {
  // 🔧 PERMITIR CORS (OBRIGATÓRIO para PWA)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 📋 CORS PREFLIGHT (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 📥 LOG para debugging
  console.log(`📱 API PWA: ${req.method} ${req.url}`, req.body || '');
  
  // 📄 GET - Listar lembretes (para teste)
  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: "✅ API Mind It PWA funcionando!",
      endpoints: {
        "GET": "Listar lembretes",
        "POST": "Criar lembrete",
        "OPTIONS": "CORS preflight"
      },
      sample_data: [
        {
          id: 1,
          task: "Tomar remédio às 20:00",
          scheduled_time: new Date(Date.now() + 3600000).toISOString(),
          status: "pending",
          user_id: "pwa-test-user"
        },
        {
          id: 2,
          task: "Reunião amanhã às 14:00",
          scheduled_time: new Date(Date.now() + 86400000).toISOString(),
          status: "pending",
          user_id: "pwa-test-user"
        }
      ],
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      connected_to: "Mind It WhatsApp Bot Database"
    });
  }
  
  // 📝 POST - Criar novo lembrete
  if (req.method === 'POST') {
    try {
      const { texto } = req.body;
      
      console.log('📱 Recebido do PWA:', texto);
      
      if (!texto || !texto.trim()) {
        return res.status(400).json({
          success: false,
          error: "Texto do lembrete é obrigatório",
          example: "Tomar remédio em 20 minutos"
        });
      }
      
      // ⏰ Simular processamento (DEPOIS conectamos ao seu parsing real)
      const agora = new Date();
      const umaHora = new Date(agora.getTime() + 3600000);
      
      // 📊 Resposta de sucesso
      const resposta = {
        success: true,
        message: "✅ Lembrete criado com sucesso via PWA!",
        data: {
          id: Date.now(),
          task: texto,
          scheduled_time: umaHora.toISOString(),
          hora_formatada: `${umaHora.getHours().toString().padStart(2, '0')}:${umaHora.getMinutes().toString().padStart(2, '0')}`,
          status: "pending",
          created_at: agora.toISOString()
        },
        next_steps: [
          "Conectar ao Supabase do WhatsApp Bot",
          "Usar parser existente do webhook.js",
          "Implementar notificações push"
        ],
        note: "Esta é uma API de teste. Logo conectaremos ao seu sistema completo!"
      };
      
      console.log('📤 Respondendo ao PWA:', resposta);
      return res.json(resposta);
      
    } catch (error) {
      console.error('❌ Erro na API PWA:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
  // ❌ Método não suportado
  return res.status(405).json({
    success: false,
    error: "Método não permitido",
    allowed_methods: ["GET", "POST", "OPTIONS"]
  });
}
