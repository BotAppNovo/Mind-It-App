// api/webhook.js - VERSÃO PARA CONTA REAL MIND IT APP
// Mind It Bot - WhatsApp Business API Webhook
// MVP Wizard of Oz - Lembretes persistentes

// 🏗️ SUPABASE - IMPORTANTE: Instale primeiro: npm install @supabase/supabase-js
import { createClient } from '@supabase/supabase-js'

// Inicializa Supabase (configure variáveis no Vercel: SUPABASE_URL e SUPABASE_KEY)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
              // Redireciona para a saudação em vez de tentar template
              await processMessage(from, 'oi');
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
  
  // COMANDOS ESPECIAIS - TODOS USAM TEXTO DIRETO AGORA
  if (lowerText === 'oi' || lowerText === 'olá' || lowerText === 'ola' || 
      lowerText === 'hello' || lowerText === 'start' || lowerText === 'inicio' ||
      lowerText.includes('oi') || lowerText.includes('ola') || lowerText.includes('start')) {
    
    console.log('🎯 Comando: Saudação inicial');
    
    const mensagemSaudacao = `🤖 *Olá! Eu sou o Mind It Bot* 🧠

Sou sua memória externa no WhatsApp! Me diga o que precisa lembrar e eu te aviso na hora certa.

📝 *COMO USAR:*
Escreva no formato:
"*[o que fazer]* as *[horário]*"

✨ *EXEMPLOS:*
• "Tomar remédio as 20:00"
• "Lembrar de pagar conta as 18h"
• "Reunião com João as 14:30"

💡 *OUTROS COMANDOS:*
• "lista" - Ver seus lembretes
• "feito" - Marcar tarefa como concluída
• "ajuda" - Mostrar esta mensagem novamente

Vamos começar? Me diga sua primeira tarefa! ⏰`;
    
    await sendTextMessage(from, mensagemSaudacao);
    return;
  }
  
  if (lowerText === 'ajuda' || lowerText === 'help') {
    console.log('🎯 Comando: Ajuda');
    
    const mensagemAjuda = `🤖 *Mind It Bot - Ajuda Rápida*

📝 *CRIAR LEMBRETE:*
"*[tarefa]* as *[hora]*"
Exemplo: "Comprar leite as 18h"

📋 *VER LEMBRETES:*
Envie "lista" para ver todos

✅ *MARCAR CONCLUÍDO:*
Envie "feito" após completar uma tarefa

🔄 *PRECISA DE AJUDA?*
Envie "oi" para ver o tutorial completo`;
    
    await sendTextMessage(from, mensagemAjuda);
    return;
  }
  
  if (lowerText === 'lista' || lowerText === 'listar') {
    console.log('🎯 Comando: Listar lembretes');
    
    if (supabase) {
      try {
        // 1. Buscar usuário
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('phone_number', from)
          .single();
        
        if (user) {
          // 2. Buscar lembretes do usuário
          const { data: reminders } = await supabase
            .from('reminders')
            .select('id, task, scheduled_time, status')
            .eq('user_id', user.id)
            .order('scheduled_time', { ascending: true });
          
          if (reminders && reminders.length > 0) {
            let mensagemLista = `📋 *SEUS LEMBRETES* (${reminders.length})\n\n`;
            
            reminders.forEach((reminder, index) => {
              const data = new Date(reminder.scheduled_time);
              const hora = data.getHours().toString().padStart(2, '0');
              const minutos = data.getMinutes().toString().padStart(2, '0');
              const status = reminder.status === 'pending' ? '⏳' : '✅';
              
              mensagemLista += `${index + 1}. ${status} ${reminder.task} - ${hora}:${minutos}h\n`;
            });
            
            mensagemLista += `\n💡 Use "feito" para marcar como concluído`;
            await sendTextMessage(from, mensagemLista);
          } else {
            await sendTextMessage(from, '📭 *Nenhum lembrete encontrado!*\n\nCrie seu primeiro lembrete com:\n"minha tarefa as 18h"');
          }
        } else {
          await sendTextMessage(from, '📭 *Nenhum lembrete encontrado!*\n\nCrie seu primeiro lembrete com:\n"minha tarefa as 18h"');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar lembretes:', error);
        await sendTextMessage(from, '📋 *Seus lembretes*\n\n1. Pagar conta de luz - 18:00\n2. Reunião com equipe - 14:30\n3. Comprar leite - 09:00\n\n💡 *Em breve:* Lista atualizada do banco de dados!');
      }
    } else {
      await sendTextMessage(from, '📋 *Seus lembretes*\n\n1. Pagar conta de luz - 18:00\n2. Reunião com equipe - 14:30\n3. Comprar leite - 09:00\n\n💡 *Em breve:* Lista atualizada do banco de dados!');
    }
    return;
  }
  
  // CONFIRMAÇÕES
  const confirmacoes = ['feito', 'feita', 'fez', 'pronto', 'pronta', 'concluído', 'concluida', 'ok', 'certo', 'já fiz'];
  if (confirmacoes.includes(lowerText)) {
    console.log('🎯 Comando: Confirmação de tarefa');
    
    if (supabase) {
      try {
        // FUTURO: Implementar lógica para marcar último lembrete como feito
        await sendTextMessage(from, '✅ *Tarefa marcada como concluída!*\n\nBom trabalho! 🎉\n\n💡 Em breve: Sistema completo de conclusão!');
      } catch (error) {
        await sendTextMessage(from, '✅ Tarefa marcada como concluída! Bom trabalho!');
      }
    } else {
      await sendTextMessage(from, '✅ Tarefa marcada como concluída! Bom trabalho!');
    }
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
      
      // 🔥 SALVAR NO SUPABASE (SE CONFIGURADO)
      if (supabase) {
        try {
          // 1. Garantir que usuário existe
          const { data: user, error: userError } = await supabase
            .from('users')
            .upsert(
              { phone_number: from },
              { onConflict: 'phone_number' }
            )
            .select()
            .single();
          
          if (userError) throw userError;
          
          // 2. Criar data/hora do lembrete
          const scheduledTime = new Date();
          const [hours, minutes] = horaValida.split(':');
          scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          // Se hora já passou hoje, agenda para amanhã
          if (scheduledTime < new Date()) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
          }
          
          // 3. Salvar lembrete
          const { data: reminder, error: reminderError } = await supabase
            .from('reminders')
            .insert({
              user_id: user.id,
              task: tarefa,
              scheduled_time: scheduledTime.toISOString(),
              status: 'pending'
            })
            .select()
            .single();
          
          if (reminderError) throw reminderError;
          
          console.log('💾 Lembrete salvo no Supabase! ID:', reminder.id);
          
          // 4. Responder com confirmação detalhada
          const dataFormatada = scheduledTime.toLocaleDateString('pt-BR');
          const mensagemConfirmacao = `✅ *Lembrete criado com sucesso!*

📝 *Tarefa:* ${tarefa}
⏰ *Horário:* ${horaValida}h
📅 *Data:* ${dataFormatada}
🆔 *ID:* ${reminder.id}

💾 *Salvo no sistema!*
🤖 Eu vou te lembrar no horário combinado!`;
          
          await sendTextMessage(from, mensagemConfirmacao);
          
        } catch (error) {
          console.error('❌ Erro ao salvar no Supabase:', error);
          // Fallback: responder sem banco de dados
          await sendTextMessage(
            from, 
            `✅ *Lembrete criado com sucesso!*\n\n📝 *Tarefa:* ${tarefa}\n⏰ *Horário:* ${horaValida}h\n\n🤖 Eu vou te lembrar no horário combinado!\n\n⚠️ *Modo teste:* Lembrete não foi salvo permanentemente.`
          );
        }
      } else {
        // SUPABASE NÃO CONFIGURADO - MODO SIMPLES
        await sendTextMessage(
          from, 
          `✅ *Lembrete criado com sucesso!*\n\n📝 *Tarefa:* ${tarefa}\n⏰ *Horário:* ${horaValida}h\n\n🤖 Eu vou te lembrar no horário combinado!\n\n💡 *Próximo passo:* Configurar banco de dados para salvar permanentemente.`
        );
      }
    } else {
      console.log('❌ Hora inválida:', hora);
      await sendTextMessage(from, '❌ *Formato de hora inválido*\n\nPor favor, use um destes formatos:\n• "14:30"\n• "8h"\n• "18"\n• "9h30"\n\nExemplo: "minha tarefa as 14:30"');
    }
    
  } else {
    console.log('❌ Formato não reconhecido');
    await sendTextMessage(
      from,
      `🤖 *Formato não reconhecido*\n\nPara criar um lembrete, digite:\n"*[o que fazer]* as *[horário]*"\n\n✨ *Exemplos:*\n• "Tomar remédio as 20:00"\n• "Lembrar de pagar conta as 18h"\n• "Reunião com João as 14:30"\n\n💡 *Precisa de ajuda?* Envie "ajuda"`
    );
  }
}

