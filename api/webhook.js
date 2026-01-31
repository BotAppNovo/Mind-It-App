// api/webhook.js - Webhook para WhatsApp Meta API
export default function handler(req, res) {
  console.log('=== WHATSAPP WEBHOOK ACESSADO ===');
  console.log('Método:', req.method);
  console.log('Query:', JSON.stringify(req.query));
  console.log('Body:', JSON.stringify(req.body));
  
  // 🔐 VERIFICAÇÃO DO WEBHOOK (quando a Meta testa)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // ⚠️⚠️⚠️ SUBSTITUA PELO SEU TOKEN ⚠️⚠️⚠️
    const MEU_TOKEN = 'MindItBot_2024_SecretToken123'; // COLOCA AQUI O MESMO TOKEN DO PAINEL DA META
    
    console.log('🔍 Dados da verificação:');
    console.log('Mode:', mode);
    console.log('Token recebido:', token);
    console.log('Token esperado:', MEU_TOKEN);
    console.log('Challenge:', challenge);
    
    if (mode === 'subscribe' && token === MEU_TOKEN) {
      console.log('✅✅✅ WEBHOOK VALIDADO COM SUCESSO!');
      return res.status(200).send(challenge);
    } else {
      console.log('❌❌❌ FALHA NA VALIDAÇÃO');
      console.log('Motivo:');
      console.log('- Mode correto?', mode === 'subscribe');
      console.log('- Token correto?', token === MEU_TOKEN);
      return res.status(403).send('Token inválido');
    }
  }
  
  // 📩 MENSAGEM RECEBIDA DO WHATSAPP
  if (req.method === 'POST') {
    console.log('📩 MENSAGEM RECEBIDA DO WHATSAPP');
    
    // A Meta exige resposta RÁPIDA (dentro de 20s)
    res.status(200).send('EVENT_RECEIVED');
    
    // Processa a mensagem depois
    try {
      const body = req.body;
      console.log('Body completo:', JSON.stringify(body, null, 2));
      
      // Extrai dados da mensagem
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (message) {
        const userNumber = message.from;
        const userText = message.text?.body;
        console.log(`💬 Usuário ${userNumber} disse: ${userText}`);
        
        // Aqui você pode salvar no Supabase depois
        console.log('📝 Salvaria no Supabase:', { userNumber, userText });
      }
    } catch (error) {
      console.log('Erro ao processar mensagem:', error);
    }
    
    return;
  }
  
  // Se não for GET nem POST
  console.log('⚠️ Método não suportado:', req.method);
  res.status(200).send('Webhook ativo - Use GET para verificação ou POST para mensagens');
}
