// api/webhook.js - VERSÃO COM HELLO_WORLD PARA TESTE IMEDIATO
export default async function handler(req, res) {
  console.log('=== 🤖 MIND IT BOT - HELLO_WORLD TEST ===', new Date().toISOString());
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
      mode: 'hello_world_test_mode',
      test_format: '[tarefa] as [hora]',
      example: 'comprar leite as 18',
      note: 'Usando template hello_world para testes imediatos'
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
        
        // PROCESSAR MENSAGEM (MODO TESTE COM HELLO_WORLD)
        await processarMensagemTeste(userNumber, userText, phoneNumberId);
        
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

// 🧠 PROCESSADOR DE TESTE (HELLO_WORLD APENAS)
async function processarMensagemTeste(userNumber, userText, phoneNumberId) {
  console.log('⚙️ Processando (modo teste):', userText);
  
  // EXTRAIR NOME DO NÚMERO (para personalização)
  const userName = extrairNomeDoNumero(userNumber);
  
  // SEMPRE responde com hello_world (PARA TESTE IMEDIATO)
  console.log('🎯 [TESTE] Enviando template hello_world');
  
  const resultado = await enviarTemplateWhatsApp(
    userNumber, 
    phoneNumberId, 
    'hello_world', // ← TEMPLATE PRÉ-APROVADO
    [
      { type: 'text', text: userName }
    ]
  );
  
  // Log adicional para debug
  if (resultado) {
    console.log('✅ Teste concluído: hello_world enviado/com tentativa');
  } else {
    console.log('⚠️ Teste: hello_world não enviado (verificar token/logs)');
  }
}

// 🔧 FUNÇÃO AUXILIAR: EXTRAIR NOME DO NÚMERO
function extrairNomeDoNumero(numero) {
  // Pega últimos 4 dígitos para personalização
  const ultimosDigitos = numero.slice(-4);
  return `Usuário${ultimosDigitos}`;
}

// 📤 FUNÇÃO PARA ENVIAR TEMPLATE (PRINCIPAL)
async function enviarTemplateWhatsApp(destinatario, phoneNumberId, templateName, parameters = []) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    
    // SE NÃO TEM TOKEN, MOSTRA LOG DETALHADO MAS NÃO FALHA
    if (!accessToken) {
      console.log('❌ Token não configurado no Vercel');
      console.log('💡 Configure META_ACCESS_TOKEN nas variáveis de ambiente');
      console.log('📝 Valor esperado: Token que começa com EAAN...');
      console.log('🔗 Como conseguir: WhatsApp → Configuration → Access Tokens → Generate Token');
      console.log('📤 [SIMULAÇÃO] Template seria:', templateName);
      console.log('📞 Para:', destinatario);
      console.log('📝 Parâmetros:', parameters);
      console.log('🚨 AÇÃO NECESSÁRIA: Adicionar token no Vercel → Settings → Environment Variables');
      return false;
    }
    
    // Se não tiver phoneNumberId, usa fallback
    if (!phoneNumberId) {
      phoneNumberId = process.env.META_PHONE_NUMBER_ID || '973121319218554';
      console.log('📱 Usando Phone Number ID fallback:', phoneNumberId);
    }
    
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    console.log('🚀 ENVIANDO TEMPLATE REAL AGORA!');
    console.log('🎯 Template:', templateName);
    console.log('📞 Para:', destinatario);
    console.log('🔗 URL:', url);
    console.log('🔑 Token configurado?:', accessToken ? 'SIM (primeiros 10 chars): ' + accessToken.substring(0, 10) + '...' : 'NÃO');
    
    // Construir payload do template
    const payload = {
      messaging_product: 'whatsapp',
      to: destinatario,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US', // hello_world é em inglês
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
    
    // TENTAR ENVIAR VIA API META (AGORA DE VERDADE!)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('📤 RESPOSTA DA META:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log(`✅✅✅ SUCESSO! TEMPLATE "${templateName}" ACEITO PELA META! ✅✅✅`);
      console.log(`💌 Agora a Meta deve entregar ao usuário...`);
      return true;
    } else {
      console.log('❌❌❌ ERRO DA META AO ACEITAR TEMPLATE ❌❌❌');
      console.log('🔍 Mensagem do erro:', data.error?.message);
      console.log('📝 Código do erro:', data.error?.code);
      console.log('📌 Tipo do erro:', data.error?.type);
      console.log('🆔 FB Trace ID:', data.error?.fbtrace_id);
      
      // ANÁLISE DOS ERROS COMUNS
      if (data.error?.code === 190) {
        console.log('🚨 PROBLEMA: Token expirado ou inválido');
        console.log('💡 SOLUÇÃO: Gerar novo token no painel da Meta');
      } else if (data.error?.code === 100) {
        console.log('🚨 PROBLEMA: Permissões insuficientes');
        console.log('💡 SOLUÇÃO: Aguardar aprovação whatsapp_business_messaging ou usar token com whatsapp_business_management');
      } else if (data.error?.code === 132000) {
        console.log('🚨 PROBLEMA: Template não encontrado');
        console.log('💡 SOLUÇÃO: hello_world deveria existir. Verificar conta/número');
      } else if (data.error?.code === 131026) {
        console.log('🚨 PROBLEMA: Número não autorizado');
        console.log('💡 SOLUÇÃO: Verificar se o número está na lista de teste');
      }
      
      return false;
    }
    
  } catch (error) {
    console.log('💥 ERRO FATAL NO ENVIO:', error.message);
    console.log('🧾 Stack:', error.stack);
    return false;
  }
}

// 🧪 FUNÇÃO DE TESTE LOCAL (para validar parsing)
function testarParsing() {
  const testes = [
    'comprar leite as 18',
    'pagar conta às 14:30',
    'buscar crianças as 16h',
    'ir no médico amanhã as 9',
    'tomar remédio às 20:00'
  ];
  
  console.log('\n🧪 TESTES DE PARSING (para referência):');
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
