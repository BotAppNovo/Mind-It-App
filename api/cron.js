// api/cron.js - Agendador do Mind It Bot
// Este arquivo verifica e envia lembretes vencidos

import { createClient } from '@supabase/supabase-js'

// 1. CONFIGURA SUPABASE (usando mesmas variáveis do webhook)
console.log('🔧 Inicializando agendador...');

// Verifica se variáveis existem
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const accessToken = process.env.META_ACCESS_TOKEN;
const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

if (!supabaseUrl || !supabaseKey || !accessToken || !phoneNumberId) {
  console.error('❌ VARIÁVEIS FALTANDO! Verifique no Vercel:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_KEY:', supabaseKey ? '✅' : '❌');
  console.error('   META_ACCESS_TOKEN:', accessToken ? '✅' : '❌');
  console.error('   META_PHONE_NUMBER_ID:', phoneNumberId ? '✅' : '❌');
}

// Cria conexão com Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. FUNÇÃO PRINCIPAL QUE O VERCEl EXECUTA
export default async function handler(req, res) {
  console.log('\n=== ⏰ AGENDADOR MIND IT BOT INICIADO ===', new Date().toISOString());
  
  // 2.1 SEGURANÇA: Só roda com senha secreta
  // Configure no Vercel: CRON_SECRET = MindItCron2024
  const secretNecessario = process.env.CRON_SECRET || 'MindItCron2024';
  
  if (req.query.secret !== secretNecessario) {
    console.log('❌ ACESSO NEGADO! Secret incorreto.');
    console.log('   Secret recebido:', req.query.secret);
    console.log('   Secret esperado:', secretNecessario);
    console.log('   💡 Acesse com: /api/cron?secret=' + secretNecessario);
    return res.status(401).json({ 
      error: 'Não autorizado',
      dica: 'Adicione ?secret=SUA_SENHA na URL'
    });
  }
  
  console.log('✅ Acesso autorizado! Iniciando processamento...');
  
  try {
    // 2.2 PEGAR HORA ATUAL
    const agora = new Date();
    const agoraISO = agora.toISOString();
    const agoraFormatada = agora.toLocaleString('pt-BR');
    
    console.log('🕐 Hora atual:', agoraFormatada);
    console.log('🔍 Buscando lembretes vencidos...');
    
    // 2.3 BUSCAR LEMBRETES QUE JÁ DEVEM TER SIDO ENVIADOS
    // status = 'pending' (pendente)
    // scheduled_time <= agora (hora já passou)
    const { data: lembretes, error } = await supabase
      .from('reminders')
      .select(`
        id,
        task,
        scheduled_time,
        status,
        users!inner(phone_number)
      `)
      .eq('status', 'pending')  // Apenas pendentes
      .lte('scheduled_time', agoraISO);  // scheduled_time <= agora
    
    if (error) {
      console.error('❌ ERRO no Supabase:', error);
      return res.status(500).json({ 
        error: 'Erro no banco de dados',
        detalhes: error.message 
      });
    }
    
    console.log(`📊 Encontrados: ${lembretes.length} lembrete(s) para enviar`);
    
    // Se não tiver lembretes, responde rápido
    if (lembretes.length === 0) {
      console.log('✅ Nenhum lembrete para enviar no momento.');
      return res.status(200).json({
        success: true,
        message: 'Nenhum lembrete para enviar',
        time: agoraISO,
        total: 0
      });
    }
    
    // 2.4 PROCESSAR CADA LEMBRETE
    const resultados = [];
    
    for (const lembrete of lembretes) {
      console.log(`\n📦 PROCESSANDO LEMBRETE #${lembrete.id}:`);
      console.log(`   Tarefa: "${lembrete.task}"`);
      console.log(`   Agendado para: ${new Date(lembrete.scheduled_time).toLocaleString('pt-BR')}`);
      console.log(`   Usuário: ${lembrete.users.phone_number}`);
      
      // Formatar hora bonita
      const horaAgendada = new Date(lembrete.scheduled_time);
      const horaFormatada = horaAgendada.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Criar mensagem personalizada
      const mensagem = `🔔 *Lembrete do Mind It Bot!*\n\n` +
                      `✅ *Hora de:* ${lembrete.task}\n` +
                      `⏰ *Agendado para:* ${horaFormatada}h\n\n` +
                      `💡 *Comandos disponíveis:*\n` +
                      `• "feito" - Marcar como concluído\n` +
                      `• "lista" - Ver seus lembretes`;
      
      console.log(`   💬 Mensagem: "${mensagem.substring(0, 50)}..."`);
      
      // 2.5 ENVIAR MENSAGEM NO WHATSAPP
      console.log(`   📤 Enviando WhatsApp...`);
      const resultadoEnvio = await enviarWhatsApp(
        lembrete.users.phone_number,
        mensagem
      );
      
      if (resultadoEnvio.success) {
        console.log(`   ✅ WhatsApp enviado! ID: ${resultadoEnvio.messageId}`);
        
        // 2.6 ATUALIZAR STATUS NO BANCO DE 'pending' PARA 'sent'
        const { error: updateError } = await supabase
          .from('reminders')
          .update({ 
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', lembrete.id);
        
        if (updateError) {
          console.error(`   ⚠️ Erro ao atualizar status:`, updateError);
        } else {
          console.log(`   💾 Status atualizado para 'sent'`);
        }
        
        resultados.push({
          id: lembrete.id,
          status: 'enviado',
          messageId: resultadoEnvio.messageId,
          telefone: lembrete.users.phone_number
        });
        
      } else {
        console.error(`   ❌ FALHA no WhatsApp:`, resultadoEnvio.error);
        resultados.push({
          id: lembrete.id,
          status: 'falha',
          error: resultadoEnvio.error,
          telefone: lembrete.users.phone_number
        });
      }
    }
    
    // 2.7 GERAR RELATÓRIO FINAL
    const enviados = resultados.filter(r => r.status === 'enviado').length;
    const falhas = resultados.filter(r => r.status === 'falha').length;
    
    console.log('\n📈 ========== RELATÓRIO FINAL ==========');
    console.log(`   ✅ Enviados com sucesso: ${enviados}`);
    console.log(`   ❌ Falhas: ${falhas}`);
    console.log(`   🕐 Tempo total: ${new Date().toLocaleString('pt-BR')}`);
    console.log('=======================================\n');
    
    // 2.8 RESPONDER COM JSON DETALHADO
    return res.status(200).json({
      success: true,
      time: agoraISO,
      time_human: agoraFormatada,
      summary: {
        total_lembretes: lembretes.length,
        enviados: enviados,
        falhas: falhas
      },
      detalhes: resultados,
      raw_data: lembretes.map(l => ({
        id: l.id,
        task: l.task,
        scheduled_time: l.scheduled_time,
        phone: l.users.phone_number
      }))
    });
    
  } catch (error) {
    // 2.9 TRATAR ERROS GERAIS
    console.error('💥 ERRO GRAVE no agendador:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
      detalhes: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// 3. FUNÇÃO AUXILIAR: ENVIAR MENSAGEM NO WHATSAPP
async function enviarWhatsApp(to, text) {
  console.log(`   🔧 Preparando envio para ${to}...`);
  
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  
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
      console.log(`   ❌ Erro da API WhatsApp:`, result.error.message);
      return { 
        success: false, 
        error: result.error,
        code: result.error.code
      };
    }
    
    console.log(`   ✅ Resposta da API:`, result.messages?.[0]?.id ? 'Sucesso!' : 'Sem ID');
    return { 
      success: true, 
      messageId: result.messages?.[0]?.id 
    };
    
  } catch (error) {
    console.log(`   💥 Erro de rede:`, error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}
