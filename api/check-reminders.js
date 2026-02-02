// api/check-reminders.js
// DESPERTADOR DO BOT - Verifica e envia lembretes automaticamente

import { createClient } from '@supabase/supabase-js';

// Conectar ao Supabase (banco de dados)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações do WhatsApp
const WHATSAPP_TOKEN = process.env.META_ACCESS_TOKEN;
const WHATSAPP_PHONE_ID = process.env.META_PHONE_NUMBER_ID;

export default async function handler(req, res) {
  console.log('\n=== 🤖 BOT DESPERTADOR ACORDOU! ===');
  console.log('⏰ Hora:', new Date().toISOString());
  
  try {
    // 1. Que horas são AGORA?
    const agora = new Date();
    const agoraBrasil = new Date(agora.getTime() - 3 * 60 * 60 * 1000); // Ajuste para Brasil (UTC-3)
    
    console.log('🕐 Hora no Brasil:', agoraBrasil.getHours() + ':' + agoraBrasil.getMinutes());
    
    // 2. Calcular intervalo de tempo (1 minuto antes até 1 minuto depois)
    const umMinutoAtras = new Date(agoraBrasil.getTime() - 1 * 60 * 1000);
    const umMinutoFrente = new Date(agoraBrasil.getTime() + 1 * 60 * 1000);
    
    console.log('🔍 Procurando lembretes entre:');
    console.log('   De:', umMinutoAtras.toISOString());
    console.log('   Até:', umMinutoFrente.toISOString());
    
    // 3. BUSCAR NO BANCO: lembretes que são para AGORA
    const { data: lembretes, error } = await supabase
      .from('reminders')
      .select(`
        id,
        task,
        scheduled_time,
        user_id,
        users!inner (
          phone_number
        )
      `)
      .eq('status', 'pending')  // Apenas pendentes (não enviados)
      .gte('scheduled_time', umMinutoAtras.toISOString())  // Depois de 1 min atrás
      .lte('scheduled_time', umMinutoFrente.toISOString()) // Antes de 1 min à frente
      .order('scheduled_time', { ascending: true });
    
    if (error) {
      console.error('❌ ERRO no banco de dados:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar lembretes',
        details: error.message 
      });
    }
    
    console.log(`📊 Encontrei ${lembretes?.length || 0} lembretes para enviar agora`);
    
    // 4. SE não tem lembretes, só responde
    if (!lembretes || lembretes.length === 0) {
      console.log('✅ Nada para fazer agora. Volto a dormir! 😴');
      return res.status(200).json({
        success: true,
        message: 'Nenhum lembrete para enviar neste momento',
        timestamp: agora.toISOString()
      });
    }
    
    // 5. PARA CADA LEMBRETE encontrado, ENVIAR
    const resultados = [];
    
    for (const lembrete of lembretes) {
      console.log(`\n📤 PROCESSANDO LEMBRETE ${lembrete.id}:`);
      console.log(`   Tarefa: "${lembrete.task}"`);
      console.log(`   Para: ${lembrete.users.phone_number}`);
      console.log(`   Horário: ${lembrete.scheduled_time}`);
      
      try {
        // A. Formatar hora bonita
        const horaAgendada = new Date(lembrete.scheduled_time);
        const horaFormatada = horaAgendada.getHours().toString().padStart(2, '0') + 
                             ':' + 
                             horaAgendada.getMinutes().toString().padStart(2, '0');
        
        // B. Criar mensagem
        const mensagem = `🔔 *LEMBRETE DO MIND IT*\n\n` +
                        `📝 *Tarefa:* ${lembrete.task}\n` +
                        `⏰ *Horário:* ${horaFormatada}h\n\n` +
                        `✅ Já fez? Responda "sim" ou "não"`;
        
        // C. Enviar WhatsApp
        console.log(`   Enviando mensagem...`);
        const envioResultado = await enviarWhatsApp(lembrete.users.phone_number, mensagem);
        
        if (envioResultado.success) {
          console.log(`   ✅ WhatsApp enviado com sucesso!`);
          
          // D. ATUALIZAR BANCO: marcar como ENVIADO
          const { error: updateError } = await supabase
            .from('reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', lembrete.id);
          
          if (updateError) {
            console.error(`   ⚠️ Enviado, mas erro ao atualizar banco:`, updateError);
          } else {
            console.log(`   ✅ Banco atualizado: status -> sent`);
          }
          
          resultados.push({
            id: lembrete.id,
            success: true,
            message: 'Enviado com sucesso',
            phone: lembrete.users.phone_number
          });
          
        } else {
          console.error(`   ❌ Falha no WhatsApp:`, envioResultado.error);
          resultados.push({
            id: lembrete.id,
            success: false,
            error: `WhatsApp: ${envioResultado.error}`,
            phone: lembrete.users.phone_number
          });
        }
        
      } catch (erroLembrete) {
        console.error(`   💥 ERRO no lembrete ${lembrete.id}:`, erroLembrete.message);
        resultados.push({
          id: lembrete.id,
          success: false,
          error: `Exceção: ${erroLembrete.message}`
        });
      }
    }
    
    // 6. RESPOSTA FINAL
    const sucessos = resultados.filter(r => r.success).length;
    const falhas = resultados.filter(r => !r.success).length;
    
    console.log(`\n📈 RESUMO:`);
    console.log(`   ✅ Sucessos: ${sucessos}`);
    console.log(`   ❌ Falhas: ${falhas}`);
    console.log(`   🎯 Total: ${lembretes.length}`);
    
    return res.status(200).json({
      success: true,
      message: `Despertador executado! ${sucessos} lembretes enviados, ${falhas} falhas.`,
      timestamp: agora.toISOString(),
      total: lembretes.length,
      sent: sucessos,
      failed: falhas,
      details: resultados
    });
    
  } catch (error) {
    console.error('💥 ERRO GRAVE no despertador:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no despertador',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// FUNÇÃO PARA ENVIAR WHATSAPP (igual ao webhook)
async function enviarWhatsApp(numeroTelefone, texto) {
  console.log(`   📱 Preparando WhatsApp para ${numeroTelefone}...`);
  
  // Verificar se tem configurações
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.error('   ❌ Token ou Phone ID não configurados!');
    return { success: false, error: 'Configurações WhatsApp faltando' };
  }
  
  // Criar URL da API do WhatsApp
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`;
  
  // Criar mensagem
  const mensagem = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: numeroTelefone,
    type: 'text',
    text: {
      preview_url: false,
      body: texto
    }
  };
  
  try {
    // Enviar para WhatsApp
    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mensagem)
    });
    
    const resultado = await resposta.json();
    
    // Verificar se deu erro
    if (resultado.error) {
      console.error(`   ❌ WhatsApp API error:`, resultado.error.message);
      return { 
        success: false, 
        error: resultado.error.message,
        code: resultado.error.code
      };
    }
    
    // Sucesso!
    console.log(`   ✅ WhatsApp enviado! ID: ${resultado.messages?.[0]?.id || 'desconhecido'}`);
    return { 
      success: true, 
      messageId: resultado.messages?.[0]?.id 
    };
    
  } catch (error) {
    console.error(`   ❌ Erro de conexão WhatsApp:`, error.message);
    return { 
      success: false, 
      error: `Conexão: ${error.message}` 
    };
  }
}
