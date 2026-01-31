// api/webhook.js - VERSÃO CORRIGIDA PARA VERIFICAÇÃO
export default async function handler(req, res) {
  console.log('=== MIND IT BOT WEBHOOK ===', new Date().toISOString());
  console.log('Método:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);

  // 🔐 VERIFICAÇÃO DO WEBHOOK (GET - Meta validation)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('🔍 Webhook Verification:');
    console.log('- Mode:', mode);
    console.log('- Token recebido:', token);
    console.log('- Challenge:', challenge);
    
    // TOKEN QUE VOCÊ DEVE USAR NA META
    const TOKEN_CORRETO = 'MindItBot2024';
    
    console.log('- Token esperado:', TOKEN_CORRETO);
    console.log('- Tokens são iguais?', token === TOKEN_CORRETO);
    
    if (mode === 'subscribe' && token === TOKEN_CORRETO) {
      console.log('✅✅✅ WEBHOOK VALIDADO COM SUCESSO! ✅✅✅');
      console.log('📤 Retornando challenge para Meta');
      return res.status(200).send(challenge); // APENAS O CHALLENGE
    } else {
      console.log('❌❌❌ FALHA NA VALIDAÇÃO ❌❌❌');
      console.log('Razão:', token === TOKEN_CORRETO ? 'Mode incorreto' : 'Token incorreto');
      return res.status(403).send('Verification failed');
    }
  }
  
  // 📩 MENSAGEM RECEBIDA (POST - WhatsApp message)
  if (req.method === 'POST') {
    console.log('🎉 MENSAGEM WHATSAPP RECEBIDA!');
    
    // Resposta RÁPIDA para Meta (dentro de 20s)
    res.status(200).send('EVENT_RECEIVED');
    
    try {
      const body = req.body;
      console.log('📦 Body recebido:', JSON.stringify(body, null, 2));
      
      // Extrair dados da mensagem
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      
      if (message) {
        const userNumber = message.from;
        const userText = message.text?.body || '';
        const messageId = message.id;
        
        console.log('=== 🔍 LOG PARA ANALISTA META ===');
        console.log('📱 Mensagem recebida!');
        console.log('👤 De:', userNumber);
        console.log('💬 Texto:', userText);
        console.log('🆔 ID:', messageId);
        console.log('⏰ Timestamp:', new Date().toISOString());
        console.log('✅ Status: PROCESSADO COM SUCESSO');
        console.log('ℹ️  Nota: Aguardando permissão whatsapp_business_messaging');
        console.log('=== FIM DO LOG ===');
        
        // Processar comando (só logar por enquanto)
        console.log('⚙️ Comando processado:', userText);
        
      } else {
        console.log('⚠️ Mensagem sem formato esperado');
      }
      
    } catch (error) {
      console.log('❌ Erro:', error.message);
    }
    
    return;
  }
  
  // Outros métodos
  console.log('⚠️ Método não suportado:', req.method);
  res.status(200).json({ 
    status: 'online', 
    message: 'Mind It Bot Webhook',
    endpoint: 'https://mind-it-app.vercel.app/webhook'
  });
}
