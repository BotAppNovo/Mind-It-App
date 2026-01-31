// api/webhook.js - Webhook COMPLETO para Meta WhatsApp
export default async function handler(req, res) {
  console.log('=== WHATSAPP WEBHOOK ACESSADO ===');
  console.log('Método:', req.method);
  
  // 🔐 VERIFICAÇÃO DO WEBHOOK
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    const MEU_TOKEN = 'MindItBot_2024_SecretToken123';
    
    if (mode === 'subscribe' && token === MEU_TOKEN) {
      console.log('✅ Meta WhatsApp webhook validado!');
      return res.status(200).send(challenge);
    } else {
      console.log('❌ Falha na validação');
      return res.status(403).send('Token inválido');
    }
  }
  
  // 📩 PROCESSAR E RESPONDER MENSAGENS
  if (req.method === 'POST') {
    console.log('📩 Mensagem POST recebida da Meta');
    
    // Resposta rápida que a Meta exige
    res.status(200).send('EVENT_RECEIVED');
    
    try {
      const body = req.body;
      console.log('Body completo:', JSON.stringify(body, null, 2));
      
      // Extrair dados da mensagem
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      
      if (message) {
        const userNumber = message.from;
        const userText = message.text?.body || '';
        const messageId = message.id;
        
        console.log(`💬 Mensagem recebida:`);
        console.log(`- De: ${userNumber}`);
        console.log(`- Texto: "${userText}"`);
        console.log(`- ID: ${messageId}`);
        
        // 🔧 PROCESSAR A MENSAGEM
        const resposta = await processarMensagem(userText);
        console.log(`🤖 Resposta: "${resposta}"`);
        
        // 📤 ENVIAR RESPOSTA via Meta API
        await enviarRespostaWhatsApp(userNumber, resposta);
        
      }
    } catch (error) {
      console.log('❌ Erro ao processar mensagem:', error);
    }
    
    return;
  }
  
  res.status(200).send('Webhook ativo');
}

// 🔧 FUNÇÃO PARA PROCESSAR MENSAGENS
async function processarMensagem(texto) {
  texto = texto.toLowerCase().trim();
  
  if (texto === 'oi' || texto === 'olá' || texto === 'ola' || texto === '0i') {
    return `👋 Olá! Bem-vindo ao Mind It!\n\nSou seu assistente de memória externa. Digite /ajuda para ver comandos.`;
  }
  
  if (texto === '/ajuda' || texto === 'ajuda') {
    return `ℹ️ *COMANDOS DISPONÍVEIS:*\n\n• /novo [tarefa] # [hora] - Criar lembrete\n• /lista - Ver todos lembretes\n• /ajuda - Esta mensagem\n\n*Exemplo:*\n/novo Comprar leite # 19:00`;
  }
  
  if (texto === '/lista') {
    return `📋 *SEUS LEMBRETES*\n\n1. Comprar leite - 19:00\n2. Ligar para mãe - 20:00\n\nDigite /novo para criar mais.`;
  }
  
  if (texto.startsWith('/novo')) {
    return `✅ *LEMBRETE CRIADO!*\n\nEm breve você poderá criar lembretes diretamente aqui! Por enquanto, anote manualmente. 😊`;
  }
  
  return `🤖 Recebi sua mensagem: "${texto}"\n\nDigite /ajuda para ver o que posso fazer por você!`;
}

// 📤 FUNÇÃO PARA ENVIAR RESPOSTA VIA META API
async function enviarRespostaWhatsApp(userNumber, texto) {
  try {
    // Usa variáveis de ambiente
    const accessToken = process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      console.log('⚠️ Token ou Phone Number ID não configurados no Vercel');
      console.log('Token:', accessToken ? '✅ Configurado' : '❌ Ausente');
      console.log('Phone ID:', phoneNumberId ? '✅ Configurado' : '❌ Ausente');
      return null;
    }
    
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    console.log(`📤 Enviando para ${userNumber}: "${texto}"`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: userNumber,
        text: { body: texto }
      }),
    });
    
    const data = await response.json();
    console.log('📤 Resposta da Meta API:', data);
    
    if (!response.ok) {
      console.log('❌ Erro da Meta API:', data);
      throw new Error(`Erro API: ${JSON.stringify(data)}`);
    }
    
    console.log('✅ Mensagem enviada com sucesso!');
    return data;
  } catch (error) {
    console.error('❌ Erro ao enviar resposta WhatsApp:', error);
    return null;
  }
}
