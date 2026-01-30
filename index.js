// CONFIGURAÇÕES - VOCÊ VAI ALTERAR DEPOIS!
const config = {
  twilio: {
    accountSid: 'COLE_AQUI_SEU_ACCOUNT_SID',
    authToken: 'COLE_AQUI_SEU_AUTH_TOKEN',
    phoneNumber: 'whatsapp:+558185980592' // SEU NÚMERO!
  },
  supabase: {
    url: 'COLE_AQUI_SUA_URL_SUPABASE',
    key: 'COLE_AQUI_SUA_CHAVE_SUPABASE'
  }
};

// ============================================
// NÃO ALTERE NADA ABAIXO SE NÃO SOUBER O QUE FAZ
// ============================================

const express = require('express');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

const app = express();
const client = twilio(config.twilio.accountSid, config.twilio.authToken);
const supabase = createClient(config.supabase.url, config.supabase.key);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROTA QUE RECEBE MENSAGENS DO WHATSAPP
app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.Body;
    const from = req.body.From;
    
    console.log(`📱 Mensagem de ${from}: ${message}`);
    
    // Processar mensagem
    const response = await processMessage(from, message);
    
    // Enviar resposta
    await client.messages.create({
      from: config.twilio.phoneNumber,
      to: from,
      body: response
    });
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).send('Error');
  }
});

// FUNÇÃO QUE PROCESSA MENSAGENS
async function processMessage(telefone, mensagem) {
  mensagem = mensagem.toLowerCase().trim();
  
  // SE FOR "OI", "OLÁ", "OLA"
  if (mensagem === 'oi' || mensagem === 'olá' || mensagem === 'ola') {
    return `👋 Olá! Sou seu assistente de memória externa!\n\n📝 Para criar lembrete:\n/novo [tarefa] # [hora]\n\nExemplo:\n/novo Comprar leite # 19:00\n\n📋 Ver lembretes: /lista\n🆘 Ajuda: /ajuda`;
  }
  
  // SE FOR /NOVO
  if (mensagem.startsWith('/novo')) {
    return await criarLembrete(telefone, mensagem);
  }
  
  // SE FOR /LISTA
  if (mensagem === '/lista') {
    return await listarLembretes(telefone);
  }
  
  // SE FOR /AJUDA
  if (mensagem === '/ajuda') {
    return `ℹ️ COMANDOS DISPONÍVEIS:\n\n/novo [tarefa] # [hora] - Criar lembrete\n/lista - Ver todos lembretes\n/ajuda - Ver esta mensagem\n\nExemplos:\n/novo Ligar para mãe # 20:00\n/novo Pagar conta luz # 18:00`;
  }
  
  // SE FOR CONFIRMAÇÃO
  if (mensagem.includes('✅') || mensagem.includes('confirmar')) {
    return `✅ Lembrete confirmado! Bem lembrado! 😊`;
  }
  
  // SE FOR CANCELAR
  if (mensagem.includes('❌') || mensagem.includes('cancelar')) {
    return `❌ Lembrete cancelado.`;
  }
  
  // MENSAGEM NÃO RECONHECIDA
  return `Não entendi. Digite /ajuda para ver os comandos.`;
}

