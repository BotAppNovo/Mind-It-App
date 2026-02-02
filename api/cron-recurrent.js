// api/cron-recurrent.js - CRON PARA LEMBRETES RECORRENTES
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função de envio (mesma do webhook)
async function sendTextMessage(to, text) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Configurações WhatsApp faltando');
    return { success: false, error: 'Configurações não encontradas' };
  }
  
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: { preview_url: false, body: text }
  };
  
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
    
    if (result.error) {
      console.error('❌ Erro WhatsApp:', result.error.message);
      return { success: false, error: result.error.message };
    }
    
    return { success: true, messageId: result.messages?.[0]?.id };
    
  } catch (error) {
    console.error('❌ Erro conexão:', error.message);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  console.log('\n🔁 === CRON RECORRENTE INICIADO ===', new Date().toISOString());
  
  try {
    // 1. Configurar horário com margem de 2 minutos
    const agora = new Date();
    const inicio = new Date(agora.getTime() - 2 * 60000); // 2 minutos atrás
    const fim = new Date(agora.getTime() + 2 * 60000);    // 2 minutos à frente
    
    console.log('⏰ Agora:', agora.toISOString());
    console.log('🔍 Procurando entre:', inicio.toISOString(), 'e', fim.toISOString());
    
    // 2. Buscar lembretes para AGORA
    const { data: lembretes, error } = await supabase
      .from('reminders')
      .select(`
        id,
        task,
        scheduled_time,
        recurrence_count,
        parent_id,
        confirmed,
        user_id,
        users!inner (phone_number)
      `)
      .eq('status', 'pending')
      .eq('confirmed', false)
      .gte('scheduled_time', inicio.toISOString())
      .lte('scheduled_time', fim.toISOString())
      .order('scheduled_time', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar lembretes:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro no banco de dados',
        details: error.message 
      });
    }
    
    console.log(`📊 ${lembretes?.length || 0} lembretes encontrados para processar`);
    
    const resultados = [];
    
    // 3. Processar cada lembrete
    for (const lembrete of lembretes || []) {
      console.log(`\n📤 Processando lembrete ${lembrete.id}: "${lembrete.task}"`);
      
      // Verificar se já foi confirmado via parent_id
      if (lembrete.parent_id) {
        const { data: parent } = await supabase
          .from('reminders')
          .select('confirmed')
          .eq('id', lembrete.parent_id)
          .single();
        
        if (parent?.confirmed) {
          console.log(`⏭️ Pulei ${lembrete.id}: tarefa principal já confirmada`);
          
          // Marcar como cancelado
          await supabase
            .from('reminders')
            .update({ 
              status: 'cancelled',
              confirmed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', lembrete.id);
          
          resultados.push({
            id: lembrete.id,
            status: 'skipped',
            reason: 'Tarefa principal já confirmada'
          });
          
          continue;
        }
      }
      
      // Determinar tipo de mensagem baseado no recurrence_count
      let prefixo = '';
      let urgencia = '';
      
      if (lembrete.recurrence_count === 0) {
        prefixo = '🔔 *LEMBRETE:*';
      } else if (lembrete.recurrence_count === 1) {
        prefixo = '🔔 *LEMBRETE (30min depois):*';
        urgencia = '\n⚠️ *Esta é a segunda notificação*';
      } else if (lembrete.recurrence_count >= 2) {
        prefixo = '🔔 *LEMBRETE URGENTE (1h depois):*';
        urgencia = '\n🚨 *Esta é a última notificação!*';
      } else {
        prefixo = '🔔 *LEMBRETE:*';
      }
      
      // Formatar hora
      const horaAgendada = new Date(lembrete.scheduled_time);
      const horaFormatada = `${horaAgendada.getHours().toString().padStart(2, '0')}:${horaAgendada.getMinutes().toString().padStart(2, '0')}`;
      
      // Criar mensagem
      const mensagem = `${prefixo}\n\n📝 ${lembrete.task}${urgencia}\n\n` +
                      `⏰ Horário: ${horaFormatada}h\n\n` +
                      `✅ *Comandos:*\n` +
                      `• "feito" - Marcar como concluído\n` +
                      `• "feito ${lembrete.id}" - Confirmar este específico\n` +
                      `• "cancelar ${lembrete.parent_id || lembrete.id}" - Parar todos lembretes`;
      
      // Tentar enviar
      console.log(`📱 Enviando para ${lembrete.users.phone_number}...`);
      const resultado = await sendTextMessage(lembrete.users.phone_number, mensagem);
      
      if (resultado.success) {
        // Sucesso! Marcar como enviado
        await supabase
          .from('reminders')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', lembrete.id);
        
        console.log(`✅ Enviado para ${lembrete.users.phone_number}`);
        resultados.push({
          id: lembrete.id,
          status: 'sent',
          recurrence: lembrete.recurrence_count,
          phone: lembrete.users.phone_number
        });
        
      } else {
        // Falha no envio
        console.error(`❌ Falha no envio:`, resultado.error);
        
        // Se erro de permissão (#10), usuário não está ativo
        if (resultado.error.includes('permission') || resultado.error.includes('#10')) {
          // Marcar para tentar mais tarde (5 minutos)
          const novaTentativa = new Date(agora.getTime() + 5 * 60000);
          await supabase
            .from('reminders')
            .update({ 
              scheduled_time: novaTentativa.toISOString(),
              recurrence_count: lembrete.recurrence_count + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', lembrete.id);
          
          resultados.push({
            id: lembrete.id,
            status: 'retry_later',
            error: 'Usuário não ativo, tentando em 5 minutos',
            phone: lembrete.users.phone_number
          });
        } else {
          resultados.push({
            id: lembrete.id,
            status: 'failed',
            error: resultado.error,
            phone: lembrete.users.phone_number
          });
        }
      }
    }
    
    // 4. Limpar lembretes muito antigos não confirmados
    const umaHoraAtras = new Date(agora.getTime() - 60 * 60000);
    const { count: expirados } = await supabase
      .from('reminders')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'pending')
      .eq('confirmed', false)
      .lt('scheduled_time', umaHoraAtras.toISOString());
    
    if (expirados > 0) {
      console.log(`🗑️  ${expirados} lembretes expirados limpos`);
    }
    
    // 5. Resposta final
    const sucessos = resultados.filter(r => r.status === 'sent').length;
    const falhas = resultados.filter(r => r.status === 'failed').length;
    const retry = resultados.filter(r => r.status === 'retry_later').length;
    
    console.log(`\n📈 RESUMO DO CRON:`);
    console.log(`   ✅ Sucessos: ${sucessos}`);
    console.log(`   🔄 Retry later: ${retry}`);
    console.log(`   ❌ Falhas: ${falhas}`);
    console.log(`   🎯 Total processado: ${resultados.length}`);
    
    return res.status(200).json({
      success: true,
      message: `Cron executado! ${sucessos} enviados, ${retry} para retry, ${falhas} falhas.`,
      timestamp: agora.toISOString(),
      total: resultados.length,
      sent: sucessos,
      retry_later: retry,
      failed: falhas,
      details: resultados,
      expired_cleaned: expirados || 0
    });
    
  } catch (error) {
    console.error('💥 ERRO GRAVE no cron:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no cron',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
