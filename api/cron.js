// api/cron.js - AGENDADOR SIMPLIFICADO E SEGURO
// Mind It Bot - Envia lembretes agendados

console.log('📦 Cron.js carregado - versão simplificada');

// Função principal que o Vercel executa
export default async function handler(req, res) {
  console.log('\n=== ⏰ AGENDADOR MIND IT BOT (SIMPLES) ===', new Date().toISOString());
  
  // 1. SEGURANÇA BÁSICA
  const secretEsperado = process.env.CRON_SECRET || 'MindItCron2024';
  
  if (req.query.secret !== secretEsperado) {
    console.log('❌ Acesso negado! Use: /api/cron?secret=' + secretEsperado);
    return res.status(401).json({ 
      error: 'Não autorizado',
      dica: 'Adicione ?secret=' + secretEsperado + ' na URL'
    });
  }
  
  console.log('✅ Acesso autorizado!');
  
  try {
    // 2. CONFIGURAÇÕES BÁSICAS
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase não configurado!');
      return res.status(500).json({ error: 'Supabase não configurado' });
    }
    
    // Importa Supabase DINAMICAMENTE (evita erro no carregamento)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 3. BUSCAR LEMBRETES VENCIDOS
    const agora = new Date().toISOString();
    console.log('🕐 Buscando lembretes até:', new Date().toLocaleString('pt-BR'));
    
    const { data: lembretes, error } = await supabase
      .from('reminders')
      .select(`
        id,
        task,
        scheduled_time,
        users!inner(phone_number)
      `)
      .eq('status', 'pending')
      .lte('scheduled_time', agora);
    
    if (error) {
      console.error('❌ Erro no Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`📊 Encontrados: ${lembretes.length} lembrete(s)`);
    
    // 4. SE NÃO HOUVER LEMBRETES, RESPONDE RÁPIDO
    if (lembretes.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum lembrete para enviar',
        time: agora,
        total: 0
      });
    }
    
    // 5. APENAS LOG (NÃO ENVIA WHATSAPP AINDA)
    // Por segurança, só mostra no log primeiro
    console.log('\n📋 LEMBRETES ENCONTRADOS:');
    lembretes.forEach(lembrete => {
      console.log(`   ID ${lembrete.id}: "${lembrete.task}" para ${lembrete.users.phone_number}`);
    });
    
    console.log('\n⚠️  MODO SIMULAÇÃO: Lembretes apenas listados, não enviados.');
    console.log('   Para enviar de verdade, precisamos configurar envio de WhatsApp.');
    
    // 6. RESPONDER COM LISTA
    return res.status(200).json({
      success: true,
      mode: 'simulação',
      message: 'Lembretes encontrados (apenas simulação)',
      time: agora,
      total: lembretes.length,
      lembretes: lembretes.map(l => ({
        id: l.id,
        task: l.task,
        phone: l.users.phone_number,
        scheduled_time: l.scheduled_time
      }))
    });
    
  } catch (error) {
    console.error('💥 ERRO no agendador:', error);
    return res.status(500).json({ 
      error: 'Erro interno',
      message: error.message 
    });
  }
}
