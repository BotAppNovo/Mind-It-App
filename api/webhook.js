// api/webhook.js - AGORA COM RESPOSTA AUTOMÁTICA
export default async function handler(req, res) {
  console.log('=== WHATSAPP WEBHOOK ===', new Date().toISOString());
  
  // 🔐 VERIFICAÇÃO DA META
  if (req.method === 'GET') {
    console.log('📡 GET - Verificação');
    if (req.query['hub.mode'] === 'subscribe') {
      const token = req.query['hub.verify_token'];
      if (token === 'MindItBot_2024_SecretToken123') {
        console.log('✅ Webhook verificado');
        return res.status(200).send(req.query['hub.challenge']);
      }
      return res.status(403).send('Invalid token');
    }
    return res.status(200).json({ status: 'online', time: new Date().toISOString() });
  }
  
  // 📩 MENSAGEM RECEBIDA
  if (req.method === 'POST') {
    console.log('📩 POST - Mensagem recebida');
    
    // Resposta RÁPIDA para Meta (obrigatório)
    res.status(200).send('EVENT_RECEIVED');
    
    try {
      const body = req.body;
      console.log('📦 Body:', JSON.stringify(body, null, 2));
      
      // Extrair dados da mensagem
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      
      if (message) {
        const userNumber = message.from;
        const userText = message.text?.body || '';
        const messageId = message.id;
        
        console.log(`💬 De: ${userNumber}`);
        console.log(`💬 Texto: "${userText}"`);
        console.log(`💬 ID: ${messageId}`);
        
        // GERAR RESPOSTA
        const resposta = gerarResposta(userText);
        console.log(`🤖 Resposta: "${resposta}"`);
        
        // ENVIAR RESPOSTA VIA META API
        await enviarMensagemWhatsApp(userNumber, resposta);
        
      } else {
        console.log('⚠️ Mensagem não encontrada no body');
      }
      
    } catch (error) {
      console.log('❌ Erro:', error.message);
    }
    
    return;
  }
  
  res.status(405).send('Method not allowed');
}

// 🔧 GERAR RESPOSTA BASEADA NA MENSAGEM
function gerarResposta(texto) {
  texto = texto.toLowerCase().trim();
  
  if (texto === 'oi' || texto === 'olá' || texto === 'ola' || texto === '0i') {
    return `👋 Olá! Bem-vindo ao *Mind It*!\n\nSou seu assistente de memória externa.\n\nDigite */ajuda* para ver os comandos disponíveis.`;
  }
  
  if (texto === '/ajuda' || texto === 'ajuda') {
    return `*📋 COMANDOS DISPONÍVEIS:*\n\n• */novo* [tarefa] # [hora] - Criar lembrete\n• */lista* - Ver todos lembretes\n• */ajuda* - Esta mensagem\n\n*💡 EXEMPLO:*\n/novo Comprar leite # 19:00`;
  }
  
  if (texto === '/lista') {
    return `*📋 SEUS LEMBRETES:*\n\n1. Comprar leite - 19:00\n2. Ligar para mãe - 20:00\n\nDigite */novo* para criar mais lembretes!`;
  }
  
  if (texto.startsWith('/novo')) {
    return `*✅ LEMBRETE CRIADO!*\n\nEm breve você poderá criar lembretes diretamente aqui!\n\nPor enquanto, teste os outros comandos. 😊`;
  }
  
  return `🤖 Recebi: "${texto}"\n\nDigite */ajuda* para ver o que posso fazer!`;
}

// 📤 ENVIAR MENSAGEM VIA META WHATSAPP API
async function enviarMensagemWhatsApp(destinatario, texto) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      console.log('⚠️ Variáveis de ambiente não configuradas no Vercel!');
      console.log('META_ACCESS_TOKEN:', accessToken ? '✅' : '❌');
      console.log('META_PHONE_NUMBER_ID:', phoneNumberId || '❌');
      return;
    }
    
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    console.log(`📤 Enviando para ${destinatario}:`, texto.substring(0, 50) + '...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: destinatario,
        text: { body: texto }
      }),
    });
    
    const data = await response.json();
    console.log('📤 Resposta da Meta API:', data);
    
    if (response.ok) {
      console.log('✅ Mensagem enviada com sucesso!');
    } else {
      console.log('❌ Erro ao enviar:', data);
    }
    
    return data;
  } catch (error) {
    console.log('❌ Erro fatal ao enviar:', error.message);
    return null;
  }
}