// 🔘 PROCESSAR RESPOSTAS DE BOTÃO
async function processButtonResponse(from, buttonText) {
  console.log(`🔘 Processando resposta de botão: ${buttonText}`);
  // Redireciona para saudação inicial
  await processMessage(from, 'oi');
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

// 📤 FUNÇÃO PARA ENVIAR MENSAGENS VIA TEMPLATE (quando necessário)
async function sendWhatsAppMessage(to, templateName, languageCode = 'en_US') {
  console.log(`\n🚀 ENVIANDO MENSAGEM WHATSAPP (TEMPLATE)`);
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
      language: { code: languageCode }
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
      
      // Se template falhar, usa texto como fallback
      if (result.error.code === 132001) {
        console.log('🔄 Template não encontrado, usando texto como fallback...');
        const fallbackMessage = `🤖 Mensagem do Mind It Bot\n\nTemplate "${templateName}" não disponível.\n\nEnvie "oi" para começar.`;
        return await sendTextMessage(to, fallbackMessage);
      }
      
      return { success: false, error: result.error };
    }
    
    console.log('\n🎉 Template enviado com sucesso!');
    console.log('ID da mensagem:', result.messages?.[0]?.id);
    
    return { success: true, messageId: result.messages?.[0]?.id };
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return { success: false, error: error.message };
  }
}

// 📝 FUNÇÃO PARA ENVIAR MENSAGENS DE TEXTO SIMPLES (PRINCIPAL)
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
      
      return { success: false, error: result.error };
    }
    
    console.log('✅ Mensagem de texto enviada com sucesso!');
    return { success: true, messageId: result.messages?.[0]?.id };
    
  } catch (error) {
    console.error('❌ Erro na requisição (texto):', error.message);
    return { success: false, error: error.message };
  }
}
