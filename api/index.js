// api/index.js - Servidor COMPLETO do Mind It Bot

// ============================================
// 1. CONFIGURAÇÕES E IMPORTAÇÕES
// ============================================

const express = require('express');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const app = express();

// Middleware para parsear JSON e dados de formulário
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS para permitir requisições do Twilio
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ============================================
// 2. CONFIGURAÇÕES (USANDO VARIÁVEIS DE AMBIENTE)
// ============================================

const config = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    // MUDEI AQUI: Use o número do Twilio Sandbox
    phoneNumber: 'whatsapp:+14155238886'  // Número do Twilio Sandbox
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  }
};

// Verificar variáveis de ambiente
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Variável de ambiente ausente: ${envVar}`);
  }
}

// Inicializar clientes
const client = twilio(config.twilio.accountSid, config.twilio.authToken);
const supabase = createClient(config.supabase.url, config.supabase.key);

// ============================================
// 3. FUNÇÕES AUXILIARES
// ============================================

async function processMessage(telefone, mensagem) {
  mensagem = mensagem.toLowerCase().trim();
  
  if (mensagem === 'oi' || mensagem === 'olá' || mensagem === 'ola') {
    return `👋 Olá! Sou seu assistente de memória externa!\n\n📝 Para criar lembrete:\n/novo [tarefa] # [hora]\n\nExemplo:\n/novo Comprar leite # 19:00\n\n📋 Ver lembretes: /lista\n🆘 Ajuda: /ajuda`;
  }
  
  if (mensagem.startsWith('/novo')) {
    return await criarLembrete(telefone, mensagem);
  }
  
  if (mensagem === '/lista') {
    return await listarLembretes(telefone);
  }
  
  if (mensagem === '/ajuda') {
    return `ℹ️ COMANDOS DISPONÍVEIS:\n\n/novo [tarefa] # [hora] - Criar lembrete\n/lista - Ver todos lembretes\n/ajuda - Ver esta mensagem\n\nExemplos:\n/novo Ligar para mãe # 20:00\n/novo Pagar conta luz # 18:00`;
  }
  
  if (mensagem.includes('✅') || mensagem.includes('confirmar')) {
    return `✅ Lembrete confirmado! Bem lembrado! 😊`;
  }
  
  if (mensagem.includes('❌') || mensagem.includes('cancelar')) {
    return `❌ Lembrete cancelado.`;
  }
  
  return `Não entendi. Digite /ajuda para ver os comandos.`;
}

