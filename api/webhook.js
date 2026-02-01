// api/webhook.js
// Mind It Bot - WhatsApp Business API Webhook
// MVP Wizard of Oz - Lembretes persistentes

export default async function handler(req, res) {
  console.log('\n=== 🤖 MIND IT BOT - WEBHOOK INICIADO ===', new Date().toISOString());
  
  // 🔐 VERIFICAÇÃO DO WEBHOOK (Meta requer durante configuração)
  if (req.method === 'GET') {
    console.log('🔍 Recebida solicitação GET (verificação webhook)');
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log(`📋 Parâmetros GET: mode=${mode}, token=${token}, challenge=${challenge}`);
    
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ Token de verificação VÁLIDO! Webhook verificado.');
      return res.status(200).send(challenge);
    } else {
      console.log('❌ Token de verificação INVÁLIDO!');
      return res.status(403).send('Token de verificação inválido');
    }
  }
  
  // 📨 PROCESSAMENTO DE MENSAGENS RECEBIDAS
  if (req.method === 'POST') {
    console.log('📨 Recebida solicitação POST (mensagem WhatsApp)');
    
    try {
      const body = req.body;
      console.log('📦 Body recebido:', JSON.stringify(body, null, 2));
      
      // Verificar se é uma mensagem válida do WhatsApp
      if (body.object !== 'whatsapp_business_account') {
        console.log('⚠️ Objeto não é whatsapp_business_account');
        return res.status(400).send('Objeto inválido');
      }
      
      // Processar cada entrada (pode ter múltiplas em uma requisição)
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Extrair informações da mensagem
            const message = value.messages?.[0];
            if (!message) {
              console.log('⚠️ Nenhuma mensagem encontrada no payload');
              continue;
            }
            
            const from = message.from; // Número do remetente
            const messageType = message.type;
            const messageId = message.id;
            const timestamp = new Date(parseInt(value.metadata.timestamp) * 1000).toISOString();
            
            console.log('\n📩 MENSAGEM WHATSAPP RECEBIDA:');
            console.log(`👤 Usuário: ${from}`);
            console.log(`🆔 ID: ${messageId}`);
            console.log(`⏰ Timestamp: ${timestamp}`);
            console.log(`📝 Tipo: ${messageType}`);
            
            // Processar texto da mensagem
            if (messageType === 'text') {
              const messageText = message.text.body;
              console.log(`💬 Texto: ${messageText}`);
              
              // Processar a mensagem
              await processMessage(from, messageText);
              
            } else if (messageType === 'button') {
              // Resposta de botão (ex: "feito", "adiar")
              const buttonText = message.button.text;
              console.log(`🔘 Botão: ${buttonText}`);
              
              // Processar resposta de botão
              await processButtonResponse(from, buttonText);
              
            } else {
              console.log(`⚠️ Tipo de mensagem não suportado: ${messageType}`);
              // Responder com mensagem de ajuda
              await sendWhatsAppMessage(from, 'hello_world');
            }
          }
        }
      }
      
      console.log('✅ Webhook processado com sucesso');
      return res.status(200).send('EVENT_RECEIVED');
      
    } catch (error) {
      console.error('❌ Erro no processamento do webhook:', error);
      return res.status(500).send('Erro interno');
    }
  }
  
  // Método HTTP não suportado
  console.log(`⚠️ Método não suportado: ${req.method}`);
  return res.status(405).send('Método não permitido');
}

// 🔧 FUNÇÃO PRINCIPAL DE PROCESSAMENTO DE MENSAGENS
async function processMessage(from, text) {
  console.log(`\n⚙️ PROCESSANDO MENSAGEM: "${text}"`);
  
  // Converter para minúsculas para comparação
  const lowerText = text.toLowerCase().trim();
  
  // COMANDOS ESPECIAIS
  if (lowerText === 'oi' || lowerText === 'olá' || lowerText === 'ola') {
    console.log('🎯 Comando: Saudação inicial');
    await sendWhatsAppMessage(from, 'hello_world');
    return;
  }
  
  if (lowerText === 'ajuda' || lowerText === 'help') {
    console.log('🎯 Comando: Ajuda');
    await sendWhatsAppMessage(from, 'hello_world');
    return;
  }
  
  if (lowerText === 'lista' || lowerText === 'listar') {
    console.log('🎯 Comando: Listar lembretes');
    await sendWhatsAppMessage(from, 'hello_world');
    return;
  }
  
  // CONFIRMAÇÕES (em minúsculas para capturar variações)
  const confirmacoes = ['feito', 'feita', 'fez', 'pronto', 'pronta', 'concluído', 'concluida', 'concluído', 'ok', 'certo', 'já fiz'];
  if (confirmacoes.includes(lowerText)) {
    console.log('🎯 Comando: Confirmação de tarefa');
    await sendWhatsAppMessage(from, 'hello_world');
    return;
  }
  
  // 📝 PARSING DO FORMATO "[tarefa] as [hora]"
  const regex = /(.+?)\s+as\s+(\d{1,2}(?:[:.]\d{2})?)\s*(?:h|hr|hrs)?/i;
  const match = text.match(regex);
  
  if (match) {
    const tarefa = match[1].trim();
    const hora = match[2].trim();
    
    console.log(`🎯 Formato detectado: "${tarefa}" as "${hora}"`);
    console.log(`📋 Tarefa: ${tarefa}`);
    console.log(`⏰ Hora: ${hora}`);
    
    // Validar hora (formato simples)
    const horaValida = validarHora(hora);
    if (horaValida) {
      console.log('✅ Hora válida formatada:', horaValida);
      
      // AQUI FUTURAMENTE: Salvar no banco de dados (Supabase)
      // const reminderId = await saveReminder(from, tarefa, horaValida);
      
      // Por enquanto, apenas responder
      await sendWhatsAppMessage(from, 'hello_world');
      
    } else {
      console.log('❌ Hora inválida:', hora);
      await sendWhatsAppMessage(from, 'hello_world');
    }
    
  } else {
    console.log('❌ Formato não reconhecido');
    
    // Se não for comando nem formato correto, responder com ajuda
    await sendWhatsAppMessage(from, 'hello_world');
  }
}