// FUNÇÃO CRIAR LEMBRETE
async function criarLembrete(telefone, mensagem) {
  try {
    // Extrair dados: /novo Comprar leite # 19:00
    const partes = mensagem.split('#');
    if (partes.length < 2) {
      return 'Formato incorreto! Use: /novo [tarefa] # [hora]\nEx: /novo Comprar leite # 19:00';
    }
    
    const texto = partes[0].replace('/novo', '').trim();
    const hora = partes[1].trim();
    
    // Validar hora (HH:MM)
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
      return 'Hora inválida! Use formato HH:MM (ex: 19:00)';
    }
    
    // Salvar usuário
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .upsert({ 
        telefone: telefone,
        data_cadastro: new Date().toISOString()
      }, {
        onConflict: 'telefone'
      })
      .select()
      .single();
    
    if (userError) throw userError;
    
    // Calcular próxima execução
    const agora = new Date();
    const [horas, minutos] = hora.split(':');
    const proximaExecucao = new Date();
    
    proximaExecucao.setHours(parseInt(horas));
    proximaExecucao.setMinutes(parseInt(minutos));
    proximaExecucao.setSeconds(0);
    
    // Se já passou da hora hoje, agenda para amanhã
    if (proximaExecucao < agora) {
      proximaExecucao.setDate(proximaExecucao.getDate() + 1);
    }
    
    // Salvar lembrete
    const { error: lembreteError } = await supabase
      .from('lembretes')
      .insert({
        usuario_id: usuario.id,
        texto: texto,
        hora: hora + ':00',
        repeticao: 'diario',
        proxima_execucao: proximaExecucao.toISOString(),
        status: 'ativo',
        data_criacao: new Date().toISOString()
      });
    
    if (lembreteError) throw lembreteError;
    
    return `✅ Lembrete criado!\n\n"${texto}"\n🕐 Todo dia às ${hora}\n\nVou te lembrar pontualmente!`;
  } catch (error) {
    console.error('❌ Erro ao criar lembrete:', error);
    return '❌ Erro ao criar lembrete. Tente novamente.';
  }
}

// FUNÇÃO LISTAR LEMBRETES
async function listarLembretes(telefone) {
  try {
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('telefone', telefone)
      .single();
    
    if (userError) throw userError;
    
    const { data: lembretes, error: lembreteError } = await supabase
      .from('lembretes')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('status', 'ativo')
      .order('hora', { ascending: true });
    
    if (lembreteError) throw lembreteError;
    
    if (!lembretes || lembretes.length === 0) {
      return '📭 Você não tem lembretes ativos.\nCrie um com /novo [tarefa] # [hora]';
    }
    
    let resposta = `📋 SEUS LEMBRETES (${lembretes.length}):\n\n`;
    
    lembretes.forEach((lembrete, index) => {
      const horaFormatada = lembrete.hora.substring(0, 5);
      resposta += `${index + 1}. ${lembrete.texto}\n   ⏰ ${horaFormatada} • ${lembrete.repeticao}\n\n`;
    });
    
    resposta += 'Para criar novo: /novo [tarefa] # [hora]';
    
    return resposta;
  } catch (error) {
    console.error('❌ Erro ao listar lembretes:', error);
    return '❌ Erro ao buscar lembretes.';
  }
}

// AGENDADOR DE LEMBRETES (roda a cada minuto)
cron.schedule('* * * * *', async () => {
  console.log('🔔 Verificando lembretes...');
  
  try {
    const agora = new Date().toISOString();
    
    // Buscar lembretes devidos
    const { data: lembretes, error } = await supabase
      .from('lembretes')
      .select('*, usuarios(telefone)')
      .lte('proxima_execucao', agora)
      .eq('status', 'ativo')
      .lt('tentativas', 3); // Máximo 3 tentativas
    
    if (error) throw error;
    
    if (!lembretes || lembretes.length === 0) return;
    
    for (const lembrete of lembretes) {
      console.log(`📤 Enviando lembrete para ${lembrete.usuarios.telefone}`);
      
      // Enviar mensagem
      await client.messages.create({
        from: config.twilio.phoneNumber,
        to: lembrete.usuarios.telefone,
        body: `🔔 LEMBRETE:\n\n${lembrete.texto}\n\nResponda com:\n✅ Confirmar\n⏰ Lembrar em 15 min\n❌ Cancelar`
      });
      
      // Atualizar próxima execução
      let novaData = new Date(lembrete.proxima_execucao);
      
      if (lembrete.repeticao === 'diario') {
        novaData.setDate(novaData.getDate() + 1);
      }
      
      await supabase
        .from('lembretes')
        .update({
          proxima_execucao: novaData.toISOString(),
          tentativas: lembrete.tentativas + 1
        })
        .eq('id', lembrete.id);
    }
  } catch (error) {
    console.error('❌ Erro no agendador:', error);
  }
});

// ROTA DE TESTE
app.get('/', (req, res) => {
  res.send('🤖 Bot de lembretes está online!');
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
  console.log(`🌐 Webhook: https://seu-site.vercel.app/webhook`);
  console.log(`🔧 Número configurado: ${config.twilio.phoneNumber}`);
});
