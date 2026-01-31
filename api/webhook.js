// api/webhook.js - DEBUG ULTRA SIMPLES
export default async function handler(req, res) {
  // LOG INICIAL
  console.log('=== INÍCIO ===', new Date().toISOString());
  
  // SE FOR GET (verificação ou teste manual)
  if (req.method === 'GET') {
    console.log('📡 GET recebido');
    console.log('Query params:', req.query);
    
    // Se for verificação da Meta
    if (req.query['hub.mode'] === 'subscribe') {
      console.log('🔐 É verificação da Meta!');
      const token = req.query['hub.verify_token'];
      if (token === 'MindItBot_2024_SecretToken123') {
        console.log('✅ Token correto!');
        return res.status(200).send(req.query['hub.challenge']);
      }
      console.log('❌ Token errado');
      return res.status(403).send('Invalid token');
    }
    
    // Se for teste manual
    return res.status(200).json({
      status: 'online',
      message: 'Webhook funcionando!',
      time: new Date().toISOString(),
      test: 'Envie uma mensagem via Meta para testar'
    });
  }
  
  // SE FOR POST (mensagem do WhatsApp)
  if (req.method === 'POST') {
    console.log('🎉🎉🎉 POST RECEBIDO - MENSAGEM DO WHATSAPP! 🎉🎉🎉');
    console.log('📦 Body completo:', JSON.stringify(req.body));
    
    // Resposta obrigatória RÁPIDA para Meta
    res.status(200).send('EVENT_RECEIVED');
    
    // Análise detalhada
    try {
      const body = req.body;
      console.log('🔍 Tipo do body:', typeof body);
      console.log('🔍 Keys do body:', Object.keys(body));
      
      if (body.object === 'whatsapp_business_account') {
        console.log('✅ CONFIRMADO: É WhatsApp Business Account!');
      }
      
      if (body.entry && Array.isArray(body.entry)) {
        console.log(`📊 ${body.entry.length} entrada(s) encontrada(s)`);
      }
      
    } catch (error) {
      console.log('❌ Erro ao analisar:', error.message);
    }
    
    return;
  }
  
  // Outros métodos
  res.status(405).send('Method not allowed');
}
