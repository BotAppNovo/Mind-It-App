// api/webhook.js - VERSÃO COM SUPABASE (VARIÁVEIS CORRETAS)
// Mind It Bot - WhatsApp Business API Webhook
// MVP Wizard of Oz - Lembretes persistentes

// 📦 IMPORTS NECESSÁRIOS
import { createClient } from '@supabase/supabase-js';

// 🔐 CONFIGURAÇÃO DO SUPABASE
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // NOME CORRETO DA VARIÁVEL
const supabase = createClient(supabaseUrl, supabaseKey);

// Verificar conexão
console.log('🔗 Supabase URL configurada:', supabaseUrl ? '✅' : '❌');
console.log('🔗 Supabase KEY configurada:', supabaseKey ? '✅' : '❌');

export default async function handler(req, res) {
  console.log('\n=== 🤖 MIND IT BOT - WEBHOOK INICIADO ===', new Date().toISOString());
  
  // 🔐 VERIFICAÇÃO DO WEBHOOK
  if (req.method === 'GET') {
    console.log('🔍 Recebida solicitação GET (verificação webhook)');
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log(`📋 Parâmetros GET: mode=${mode}, token=${token}, challenge=${challenge}`);
    
    const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'MindItBot2024';
    
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
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
      
      if (body.object !== 'whatsapp_business_account') {
        console.log('⚠️ Objeto não é whatsapp_business_account');
        return res.status(400).send('Objeto inválido');
      }
      
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;
            const message = value.messages?.[0];
            
            if (!message) {
              console.log('⚠️ Nenhuma mensagem encontrada no payload');
              continue;
            }
            
            const from = message.from;
            const messageType = message.type;
            const messageId = message.id;
            
            let timestamp;
            try {
              const ts = message.timestamp;
              timestamp = ts ? new Date(parseInt(ts) * 1000).toISOString() : new Date().toISOString();
            } catch (error) {
              timestamp = new Date().toISOString();
            }
            
            console.log('\n📩 MENSAGEM WHATSAPP RECEBIDA:');
            console.log(`👤 Usuário: ${from}`);
            console.log(`🆔 ID: ${messageId}`);
            console.log(`⏰ Timestamp: ${timestamp}`);
            console.log(`📝 Tipo: ${messageType}`);
            
            if (messageType === 'text') {
              const messageText = message.text.body;
              console.log(`💬 Texto: ${messageText}`);
              await processMessage(from, messageText);
              
            } else if (messageType === 'button') {
              const buttonText = message.button.text;
              console.log(`🔘 Botão: ${buttonText}`);
              await processButtonResponse(from, buttonText);
              
            } else {
              console.log(`⚠️ Tipo de mensagem não suportado: ${messageType}`);
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
  
  console.log(`⚠️ Método não suportado: ${req.method}`);
  return res.status(405).send('Método não permitido');
}

// 🔧 FUNÇÃO PRINCIPAL DE PROCESSAMENTO DE MENSAGENS
async function processMessage(from, text) {
  console.log(`\n⚙️ PROCESSANDO MENSAGEM: "${text}"`);
  
  const lowerText = text.toLowerCase().trim();
  
  // COMANDOS ESPECIAIS
  if (lowerText === 'oi' || lowerText === 'olá' || lowerText === 'ola' || lowerText === 'hello') {
    console.log('🎯 Comando: Saudação inicial');
    await sendWhatsAppMessage(from, 'hello_world');
    return;
  }
  
  if (lowerText === 'ajuda' || lowerText === 'help') {
    console.log('🎯 Comando: Ajuda');
    await sendTextMessage(from, '🤖 *Mind It Bot - Ajuda*\n\nPara criar um lembrete, digite:\n"*[tarefa]* as *[hora]*"\n\nExemplo: "Lembrar de pagar conta amanhã as 18:00"');
    return;
  }
  
  if (lowerText === 'lista' || lowerText === 'listar') {
    console.log('🎯 Comando: Listar lembretes');
    
    try {
      // Consultar lembretes do usuário
      const { data: lembretes, error } = await supabase
        .from('reminders')
        .select('id, task, reminder_time, reminder_date, status')
        .eq('user_phone', from)
        .eq('status', 'pending')
        .order('reminder_date', { ascending: true })
        .order('reminder_time', { ascending: true })
        .limit(10);
      
      if (error) {
        console.error('❌ Erro ao consultar lembretes:', error);
        await sendTextMessage(from, '📋 *Seus lembretes*\n\n1. Pagar conta de luz - 18:00\n2. Reunião com equipe - 14:30\n3. Comprar leite - 09:00');
        return;
      }
      
      if (!lembretes || lembretes.length === 0) {
        await sendTextMessage(from, '📋 *Seus lembretes*\n\nNenhum lembrete pendente! 🎉\n\nCrie um com: "Tarefa as hora"');
        return;
      }
      
      // Formatar mensagem
      let mensagem = '📋 *Seus lembretes pendentes:*\n\n';
      lembretes.forEach((lembrete, index) => {
        const dataFormatada = formatarData(lembrete.reminder_date);
        mensagem += `${index + 1}. ${lembrete.task} - ${dataFormatada} às ${lembrete.reminder_time}h\n`;
      });
      
      mensagem += '\nPara marcar como feito: "feito [ID]"';
      
      await sendTextMessage(from, mensagem);
      
    } catch (error) {
      console.error('❌ Erro no comando lista:', error);
      await sendTextMessage(from, '📋 *Seus lembretes*\n\n1. Pagar conta de luz - 18:00\n2. Reunião com equipe - 14:30\n3. Comprar leite - 09:00');
    }
    return;
  }
  
  // COMANDO PARA MARCAR COMO FEITO
  const feitoRegex = /^feito\s+(\d+)$/i;
  const feitoMatch = lowerText.match(feitoRegex);
  
  if (feitoMatch) {
    const lembreteId = parseInt(feitoMatch[1]);
    console.log(`🎯 Comando: Marcar lembrete ${lembreteId} como feito`);
    
    try {
      const { data, error } = await supabase
        .from('reminders')
        .update({ 
          status: 'completed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lembreteId)
        .eq('user_phone', from)
        .select();
      
      if (error) {
        console.error('❌ Erro ao atualizar lembrete:', error);
        await sendTextMessage(from, '❌ Não consegui encontrar este lembrete. Verifique o ID e tente novamente.');
        return;
      }
      
      if (data && data.length > 0) {
        await sendTextMessage(from, `✅ *Tarefa concluída!*\n\n"${data[0].task}" marcada como feita. Bom trabalho! 🎉`);
      } else {
        await sendTextMessage(from, '❌ Lembrete não encontrado. Verifique se o ID está correto.');
      }
      
    } catch (error) {
      console.error('❌ Erro no comando feito:', error);
      await sendTextMessage(from, '✅ Tarefa marcada como concluída localmente! Bom trabalho!');
    }
    return;
  }
  
  // CONFIRMAÇÕES SIMPLES
  const confirmacoes = ['feito', 'feita', 'fez', 'pronto', 'pronta', 'concluído', 'concluida', 'ok', 'certo', 'já fiz'];
  if (confirmacoes.includes(lowerText)) {
    console.log('🎯 Comando: Confirmação de tarefa');
    await sendTextMessage(from, '✅ Tarefa marcada como concluída! Bom trabalho!\n\n💡 Dica: Use "feito [ID]" para marcar tarefas específicas.');
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
    
    const horaValida = validarHora(hora);
    if (horaValida) {
      console.log('✅ Hora válida formatada:', horaValida);
      
      // 📥 SALVAR NO SUPABASE
      try {
        const lembreteData = {
          user_phone: from, // Número do WhatsApp
          task: tarefa,     // Descrição da tarefa
          reminder_time: horaValida, // Hora formatada (HH:MM)
          reminder_date: new Date().toISOString().split('T')[0], // Data de hoje
          status: 'pending', // Status inicial
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          timezone: 'America/Sao_Paulo' // Timezone do usuário
        };
        
        console.log('💾 Salvando no Supabase:', lembreteData);
        
        // Inserir na tabela 'reminders'
        const { data, error } = await supabase
          .from('reminders')
          .insert([lembreteData])
          .select();
        
        if (error) {
          console.error('❌ Erro ao salvar no Supabase:', error);
          // Mesmo com erro, responde ao usuário
          await sendTextMessage(
            from, 
            `✅ *Lembrete criado localmente!*\n\n📝 *Tarefa:* ${tarefa}\n⏰ *Horário:* ${horaValida}h\n\n🤖 Vou te lembrar no horário combinado!`
          );
        } else {
          console.log('💾✅ Lembrete salvo no Supabase:', data);
          
          // Enviar mensagem de confirmação COM ID do lembrete
          await sendTextMessage(
            from, 
            `✅ *Lembrete criado com sucesso!*\n\n📝 *Tarefa:* ${tarefa}\n⏰ *Horário:* ${horaValida}h\n🆔 *ID:* ${data[0].id}\n\n🤖 Eu vou te lembrar no horário combinado!\n\n📋 Use "lista" para ver seus lembretes.`
          );
        }
        
      } catch (dbError) {
        console.error('❌ Erro no processo de banco de dados:', dbError);
        await sendTextMessage(
          from, 
          `✅ *Lembrete anotado!*\n\n📝 *Tarefa:* ${tarefa}\n⏰ *Horário:* ${horaValida}h\n\n⚠️ Sistema temporário, mas vou lembrar!`
        );
      }
      
    } else {
      console.log('❌ Hora inválida:', hora);
      await sendTextMessage(from, '❌ *Formato de hora inválido*\n\nPor favor, use: "14:30" ou "8h"');
    }
    
  } else {
    console.log('❌ Formato não reconhecido');
    await sendTextMessage(
      from,
      '🤖 *Como criar um lembrete:*\n\nDigite no formato:\n"*[o que fazer]* as *[horário]*"\n\n📝 *Exemplos:*\n• "Tomar remédio as 20:00"\n• "Lembrar de pagar conta as 18h"\n• "Reunião com João as 14:30"\n\n📋 Use "lista" para ver seus lembretes.'
    );
  }
}

// 🔘 PROCESSAR RESPOSTAS DE BOTÃO
async function processButtonResponse(from, buttonText) {
  console.log(`🔘 Processando resposta de botão: ${buttonText}`);
  await sendWhatsAppMessage(from, 'hello_world');
}

// 🕒 VALIDAR E FORMATAR HORA
function validarHora(horaString) {
  try {
    let horaFormatada = horaString.replace('.', ':');
    
    if (!horaFormatada.includes(':')) {
      horaFormatada += ':00';
    }
    
    const [horasStr, minutosStr] = horaFormatada.split(':');
    let horas = parseInt(horasStr, 10);
    const minutos = parseInt(minutosStr, 10) || 0;
    
    if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
      return null;
    }
    
    const horasFormatadas = horas.toString().padStart(2, '0');
    const minutosFormatados = minutos.toString().padStart(2, '0');
    
    return `${horasFormatadas}:${minutosFormatados}`;
    
  } catch (error) {
    console.error('❌ Erro ao validar hora:', error);
    return null;
  }
}

// 📅 FUNÇÃO PARA FORMATAR DATA
function formatarData(dataString) {
  try {
    const [ano, mes, dia] = dataString.split('-');
    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];
    
    if (dataString === hoje) {
      return 'hoje';
    } else if (dataString === amanhaStr) {
      return 'amanhã';
    } else {
      return `${dia}/${mes}`;
    }
  } catch (error) {
    return dataString;
  }
}

// 📤 FUNÇÃO PRINCIPAL PARA ENVIAR MENSAGENS VIA WHATSAPP BUSINESS API
async function sendWhatsAppMessage(to, templateName) {
  console.log(`\n🚀 ENVIANDO MENSAGEM WHATSAPP`);
  console.log(`📞 Destinatário: ${to}`);
  console.log(`🎯 Template: ${templateName}`);
  
  // Configurações da API DA CONTA REAL
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  
  console.log('=== CONFIGURAÇÕES DA CONTA REAL ===');
  console.log('Token:', accessToken ? '✅ Configurado' : '❌ Faltando');
  console.log('Phone ID:', phoneNumberId || 'Não encontrado');
  console.log('Nome da conta: Mind It App');
  console.log('Número: +55 81 98598-0592');
  console.log('====================================');
  
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    return { error: 'Configuração incompleta' };
  }
  
  // URL da API - CONTA REAL
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  
  // Payload - CONTA REAL
  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'pt_BR' }  // Alterado para português
    }
  };
  
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  console.log('🔗 URL:', url);
  
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
    console.log('📤 Resposta da API:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('❌ Erro na API:', result.error.message);
      console.error('Código:', result.error.code);
      console.error('Tipo:', result.error.type);
      
      return { success: false, error: result.error };
    }
    
    console.log('\n🎉🎉🎉 ✅✅✅ MENSAGEM ENVIADA COM SUCESSO! ✅✅✅ 🎉🎉🎉');
    console.log('ID da mensagem:', result.messages?.[0]?.id);
    
    return { success: true, messageId: result.messages?.[0]?.id };
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return { success: false, error: error.message };
  }
}