async function criarLembrete(telefone, mensagem) {
  try {
    const partes = mensagem.split('#');
    if (partes.length < 2) {
      return 'Formato incorreto! Use: /novo [tarefa] # [hora]\nEx: /novo Comprar leite # 19:00';
    }
    
    const texto = partes[0].replace('/novo', '').trim();
    const hora = partes[1].trim();
    
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
      return 'Hora inválida! Use formato HH:MM (ex: 19:00)';
    }
    
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
    
    const agora = new Date();
    const [horas, minutos] = hora.split(':');
    const proximaExecucao = new Date();
    
    proximaExecucao.setHours(parseInt(horas));
    proximaExecucao.setMinutes(parseInt(minutos));
    proximaExecucao.setSeconds(0);
    
    if (proximaExecucao < agora) {
      proximaExecucao.setDate(proximaExecucao.getDate() + 1);
    }
    
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

// ============================================
// 4. ROTAS PRINCIPAIS
// ============================================

// ============================================
// ROTAS PARA WEBHOOK DO TWILIO
// ============================================

// 1. Rota GET para verificação do Twilio (NOVO!)
app.get('/webhook', (req, res) => {
  console.log('✅ Twilio verificando webhook (GET)');
  
  // Verificar se veio do Twilio (opcional)
  if (req.query.validationToken) {
    console.log('Token de validação:', req.query.validationToken);
  }
  
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Webhook do Mind It Bot</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: #00b894; font-size: 24px; }
      </style>
    </head>
    <body>
      <div class="success">✅ Webhook configurado corretamente!</div>
      <p>Mind It WhatsApp Bot está pronto para receber mensagens.</p>
      <p><small>URL: https://mind-it-app.vercel.app/webhook</small></p>
      <p><a href="/">Voltar para página inicial</a></p>
    </body>
    </html>
  `);
});

// 2. Rota POST para receber mensagens
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

// 3. Rota para status do webhook
app.get('/webhook-status', (req, res) => {
  res.json({
    status: 'active',
    service: 'mind-it-whatsapp-bot',
    webhook_url: 'https://mind-it-app.vercel.app/webhook',
    methods_supported: ['GET', 'POST'],
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    checks: {
      twilio_account: !!process.env.TWILIO_ACCOUNT_SID,
      twilio_auth: !!process.env.TWILIO_AUTH_TOKEN,
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_key: !!process.env.SUPABASE_KEY
    }
  });
});

// ROTA RAIZ - PÁGINA DE STATUS
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🤖 Mind It Bot - ONLINE</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 20px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container { 
          background: white; 
          padding: 40px; 
          border-radius: 15px; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
          max-width: 600px; 
          width: 90%;
        }
        h1 { 
          color: #333; 
          margin-bottom: 10px;
        }
        .status { 
          background: #00b894; 
          color: white; 
          padding: 12px 30px; 
          border-radius: 50px; 
          display: inline-block; 
          font-weight: bold;
          font-size: 18px;
          margin: 20px 0;
          box-shadow: 0 4px 15px rgba(0, 184, 148, 0.4);
        }
        .endpoints { 
          text-align: left; 
          margin-top: 30px; 
          background: #f8f9fa; 
          padding: 25px; 
          border-radius: 10px;
          border-left: 5px solid #667eea;
        }
        .env-vars {
          text-align: left;
          margin-top: 20px;
          background: #fff3cd;
          padding: 15px;
          border-radius: 8px;
          border-left: 5px solid #ffc107;
        }
        .webhook-test {
          text-align: left;
          margin-top: 20px;
          background: #d1ecf1;
          padding: 15px;
          border-radius: 8px;
          border-left: 5px solid #0dcaf0;
        }
        code {
          background: #2d3436;
          color: #00b894;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        .check { color: #00b894; }
        .warning { color: #ff6b6b; }
        .btn {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          text-decoration: none;
          margin: 5px;
        }
        .btn:hover {
          background: #5a6fd8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Mind It WhatsApp Bot</h1>
        <p>Servidor backend está funcionando perfeitamente!</p>
        <div class="status">SISTEMA ONLINE ✅</div>
        
        <div class="env-vars">
          <h3>🔐 Variáveis de Ambiente:</h3>
          <ul>
            <li><span class="${process.env.TWILIO_ACCOUNT_SID ? 'check' : 'warning'}">●</span> TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Configurada' : 'FALTA'}</li>
            <li><span class="${process.env.TWILIO_AUTH_TOKEN ? 'check' : 'warning'}">●</span> TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Configurada' : 'FALTA'}</li>
            <li><span class="${process.env.SUPABASE_URL ? 'check' : 'warning'}">●</span> SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Configurada' : 'FALTA'}</li>
            <li><span class="${process.env.SUPABASE_KEY ? 'check' : 'warning'}">●</span> SUPABASE_KEY: ${process.env.SUPABASE_KEY ? 'Configurada' : 'FALTA'}</li>
          </ul>
        </div>
        
        <div class="webhook-test">
          <h3>🔗 Testar Webhook:</h3>
          <p>
            <a href="/webhook" class="btn" target="_blank">Testar GET /webhook</a>
            <a href="/webhook-status" class="btn" target="_blank">Status do Webhook</a>
            <a href="/health" class="btn" target="_blank">Saúde do Servidor</a>
          </p>
          <p><small>URL do webhook: <code>https://mind-it-app.vercel.app/webhook</code></small></p>
        </div>
        
        <div class="endpoints">
          <h3>📡 Endpoints Disponíveis:</h3>
          <ul>
            <li><strong>GET <code>/</code></strong> - Esta página de status</li>
            <li><strong>GET <code>/health</code></strong> - Status do servidor (JSON)</li>
            <li><strong>GET <code>/webhook</code></strong> - Verificação do Twilio</li>
            <li><strong>POST <code>/webhook</code></strong> - Receber mensagens WhatsApp</li>
            <li><strong>GET <code>/webhook-status</code></strong> - Status do webhook</li>
          </ul>
          
          <h3 style="margin-top: 25px;">🔗 Links Úteis:</h3>
          <ul>
            <li><a href="https://console.twilio.com" target="_blank">Painel do Twilio</a></li>
            <li><a href="https://supabase.com/dashboard" target="_blank">Painel do Supabase</a></li>
            <li><a href="https://github.com/BotAppNovo/Mind-It-App" target="_blank">Código no GitHub</a></li>
          </ul>
        </div>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          <strong>Tecnologias:</strong> Node.js • Express • Twilio • Supabase • Vercel
          <br>
          <span style="color: #999;">Última atualização: ${new Date().toLocaleString()}</span>
        </p>
      </div>
    </body>
    </html>
  `);
});

// Rota de saúde para monitoramento
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'mind-it-whatsapp-bot',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    env_vars: {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '✅ Configurada' : '❌ Ausente',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '✅ Configurada' : '❌ Ausente',
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Configurada' : '❌ Ausente',
      SUPABASE_KEY: process.env.SUPABASE_KEY ? '✅ Configurada' : '❌ Ausente'
    }
  });
});

// ============================================
// 5. AGENDADOR DE LEMBRETES (CRON JOB)
// ============================================

cron.schedule('* * * * *', async () => {
  console.log('🔔 Verificando lembretes...');
  
  try {
    const agora = new Date().toISOString();
    
    const { data: lembretes, error } = await supabase
      .from('lembretes')
      .select('*, usuarios(telefone)')
      .lte('proxima_execucao', agora)
      .eq('status', 'ativo')
      .lt('tentativas', 3);
    
    if (error) throw error;
    
    if (!lembretes || lembretes.length === 0) return;
    
    for (const lembrete of lembretes) {
      console.log(`📤 Enviando lembrete para ${lembrete.usuarios.telefone}`);
      
      await client.messages.create({
        from: config.twilio.phoneNumber,
        to: lembrete.usuarios.telefone,
        body: `🔔 LEMBRETE:\n\n${lembrete.texto}\n\nResponda com:\n✅ Confirmar\n⏰ Lembrar em 15 min\n❌ Cancelar`
      });
      
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

// ============================================
// 6. CONFIGURAÇÃO DO VERCEL
// ============================================

// IMPORTANTE: Não use app.listen() no Vercel!
// O Vercel fornece o host e port automaticamente
module.exports = app;

// Para testes locais (mantenha comentado):
/*
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
  console.log(`📱 Número do Twilio: ${config.twilio.phoneNumber}`);
});
*/
