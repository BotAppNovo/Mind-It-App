// api/webhook.js - VERSÃO CORRIGIDA PARA VALIDAÇÃO COM TEMPLATES
export default async function handler(req, res) {
  console.log('=== 🤖 MIND IT BOT - TEMPLATE MODE ===', new Date().toISOString());
  console.log('📡 Método:', req.method);

  // 🔐 VERIFICAÇÃO DO WEBHOOK (META)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    const TOKEN_CORRETO = 'MindItBot2024';
    
    if (mode === 'subscribe' && token === TOKEN_CORRETO) {
      console.log('✅ Webhook validado!');
      return res.status(200).send(challenge);
    }
    
    // Status para acesso direto
    return res.status(200).json({
      status: 'online',
      app: 'Mind It Bot',
      mode: 'template_validation',
      stage: 'awaiting_template_approval',
      test_format: '[tarefa] as [hora]',
      example: 'comprar leite as 18'
    });
  }
  
  // 📩 MENSAGEM RECEBIDA DO WHATSAPP
  if (req.method === 'POST') {
    console.log('📩 Mensagem WhatsApp recebida!');
    
    // Resposta RÁPIDA para Meta (dentro de 20s)
    res.status(200).send('EVENT_RECEIVED');
    
    try {
      const body = req.body;
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const phoneNumberId = value?.metadata?.phone_number_id;
      
      if (message) {
        const userNumber = message.from;
        const userText = (message.text?.body || '').toLowerCase().trim();
        const messageId = message.id;
        
        console.log('👤 Usuário:', userNumber);
        console.log('💬 Mensagem:', userText);
        console.log('🆔 ID:', messageId);
        
        // PROCESSAR MENSAGEM
        await processarMensagem(userNumber, userText, phoneNumberId);
        
      } else {
        console.log('⚠️ Mensagem sem texto ou formato diferente');
      }
      
    } catch (error) {
      console.log('❌ Erro ao processar:', error.message);
    }
    
    return;
  }
  
  // Outros métodos
  res.status(405).json({ error: 'Method not allowed' });
}

// 🧠 PROCESSADOR PRINCIPAL DE MENSAGENS
async function processarMensagem(userNumber, userText, phoneNumberId) {
  console.log('⚙️ Processando:', userText);
  
  // 1. SAUDAÇÃO (oi, olá, ola, 0i)
  if (['oi', 'olá', 'ola', '0i', 'oi!', 'ola!'].includes(userText)) {
    console.log('🎯 Enviando template: saudacao_inicial');
    return await enviarTemplateWhatsApp(
      userNumber, 
      phoneNumberId, 
      'saudacao_inicial', 
      [
        { type: 'text', text: 'Bem-vindo ao Mind It!' },
        { type: 'text', text: 'Vamos começar?' }
      ]
    );
  }
  
  // 2. AJUDA (ajuda, /ajuda, como funciona, help)
  if (['ajuda', '/ajuda', 'help', 'como funciona', '?', 'oque faz'].includes(userText)) {
    console.log('🎯 Enviando template: ajuda_simples');
    return await enviarTemplateWhatsApp(
      userNumber,
      phoneNumberId,
      'ajuda_simples',
      [] // Sem variáveis
    );
  }
  
  // 3. CRIAR LEMBRETE (formato: [tarefa] as [hora])
  const lembreteMatch = userText.match(/(.+?)\s+(?:as|às|as|às)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:h|hr|hs|horas?))?)/i);
  
  if (lembreteMatch) {
    const tarefa = lembreteMatch[1].trim();
    const hora = lembreteMatch[2].trim();
    
    console.log(`🎯 Criando lembrete: "${tarefa}" às ${hora}`);
    
    // Aqui seria salvo no banco (quando tivermos Supabase)
    console.log(`💾 [SIMULAÇÃO] Salvaria no banco: ${tarefa} às ${hora} para ${userNumber}`);
    
    return await enviarTemplateWhatsApp(
      userNumber,
      phoneNumberId,
      'lembrete_anotado',
      [
        { type: 'text', text: tarefa },
        { type: 'text', text: formatarHoraParaExibicao(hora) } // CORRIGIDO: sem "this."
      ]
    );
  }
  
  // 4. CONFIRMAÇÃO DE TAREFA CONCLUÍDA (feito, já fiz, concluído, etc)
  const confirmacoes = ['feito', 'já fiz', 'concluído', 'concluido', 'pronto', 'ok', 'okay', 'feito!', 'pronto!'];
  if (confirmacoes.some(palavra => userText.includes(palavra))) {
    console.log('🎯 Confirmando tarefa concluída');
    
    // Aqui buscaríamos a última tarefa do usuário (quando tivermos banco)
    const ultimaTarefa = '[tarefa mais recente]'; // Placeholder
    
    return await enviarTemplateWhatsApp(
      userNumber,
      phoneNumberId,
      'lembrete_concluido',
      [
        { type: 'text', text: ultimaTarefa }
      ]
    );
  }
  
  // 5. LISTA DE COMANDOS (/lista, listar, meus lembretes)
  if (['/lista', 'lista', 'listar', 'meus lembretes', 'o que tenho'].includes(userText)) {
    console.log('🎯 Enviando template: lista_comandos');
    return await enviarTemplateWhatsApp(
      userNumber,
      phoneNumberId,
      'lista_comandos',
      [] // Sem variáveis
    );
  }
  
  // 6. MENSAGEM NÃO RECONHECIDA - Envia ajuda
  console.log('🎯 Mensagem não reconhecida, enviando ajuda');
  return await enviarTemplateWhatsApp(
    userNumber,
    phoneNumberId,
    'ajuda_simples',
    []
  );
}