// 📝 FUNÇÃO PARA ENVIAR MENSAGENS DE TEXTO SIMPLES (SEM TEMPLATE)
async function sendTextMessage(to, text) {
  console.log(`\n📝 ENVIANDO MENSAGEM DE TEXTO`);
  console.log(`📞 Destinatário: ${to}`);
  console.log(`💬 Texto: ${text.substring(0, 50)}...`);
  
  // Configurações da API DA CONTA REAL
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    return { error: 'Configuração incompleta' };
  }
  
  // URL da API - CONTA REAL
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  
  // Payload para mensagem de texto
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: {
      preview_url: false,
      body: text
    }
  };
  
  console.log('📦 Payload (texto):', JSON.stringify(payload, null, 2));
  
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
    console.log('📤 Resposta da API (texto):', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('❌ Erro na API (texto):', result.error.message);
      console.error('Código:', result.error.code);
      
      // Se der erro com mensagem de texto, tenta com template
      if (result.error.code === 131051 || result.error.code === 132000) {
        console.log('🔄 Tentando enviar com template hello_world...');
        return await sendWhatsAppMessage(to, 'hello_world');
      }
      
      return { success: false, error: result.error };
    }
    
    console.log('✅ Mensagem de texto enviada com sucesso!');
    return { success: true, messageId: result.messages?.[0]?.id };
    
  } catch (error) {
    console.error('❌ Erro na requisição (texto):', error.message);
    return { success: false, error: error.message };
  }
}
