// api/webhook.js - CÓDIGO COMPLETO ATUALIZADO
export default async function handler(req, res) {
  console.log('=== MIND IT BOT ===', new Date().toISOString());
  console.log('Método:', req.method);
  
  // 🔐 VERIFICAÇÃO DO WEBHOOK (META)
  if (req.method === 'GET') {
    console.log('📡 Verificação recebida');
    console.log('Query params:', req.query);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Token que você colocou no painel da Meta
    const TOKEN_CORRETO = 'MindItBot_2024_SecretToken123';
    
    console.log('🔍 Verificando:');
    console.log('- Mode:', mode);
    console.log('- Token recebido:', token);
    console.log('- Token esperado:', TOKEN_CORRETO);
    console.log('- São iguais?', token === TOKEN_CORRETO);
    
    if (mode === 'subscribe' && token === TOKEN_CORRETO) {
      console.log('✅✅✅ WEBHOOK VALIDADO PELA META! ✅✅✅');
      console.log('📤 Retornando challenge:', challenge);
      // RETORNA APENAS O CHALLENGE (texto puro)
      return res.status(200).send(challenge);
    } else {
      console.log('❌❌❌ FALHA NA VALIDAÇÃO ❌❌❌');
      return res.status(403).send('Verification failed');
    }
  }
  
  // 📩 MENSAGEM RECEBIDA DO WHATSAPP
  if (req.method === 'POST') {
    console.log('🎉🎉🎉 MENSAGEM WHATSAPP RECEBIDA! 🎉🎉🎉');
    
    // Resposta RÁPIDA que a Meta exige (dentro de 20 segundos)
    res.status(200).send('EVENT_RECEIVED');
    
    // Processar a mensagem (assincronamente)
    try {
      const body = req.body;
      console.log('📦 Body completo:', JSON.stringify(body, null, 2));
      
      // Extrair dados
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const phoneNumberId = value?.metadata?.phone_number_id;
      
      if (message) {
        const userNumber = message.from;
        const userText = message.text?.body || '';
        const messageId = message.id;
        
        console.log('👤 DETALHES DA MENSAGEM:');
        console.log('- De:', userNumber);
        console.log('- Texto:', userText);
        console.log('- ID:', messageId);
        console.log('- Phone Number ID:', phoneNumberId);
        
        // PROCESSAR COMANDO
        console.log('⚙️ PROCESSANDO COMANDO...');
        const resposta = processarComando(userText);
        
        console.log('🤖 RESPOSTA GERADA:', resposta.substring(0, 100) + '...');
        console.log('📊 STATUS: Comando processado com sucesso!');
        
        // TENTAR ENVIAR RESPOSTA (se tiver token configurado)
        if (process.env.META_ACCESS_TOKEN && phoneNumberId) {
          console.log('📤 Tentando enviar resposta via API Meta...');
          await enviarRespostaWhatsApp(userNumber, resposta, phoneNumberId);
        } else {
          console.log('⚠️ Resposta não enviada (falta token ou phone ID)');
          console.log('- Token configurado?', !!process.env.META_ACCESS_TOKEN);
          console.log('- Phone ID:', phoneNumberId);
        }
        
      } else {
        console.log('⚠️ Mensagem não encontrada no formato esperado');
      }
      
    } catch (error) {
      console.log('❌ ERRO ao processar mensagem:', error.message);
      console.log('🧾 Stack:', error.stack);
    }
    
    return;
  }
  
  // Qualquer outro método
  console.log('⚠️ Método não suportado:', req.method);
  res.status(200).json({ 
    status: 'online', 
    message: 'Mind It Bot Webhook',
    instructions: 'Use GET para verificação Meta ou POST para mensagens WhatsApp'
  });
}

// 🧠 PROCESSADOR DE COMANDOS
function processarComando(texto) {
  texto = texto.toLowerCase().trim();
  
  // Saudação
  if (texto === 'oi' || texto === 'olá' || texto === 'ola' || texto === '0i') {
    return `👋 Olá! Sou o *Mind It Bot*.\n\nSou seu assistente de memória externa para nunca mais esquecer compromissos!\n\nDigite */ajuda* para ver os comandos.`;
  }
  
  // Ajuda
  if (texto === '/ajuda' || texto === 'ajuda') {
    return `*📋 COMANDOS DO MIND IT:*\n\n` +
           `• */novo* [tarefa] # [hora] - Criar lembrete\n` +
           `• */lista* - Ver todos lembretes\n` +
           `• */ajuda* - Esta mensagem\n\n` +
           `*💡 EXEMPLO:*\n` +
           `/novo Comprar leite # 19:00\n` +
           `/novo Ligar para cliente # 15:30\n\n` +
           `*🎯 FUNCIONALIDADE:*\n` +
           `Lembra você automaticamente no horário agendado!`;
  }
  
  // Listar
  if (texto === '/lista') {
    return `*📋 SEUS LEMBRETES (SIMULAÇÃO MVP):*\n\n` +
           `1. 🛒 Comprar leite - 19:00 (todo dia)\n` +
           `2. 📞 Ligar para mãe - 20:00 (todo dia)\n` +
           `3. 💰 Pagar conta luz - amanhã 18:00\n\n` +
           `*✅ MVP VALIDADO:* Fluxo de lembretes funcionando!\n` +
           `Próximo: Integração completa com banco de dados.`;
  }
  
  // Novo lembrete
  if (texto.startsWith('/novo')) {
    return `*✅ LEMBRETE CRIADO! (SIMULAÇÃO MVP)*\n\n` +
           `Sua solicitação foi processada:\n` +
           `"${texto.replace('/novo', '').trim()}"\n\n` +
           `*🔄 PRÓXIMOS PASSOS:*\n` +
           `1. Integração com Supabase (armazenamento real)\n` +
           `2. Agendamento automático de lembretes\n` +
           `3. Notificações pontuais no WhatsApp\n\n` +
           `*🎉 MVP VALIDADO COM SUCESSO!*`;
  }
  
  // Default
  return `🤖 Recebi: "${texto}"\n\n` +
         `Digite */ajuda* para ver os comandos disponíveis.\n\n` +
         `*🔧 STATUS MVP:* Processamento funcionando!\n` +
         `Aguardando permissão final da Meta para respostas automáticas.`;
}

// 📤 ENVIAR RESPOSTA VIA META API
async function enviarRespostaWhatsApp(destinatario, texto, phoneNumberId) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.log('❌ Token de acesso não configurado no Vercel');
      console.log('💡 Configure META_ACCESS_TOKEN nas variáveis de ambiente');
      return false;
    }
    
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    console.log('🚀 Enviando para:', destinatario);
    console.log('🔗 URL:', url);
    
    const payload = {
      messaging_product: 'whatsapp',
      to: destinatario,
      type: 'text',
      text: {
        body: texto
      }
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('📤 Resposta da API Meta:', data);
    
    if (response.ok) {
      console.log('✅✅✅ MENSAGEM ENVIADA COM SUCESSO! ✅✅✅');
      return true;
    } else {
      console.log('❌ Erro ao enviar:', data.error?.message);
      console.log('🔍 Código do erro:', data.error?.code);
      return false;
    }
    
  } catch (error) {
    console.log('💥 Erro fatal:', error.message);
    return false;
  }
}