// 🕒 FUNÇÃO AUXILIAR PARA FORMATAR HORA
function formatarHoraParaExibicao(horaStr) {
  // Remove tudo que não é número ou :
  const horaLimpa = horaStr.replace(/[^0-9:]/g, '');
  
  // Se tem :, formata como "14h30"
  if (horaLimpa.includes(':')) {
    const [horas, minutos] = horaLimpa.split(':');
    return `${horas}h${minutos}`;
  }
  
  // Se não tem :, só adiciona "h"
  return `${horaLimpa}h`;
}

// 📤 FUNÇÃO PARA ENVIAR TEMPLATE (PRINCIPAL)
async function enviarTemplateWhatsApp(destinatario, phoneNumberId, templateName, parameters = []) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.log('❌ Token não configurado no Vercel');
      console.log('💡 Configure META_ACCESS_TOKEN nas variáveis de ambiente');
      console.log('📝 Por enquanto, apenas simulando envio');
      console.log(`📤 [SIMULAÇÃO] Template ${templateName} para ${destinatario}`);
      console.log(`📝 Parâmetros:`, parameters);
      return false;
    }
    
    // Se não tiver phoneNumberId, usa fallback
    if (!phoneNumberId) {
      phoneNumberId = process.env.META_PHONE_NUMBER_ID || '973121319218554';
    }
    
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    console.log('🚀 Enviando template:', templateName);
    console.log('📞 Para:', destinatario);
    console.log('🔗 URL:', url);
    
    // Construir payload do template
    const payload = {
      messaging_product: 'whatsapp',
      to: destinatario,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'pt_BR',
          policy: 'deterministic'
        }
      }
    };
    
    // Adicionar componentes se tiver parâmetros
    if (parameters.length > 0) {
      payload.template.components = [{
        type: 'body',
        parameters: parameters
      }];
    }
    
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    // TENTAR ENVIAR VIA API META
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('📤 Resposta da Meta:', data);
    
    if (response.ok) {
      console.log(`✅✅✅ TEMPLATE "${templateName}" ENVIADO COM SUCESSO! ✅✅✅`);
      return true;
    } else {
      console.log('❌ Erro ao enviar template:', data.error?.message);
      console.log('🔍 Código do erro:', data.error?.code);
      
      // Se for erro de template não encontrado, tentar template genérico
      if (data.error?.code === 132000) {
        console.log('💡 Tentando template genérico hello_world');
        return await enviarTemplateWhatsApp(
          destinatario, 
          phoneNumberId, 
          'hello_world', 
          []
        );
      }
      return false;
    }
    
  } catch (error) {
    console.log('💥 Erro fatal:', error.message);
    console.log('📝 [SIMULAÇÃO] Template não enviado (erro ou falta de token)');
    return false;
  }
}

// 🧪 FUNÇÃO DE TESTE (para validar parsing)
function testarParsing() {
  const testes = [
    'comprar leite as 18',
    'pagar conta às 14:30',
    'buscar crianças as 16h',
    'ir no médico amanhã as 9',
    'tomar remédio às 20:00'
  ];
  
  console.log('\n🧪 TESTES DE PARSING:');
  testes.forEach(teste => {
    const match = teste.match(/(.+?)\s+(?:as|às|as|às)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:h|hr|hs|horas?))?)/i);
    if (match) {
      console.log(`✅ "${teste}" → Tarefa: "${match[1].trim()}", Hora: "${match[2].trim()}"`);
    } else {
      console.log(`❌ "${teste}" → Não reconhecido`);
    }
  });
}

// Executar testes se rodando localmente
if (typeof window === 'undefined' && process.argv.includes('--test')) {
  testarParsing();
}
