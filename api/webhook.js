// api/webhook.js - VERSÃO COM MELHOR LOG PARA DEBUG
export default async function handler(req, res) {
  console.log('=== 🌐 WEBHOOK CHAMADO ===', new Date().toISOString());
  console.log('📡 Método:', req.method);
  console.log('🔗 URL:', req.url);
  console.log('🔍 Query params:', JSON.stringify(req.query, null, 2));

  // 🔐 VERIFICAÇÃO DO WEBHOOK (META VALIDATION)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔐 Dados da verificação:');
    console.log('   Mode:', mode);
    console.log('   Token recebido:', token);
    console.log('   Challenge:', challenge);

    // TOKEN CONFIGURADO NA META
    const TOKEN_CORRETO = 'MindItBot2024';
    console.log('   Token esperado:', TOKEN_CORRETO);

    // Se não tem parâmetros, mostra status
    if (!mode && !token && !challenge) {
      console.log('ℹ️  Acesso direto sem parâmetros - Mostrando status');
      return res.status(200).json({
        status: 'online',
        app: 'Mind It Bot',
        webhook: 'ready_for_meta_verification',
        instructions: 'Meta should call with ?hub.mode=subscribe&hub.verify_token=MindItBot2024&hub.challenge=...',
        test_url: 'https://mind-it-app.vercel.app/webhook?hub.mode=subscribe&hub.verify_token=MindItBot2024&hub.challenge=TEST123',
        meta_app_id: '927029636678032'
      });
    }

    // Se tem parâmetros mas token errado
    if (mode === 'subscribe' && token !== TOKEN_CORRETO) {
      console.log('❌ Token incorreto!');
      console.log('   Recebido:', token);
      console.log('   Esperado:', TOKEN_CORRETO);
      return res.status(403).json({
        error: 'Verification failed',
        reason: 'Token mismatch',
        received_token: token,
        expected_token: TOKEN_CORRETO
      });
    }

    // Se tem parâmetros e token correto
    if (mode === 'subscribe' && token === TOKEN_CORRETO) {
      console.log('✅✅✅ TOKEN CORRETO! VALIDAÇÃO BEM-SUCEDIDA! ✅✅✅');
      console.log('📤 Retornando challenge para Meta');
      
      // LOG ESPECIAL PARA ANALISTA
      console.log('=== 🔍 META ANALYST VERIFICATION SUCCESS ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('App ID: 927029636678032');
      console.log('Webhook: https://mind-it-app.vercel.app/webhook');
      console.log('Status: ✅ READY FOR MESSAGES');
      console.log('============================================');
      
      return res.status(200).send(challenge); // APENAS O CHALLENGE COMO TEXTO
    }

    // Outros casos
    console.log('⚠️  Parâmetros incompletos ou mode incorreto');
    return res.status(400).send('Invalid request parameters');
  }

  // 📩 MENSAGEM RECEBIDA DO WHATSAPP (POST)
  if (req.method === 'POST') {
    console.log('🎉🎉🎉 MENSAGEM WHATSAPP RECEBIDA! 🎉🎉🎉');
    
    // Resposta RÁPIDA para Meta (dentro de 20s)
    res.status(200).send('EVENT_RECEIVED');
    
    try {
      const body = req.body;
      console.log('📦 Body completo:', JSON.stringify(body, null, 2));
      
      // Extrair dados
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      
      if (message) {
        const userNumber = message.from;
        const userText = message.text?.body || '';
        const messageId = message.id;
        
        // LOG PARA ANALISTA META
        console.log('=== 🔍 META ANALYST - MESSAGE LOG ===');
        console.log('📱 WhatsApp Message Received');
        console.log('👤 From:', userNumber);
        console.log('💬 Text:', userText);
        console.log('🆔 Message ID:', messageId);
        console.log('⏰ Timestamp:', new Date().toISOString());
        console.log('✅ Status: PROCESSED SUCCESSFULLY');
        console.log('ℹ️  Note: Awaiting whatsapp_business_messaging permission');
        console.log('=====================================');
        
      } else {
        console.log('⚠️  Message without expected format');
      }
      
    } catch (error) {
      console.log('❌ Error processing message:', error.message);
    }
    
    return;
  }

  // Outros métodos HTTP
  console.log('⚠️  Método não suportado:', req.method);
  res.status(405).json({
    error: 'Method not allowed',
    allowed_methods: ['GET', 'POST'],
    webhook_status: 'active',
    meta_verification: 'pending'
  });
}
