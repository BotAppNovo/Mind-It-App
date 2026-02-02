// api/check-reminders.js
// DESPERTADOR DO BOT - Verifica lembretes a cada minuto

import { createClient } from '@supabase/supabase-js';

// Conectar ao Supabase (sua AGENDA)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  console.log('🔔 DESPERTADOR ACORDOU!', new Date().toISOString());
  
  try {
    // 1. Que horas são?
    const agora = new Date();
    console.log('⏰ Agora são:', agora.getHours() + ':' + agora.getMinutes());
    
    // 2. Olhar na AGENDA: que lembretes são para AGORA?
    const { data: lembretes, error } = await supabase
      .from('reminders')
      .select(`
        id,
        task,
        scheduled_time,
        user_id,
        users!inner (phone_number)
      `)
      .eq('status', 'pending')  // Apenas pendentes
      .lte('scheduled_time', new Date(agora.getTime() + 60000).toISOString())  // Até 1 minuto no futuro
      .gte('scheduled_time', new Date(agora.getTime() - 60000).toISOString()); // Até 1 minuto no passado
    
    if (error) {
      console.error('❌ Erro ao ler agenda:', error);
      return res.status(500).json({ error: 'Erro na agenda' });
    }
    
    console.log(`📊 Encontrei ${lembretes?.length || 0} lembretes para agora`);
    
    // 3. Para CADA lembrete encontrado, ENVIAR WhatsApp
    for (const lembrete of lembretes || []) {
      console.log(`📤 Enviando: "${lembrete.task}" para ${lembrete.users.phone_number}`);
      
      // Enviar mensagem
      await enviarWhatsApp(
        lembrete.users.phone_number,
        `🔔 *LEMBRETE*\n\n${lembrete.task}\n\n✅ Já fez? Digite "sim" ou "não"`
      );
      
      // Marcar como ENVIADO na agenda
      await supabase
        .from('reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', lembrete.id);
      
      console.log(`✅ Enviado e marcado na agenda!`);
    }
    
    // 4. Responder que terminou
    return res.json({
      success: true,
      message: `Despertador funcionou! Enviou ${lembretes?.length || 0} lembretes.`,
      hora: agora.toISOString()
    });
    
  } catch (error) {
    console.error('❌ Despertador quebrou:', error);
    return res.status(500).json({ error: 'Despertador quebrado' });
  }
}

// FUNÇÃO PARA ENVIAR WHATSAPP (igual já temos)
async function enviarWhatsApp(numero, texto) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID;
  
  const resposta = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: numero,
      type: 'text',
      text: { body: texto }
    })
  });
  
  return await resposta.json();
}