// 🔘 PROCESSAR RESPOSTAS DE BOTÃO (para interações futuras)
async function processButtonResponse(from, buttonText) {
  console.log(`🔘 Processando resposta de botão: ${buttonText}`);
  
  // Por enquanto, responder com hello_world
  await sendWhatsAppMessage(from, 'hello_world');
}

// 🕒 VALIDAR E FORMATAR HORA
function validarHora(horaString) {
  try {
    // Substituir ponto por dois pontos se necessário
    let horaFormatada = horaString.replace('.', ':');
    
    // Se não tiver minutos, adicionar :00
    if (!horaFormatada.includes(':')) {
      horaFormatada += ':00';
    }
    
    // Separar horas e minutos
    const [horasStr, minutosStr] = horaFormatada.split(':');
    let horas = parseInt(horasStr, 10);
    const minutos = parseInt(minutosStr, 10) || 0;
    
    // Validar ranges
    if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
      return null;
    }
    
    // Formatar para HH:MM
    const horasFormatadas = horas.toString().padStart(2, '0');
    const minutosFormatados = minutos.toString().padStart(2, '0');
    
    return `${horasFormatadas}:${minutosFormatados}`;
    
  } catch (error) {
    console.error('❌ Erro ao validar hora:', error);
    return null;
  }
}

// 📤 FUNÇÃO PARA ENVIAR MENSAGENS VIA WHATSAPP BUSINESS API
async function sendWhatsAppMessage(to, templateName) {
  console.log(`\n🚀 ENVIANDO MENSAGEM WHATSAPP`);
  console.log(`📞 Para: ${to}`);
  console.log(`🎯 Template: ${templateName}`);
  
  // Configurações da API
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    return { error: 'Configuração incompleta' };
  }
  
  // URL da API
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  // 🔥 PAYLOAD CORRIGIDO - SIMPLIFICADO IGUAL AO PAINEL META
  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en_US' }  // APENAS ISSO! SEM components NEM policy
    }
  };
  
  console.log('📦 Payload simplificado:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('📤 Resposta completa da API:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('❌ Erro na API:', result.error.message);
      console.error('Código:', result.error.code, 'Tipo:', result.error.type);
      
      // Log detalhado para erros comuns
      if (result.error.code === 100) {
        console.error('⚠️ Erro 100: Parâmetro inválido ou template não encontrado');
      } else if (result.error.code === 190) {
        console.error('⚠️ Erro 190: Token expirado ou inválido');
      } else if (result.error.code === 131030) {
        console.error('⚠️ Erro 131030: Template não está aprovado ou ativo');
      }
      
      return { success: false, error: result.error };
    }
    
    console.log('✅ Mensagem enviada com sucesso!');
    console.log('🆔 Message ID:', result.messages?.[0]?.id);
    return { success: true, messageId: result.messages?.[0]?.id };
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return { success: false, error: error.message };
  }
}

// 🏗️ FUNÇÕES FUTURAS (PARA SUPABASE)
/*
async function saveReminder(userId, task, time) {
  // Implementar quando Supabase estiver configurado
  console.log(`💾 [FUTURO] Salvando lembrete: ${task} às ${time} para ${userId}`);
  return 'temp-id-' + Date.now();
}

async function getReminders(userId) {
  // Implementar quando Supabase estiver configurado
  console.log(`📋 [FUTURO] Buscando lembretes para ${userId}`);
  return [];
}

async function markReminderDone(reminderId) {
  // Implementar quando Supabase estiver configurado
  console.log(`✅ [FUTURO] Marcando lembrete ${reminderId} como concluído`);
  return true;
}
*/
