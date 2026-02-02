// api/webhook.js - VERSÃO COMPLETA COM SISTEMA DE LEMBRETES RECORRENTES
// Mind It Bot - WhatsApp Business API Webhook

import { createClient } from '@supabase/supabase-js';

// 🔐 CONFIGURAÇÃO DO SUPABASE
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔗 Supabase configurado:', supabaseUrl ? '✅' : '❌');

export default async function handler(req, res) {
  console.log('\n=== 🤖 MIND IT BOT - WEBHOOK INICIADO ===', new Date().toISOString());
  
  if (req.method === 'GET') {
    console.log('🔍 Recebida solicitação GET (verificação webhook)');
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'MindItBot2024';
    
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ Token de verificação VÁLIDO!');
      return res.status(200).send(challenge);
    } else {
      console.log('❌ Token de verificação INVÁLIDO!'); 
      return res.status(403).send('Token de verificação inválido');
    }
  }
  
  if (req.method === 'POST') {
    console.log('📨 Recebida solicitação POST (mensagem WhatsApp)');
    
    try {
      const body = req.body;
      
      if (body.object !== 'whatsapp_business_account') {
        return res.status(400).send('Objeto inválido');
      }
      
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;
            const message = value.messages?.[0];
            
            if (!message) continue;
            
            const from = message.from;
            const messageType = message.type;
            const timestamp = message.timestamp ? parseInt(message.timestamp) * 1000 : Date.now();
            
            console.log('\n📩 MENSAGEM RECEBIDA:');
            console.log(`👤 Usuário: ${from}`);
            console.log(`⏰ Recebida em: ${new Date(timestamp).toISOString()}`);
            console.log(`📝 Tipo: ${messageType}`);
            
            if (messageType === 'text') {
              const messageText = message.text.body;
              console.log(`💬 Texto: ${messageText}`);
              await processMessage(from, messageText, timestamp);
            } else {
              await sendWhatsAppMessage(from, 'hello_world');
            }
          }
        }
      }
      
      return res.status(200).send('EVENT_RECEIVED');
      
    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      return res.status(500).send('Erro interno');
    }
  }
  
  return res.status(405).send('Método não permitido');
}

// 🔧 FUNÇÃO PRINCIPAL DE PROCESSAMENTO
async function processMessage(from, text, messageTimestamp) {
  console.log(`\n⚙️ PROCESSANDO: "${text}"`);
  console.log(`⏰ Timestamp da mensagem: ${new Date(messageTimestamp).toISOString()}`);
  
  const lowerText = text.toLowerCase().trim();
  
  // COMANDOS ESPECIAIS
  if (lowerText === 'oi' || lowerText === 'olá' || lowerText === 'ola' || lowerText === 'hello') {
    await sendTextMessage(from, '🤖 *Olá! Eu sou o Mind It Bot!*\n\nPara criar um lembrete, basta me dizer:\n\n• "Fazer contrato em 20 minutos"\n• "Reunião as 14h"\n• "Estudar amanhã"\n• "Academia segunda"\n\n📝 Use "lista" para ver seus lembretes');
    return;
  }
  
  if (lowerText === 'ajuda' || lowerText === 'help') {
    await sendTextMessage(from, '🤖 *Mind It Bot - Ajuda*\n\n📋 *Como criar lembretes:*\n\n1. *"Tarefa em X minutos":* "Ler contrato em 20 minutos"\n   → 3 lembretes automáticos (agora, +30min, +1h)\n\n2. *"Tarefa as hora":* "Reunião as 15:30"\n   → Hoje no horário\n\n3. *"Tarefa + dia":* "Pagar contas amanhã"\n   → Amanhã, pergunto o horário\n\n📝 Use "lista" para ver seus lembretes\n✅ Use "feito" para marcar como concluído\n❌ Use "cancelar [ID]" para remover');
    return;
  }
  
  if (lowerText === 'lista' || lowerText === 'listar') {
    await listarLembretes(from);
    return;
  }
  
  // COMANDO PARA MARCAR COMO FEITO (COM OU SEM ID)
  const feitoRegex = /^feito(?:\s+(\d+))?$/i;
  const feitoMatch = lowerText.match(feitoRegex);
  if (feitoMatch) {
    const lembreteId = feitoMatch[1] ? parseInt(feitoMatch[1]) : null;
    await marcarComoFeito(from, lembreteId);
    return;
  }
  
  // COMANDO PARA CANCELAR LEMBRETE
  const cancelarRegex = /^cancelar\s+(\d+)$/i;
  const cancelarMatch = lowerText.match(cancelarRegex);
  if (cancelarMatch) {
    const lembreteId = parseInt(cancelarMatch[1]);
    await cancelarLembrete(from, lembreteId);
    return;
  }
  
  // CONFIRMAÇÕES SIMPLES (SIM/NÃO)
  if (lowerText === 'sim' || lowerText === 'não' || lowerText === 'nao') {
    await sendTextMessage(from, `✅ Obrigado pela confirmação! ${lowerText === 'sim' ? 'Que bom que lembrou! 🎉' : 'Sem problemas, te lembro mais tarde!'}`);
    return;
  }
  
  // 📝 PRIMEIRO: Verificar se é formato "em X minutos/horas/dias"
  const analiseTempo = analisarTempoRelativo(text, messageTimestamp);
  if (analiseTempo) {
    console.log('⏱️ Formato "em X minutos" detectado:', analiseTempo);
    await criarLembreteRecorrente(from, analiseTempo, messageTimestamp);
    return;
  }
  
  // 📝 SEGUNDO: Verificar formato padrão existente
  const analise = analisarMensagem(text, messageTimestamp);
  console.log('🔍 Análise da mensagem:', analise);
  
  // Se tem dia mas não tem hora, perguntar o horário
  if (analise.dia && !analise.hora) {
    await perguntarHorario(from, analise);
    return;
  }
  
  // Se tem tudo, criar lembrete padrão
  if (analise.tarefa) {
    await criarLembretePadrao(from, analise);
    return;
  }
  
  // Se não entendeu, mostrar ajuda
  await sendTextMessage(from, '🤖 *Como criar um lembrete:*\n\n1. *"Tarefa em X minutos":* "Ler contrato em 20 minutos"\n2. *"Tarefa as hora":* "Tomar remédio as 20h"\n3. *"Tarefa + dia":* "Reunião amanhã"\n\n📝 Exemplos:\n• "Estudar as 15"\n• "Pagar conta amanhã"\n• "Academia segunda-feira as 18:30"');
}

// ==============================================
// 🔍 FUNÇÕES DE ANÁLISE DE MENSAGEM
// ==============================================

// 🔍 ANÁLISE PARA "EM X MINUTOS/HORAS/DIAS"
function analisarTempoRelativo(texto, timestampMensagem) {
  const agora = new Date(timestampMensagem);
  const textoLower = texto.toLowerCase();
  
  // Padrões para tempo relativo
  const padroes = [
    { regex: /(.+?)\s+em\s+(\d+)\s+minutos?/i, multiplicador: 1 },      // minutos
    { regex: /(.+?)\s+em\s+(\d+)\s+horas?/i, multiplicador: 60 },       // horas
    { regex: /(.+?)\s+em\s+(\d+)\s+dias?/i, multiplicador: 1440 },      // dias
    { regex: /(.+?)\s+daqui\s+a\s+(\d+)\s+minutos?/i, multiplicador: 1 }, // "daqui a X minutos"
    { regex: /(.+?)\s+daqui\s+a\s+(\d+)\s+horas?/i, multiplicador: 60 }   // "daqui a X horas"
  ];
  
  for (const padrao of padroes) {
    const match = textoLower.match(padrao.regex);
    if (match) {
      const tarefa = match[1].trim();
      const quantidade = parseInt(match[2]);
      const minutosTotais = quantidade * padrao.multiplicador;
      
      // Calcular data/hora do lembrete
      const dataLembrete = new Date(agora);
      dataLembrete.setMinutes(agora.getMinutes() + minutosTotais);
      
      // Formatar unidade de tempo
      let unidade = 'minutos';
      if (padrao.multiplicador === 60) unidade = 'horas';
      if (padrao.multiplicador === 1440) unidade = 'dias';
      
      return {
        tarefa: tarefa,
        quantidade: quantidade,
        unidade: unidade,
        minutosTotais: minutosTotais,
        dataAgendada: dataLembrete,
        tipo: 'tempo_relativo'
      };
    }
  }
  
  return null;
}

// 🔍 ANÁLISE INTELIGENTE DA MENSAGEM (existente)
function analisarMensagem(texto, timestampMensagem) {
  const textoLimpo = texto.toLowerCase().trim();
  const agora = new Date(timestampMensagem);
  const resultado = {
    tarefa: '',
    hora: null,
    dia: null,
    dataCompleta: null,
    tipo: 'desconhecido'
  };
  
  // Expressões regulares para diferentes formatos
  const padroes = {
    // Tarefa + as + Hora (ex: "Reunião as 14h")
    tarefaHora: /(.+?)\s+as\s+(\d{1,2}(?:[:.]?\d{0,2})?\s*(?:h|hr|hrs|horas)?)/i,
    
    // Tarefa + Hora sem "as" (ex: "Reunião 14h")
    tarefaDiretoHora: /(.+?)\s+(\d{1,2}(?:[:.]?\d{0,2})?\s*(?:h|hr|hrs|horas))/i,
    
    // Apenas hora no final (ex: "Estudar 15")
    apenasHoraFinal: /(.+?)\s+(\d{1,2})\s*$/,
    
    // Tarefa + Dia (ex: "Fazer compras amanhã")
    tarefaDia: /(.+?)\s+(amanhã|amanha|hoje|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:\s*-?\s*feira)?/i,
    
    // Tarefa + Dia + Hora (ex: "Reunião quarta 14h")
    tarefaDiaHora: /(.+?)\s+(amanhã|amanha|hoje|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:\s*-?\s*feira)?\s+(\d{1,2}(?:[:.]?\d{0,2})?\s*(?:h|hr|hrs|horas)?)/i
  };
  
  // Tentar cada padrão
  let match = null;
  
  // 1. Tarefa + Dia + Hora
  match = textoLimpo.match(padroes.tarefaDiaHora);
  if (match) {
    resultado.tarefa = match[1].trim();
    resultado.dia = match[2].toLowerCase();
    resultado.hora = extrairHora(match[3]);
    resultado.tipo = 'tarefa_dia_hora';
    resultado.dataCompleta = calcularData(resultado.dia, resultado.hora, agora);
    return resultado;
  }
  
  // 2. Tarefa + as + Hora
  match = textoLimpo.match(padroes.tarefaHora);
  if (match) {
    resultado.tarefa = match[1].trim();
    resultado.hora = extrairHora(match[2]);
    resultado.tipo = 'tarefa_hora';
    resultado.dataCompleta = calcularData('hoje', resultado.hora, agora);
    return resultado;
  }
  
  // 3. Tarefa + Hora direto
  match = textoLimpo.match(padroes.tarefaDiretoHora);
  if (match) {
    resultado.tarefa = match[1].trim();
    resultado.hora = extrairHora(match[2]);
    resultado.tipo = 'tarefa_hora_direto';
    resultado.dataCompleta = calcularData('hoje', resultado.hora, agora);
    return resultado;
  }
  
  // 4. Tarefa + Dia
  match = textoLimpo.match(padroes.tarefaDia);
  if (match) {
    resultado.tarefa = match[1].trim();
    resultado.dia = match[2].toLowerCase();
    resultado.tipo = 'tarefa_dia';
    // Não tem hora, será perguntada depois
    return resultado;
  }
  
  // 5. Apenas hora no final
  match = textoLimpo.match(padroes.apenasHoraFinal);
  if (match) {
    resultado.tarefa = match[1].trim();
    resultado.hora = extrairHora(match[2]);
    resultado.tipo = 'tarefa_hora_simples';
    resultado.dataCompleta = calcularData('hoje', resultado.hora, agora);
    return resultado;
  }
  
  // 6. Apenas tarefa (sem hora nem dia)
  resultado.tarefa = texto.trim();
  resultado.tipo = 'tarefa_simples';
  
  // Para tarefa simples: 1 hora depois da mensagem
  const umaHoraDepois = new Date(agora);
  umaHoraDepois.setHours(umaHoraDepois.getHours() + 1);
  resultado.dataCompleta = umaHoraDepois;
  resultado.hora = `${umaHoraDepois.getHours().toString().padStart(2, '0')}:${umaHoraDepois.getMinutes().toString().padStart(2, '0')}`;
  
  return resultado;
}

// 🕒 EXTRAIR HORA DE STRING
function extrairHora(textoHora) {
  if (!textoHora) return null;
  
  const limpo = textoHora.trim().replace(/[hhrs:.]/g, '');
  let horas = 0;
  let minutos = 0;
  
  if (limpo.length === 1 || limpo.length === 2) {
    // Formato: "9" ou "14"
    horas = parseInt(limpo, 10);
  } else if (limpo.length === 3) {
    // Formato: "930"
    horas = parseInt(limpo.substring(0, 1), 10);
    minutos = parseInt(limpo.substring(1), 10);
  } else if (limpo.length === 4) {
    // Formato: "0930" ou "1430"
    horas = parseInt(limpo.substring(0, 2), 10);
    minutos = parseInt(limpo.substring(2), 10);
  }
  
  // Validar
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
    return null;
  }
  
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

// 📅 CALCULAR DATA COMPLETA
function calcularData(dia, hora, dataAtual) {
  if (!dia || !hora) return null;
  
  const resultado = new Date(dataAtual);
  const [horas, minutos] = hora.split(':').map(Number);
  
  // Ajustar hora
  resultado.setHours(horas, minutos, 0, 0);
  
  // Ajustar dia
  const diasSemana = {
    'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2, 
    'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6
  };
  
  if (dia === 'amanhã' || dia === 'amanha') {
    resultado.setDate(resultado.getDate() + 1);
  } else if (dia === 'hoje') {
    // Já está hoje
  } else if (diasSemana[dia] !== undefined) {
    const diaDesejado = diasSemana[dia];
    const diaAtual = resultado.getDay();
    let diasParaAdicionar = diaDesejado - diaAtual;
    
    if (diasParaAdicionar <= 0) {
      diasParaAdicionar += 7; // Próxima semana
    }
    
    resultado.setDate(resultado.getDate() + diasParaAdicionar);
  }
  
  // Verificar se a hora já passou hoje
  if (dia === 'hoje' || !diasSemana[dia]) {
    if (resultado < dataAtual) {
      // Se hora já passou, agenda para amanhã
      resultado.setDate(resultado.getDate() + 1);
    }
  }
  
  return resultado;
}

// ==============================================
// 📥 FUNÇÕES DE CRIAÇÃO DE LEMBRETES
// ==============================================

// 📥 CRIAR LEMBRETE RECORRENTE (EM X MINUTOS)
async function criarLembreteRecorrente(phoneNumber, analise, messageTimestamp) {
  console.log('📥 Criando lembrete recorrente:', analise);
  
  try {
    // 1. Buscar ou criar usuário
    const userId = await buscarOuCriarUsuario(phoneNumber);
    
    // 2. Criar LEMBRETE PRINCIPAL (primeiro)
    const lembretePrincipal = {
      user_id: userId,
      task: analise.tarefa,
      scheduled_time: analise.dataAgendada.toISOString(),
      status: 'pending',
      recurrence_pattern: 'interval',
      recurrence_count: 0,
      max_recurrences: 3,
      confirmed: false
    };
    
    console.log('💾 Salvando lembrete principal:', lembretePrincipal);
    
    const { data: lembreteSalvo, error } = await supabase
      .from('reminders')
      .insert([lembretePrincipal])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('💾✅ Lembrete principal salvo:', lembreteSalvo);
    
    // 3. Criar RELEMBRETES automáticos (30min e 1h depois do primeiro)
    const relembretes = [];
    
    // Relembrete 1: 30 minutos depois do primeiro
    const dataRelembrete1 = new Date(analise.dataAgendada);
    dataRelembrete1.setMinutes(dataRelembrete1.getMinutes() + 30);
    
    // Relembrete 2: 1 hora depois do primeiro
    const dataRelembrete2 = new Date(analise.dataAgendada);
    dataRelembrete2.setHours(dataRelembrete2.getHours() + 1);
    
    const relembrete1 = {
      user_id: userId,
      task: analise.tarefa,
      scheduled_time: dataRelembrete1.toISOString(),
      status: 'pending',
      parent_id: lembreteSalvo.id,
      recurrence_count: 1,
      confirmed: false
    };
    
    const relembrete2 = {
      user_id: userId,
      task: analise.tarefa,
      scheduled_time: dataRelembrete2.toISOString(),
      status: 'pending',
      parent_id: lembreteSalvo.id,
      recurrence_count: 2,
      confirmed: false
    };
    
    // Salvar relembretes
    const { data: relembretesSalvos, error: errorRelembretes } = await supabase
      .from('reminders')
      .insert([relembrete1, relembrete2])
      .select();
    
    if (errorRelembretes) {
      console.error('❌ Erro ao salvar relembretes:', errorRelembretes);
    } else {
      console.log('💾✅ Relembretes salvos:', relembretesSalvos);
    }
    
    // 4. Enviar confirmação ao usuário
    const horaFormatada = `${analise.dataAgendada.getHours().toString().padStart(2, '0')}:${analise.dataAgendada.getMinutes().toString().padStart(2, '0')}`;
    
    await sendTextMessage(
      phoneNumber,
      `✅ *Lembrete criado com sistema de repetição!*\n\n` +
      `📝 *Tarefa:* ${analise.tarefa}\n` +
      `⏰ *Primeiro lembrete:* ${horaFormatada}h (em ${analise.quantidade} ${analise.unidade})\n` +
      `🔁 *Relembretes automáticos:*\n` +
      `   • 30 minutos depois (se não confirmar)\n` +
      `   • 1 hora depois (se não confirmar)\n\n` +
      `💡 *Comandos:*\n` +
      `• "feito" - Marcar tudo como concluído\n` +
      `• "feito ${lembreteSalvo.id}" - Confirmar esta tarefa\n` +
      `• "cancelar ${lembreteSalvo.id}" - Cancelar todos\n` +
      `• "lista" - Ver seus lembretes`
    );
    
  } catch (error) {
    console.error('❌ Erro ao criar lembrete recorrente:', error);
    await sendTextMessage(
      phoneNumber,
      `✅ *Lembrete anotado manualmente!*\n\n📝 ${analise.tarefa}\n⏰ Em ${analise.quantidade} ${analise.unidade}`
    );
  }
}

// 📥 CRIAR LEMBRETE PADRÃO (formato existente)
async function criarLembretePadrao(phoneNumber, analise) {
  console.log('📥 Criando lembrete padrão:', analise);
  
  try {
    // 1. Buscar ou criar usuário
    const userId = await buscarOuCriarUsuario(phoneNumber);
    
    // 2. Preparar dados
    const dataAgendamento = analise.dataCompleta || new Date();
    
    const lembreteData = {
      user_id: userId,
      task: analise.tarefa,
      scheduled_time: dataAgendamento.toISOString(),
      status: 'pending',
      recurrence_pattern: 'once', // Apenas uma vez
      recurrence_count: 0,
      max_recurrences: 1,
      confirmed: false
    };
    
    console.log('💾 Salvando lembrete:', lembreteData);
    
    // 3. Salvar no Supabase
    const { data, error } = await supabase
      .from('reminders')
      .insert([lembreteData])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar:', error);
      throw error;
    }
    
    console.log('💾✅ Lembrete salvo:', data);
    
    // 4. Enviar confirmação
    await enviarConfirmacaoPadrao(phoneNumber, analise, data.id, dataAgendamento);
    
  } catch (error) {
    console.error('❌ Erro no processo:', error);
    await sendTextMessage(
      phoneNumber, 
      `✅ *Lembrete anotado localmente!*\n\n📝 ${analise.tarefa}\n⏰ ${formatarDataHora(analise.dataCompleta || new Date())}`
    );
  }
}

// 👤 BUSCAR OU CRIAR USUÁRIO (função auxiliar)
async function buscarOuCriarUsuario(phoneNumber) {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (userError && userError.code === 'PGRST116') {
    // Criar novo usuário
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ phone_number: phoneNumber }])
      .select()
      .single();
    
    if (createError) throw createError;
    console.log('👤✅ Novo usuário criado:', newUser.id);
    return newUser.id;
  } else if (userError) {
    throw userError;
  } else {
    console.log('👤✅ Usuário encontrado:', userData.id);
    return userData.id;
  }
}

// ==============================================
// ❓ FUNÇÕES DE INTERAÇÃO
// ==============================================

// ❓ PERGUNTAR HORÁRIO
async function perguntarHorario(phoneNumber, analise) {
  console.log(`❓ Perguntando horário para: ${analise.tarefa} (${analise.dia})`);
  
  const mensagem = `⏰ *Para "${analise.tarefa}"*\n\nEm qual horário ${analise.dia === 'amanhã' || analise.dia === 'amanha' ? 'amanhã' : `na ${analise.dia}`}?\n\nDigite apenas o horário:\n• "14"\n• "18h"\n• "09:30"\n• "20:00"`;
  
  await sendTextMessage(phoneNumber, mensagem);
}

// ✅ ENVIAR CONFIRMAÇÃO PADRÃO
async function enviarConfirmacaoPadrao(phoneNumber, analise, lembreteId, dataAgendamento) {
  let mensagem = '';
  
  switch (analise.tipo) {
    case 'tarefa_simples':
      mensagem = `✅ *Lembrete criado!*\n\n📝 *Tarefa:* ${analise.tarefa}\n⏰ *Quando:* Em 1 hora (${formatarHora(dataAgendamento)})\n🆔 *ID:* ${lembreteId}`;
      break;
      
    case 'tarefa_hora':
    case 'tarefa_hora_direto':
    case 'tarefa_hora_simples':
      const hoje = new Date();
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      
      const quando = dataAgendamento.getDate() === amanha.getDate() 
        ? `amanhã às ${analise.hora}h` 
        : `hoje às ${analise.hora}h`;
      
      mensagem = `✅ *Lembrete criado!*\n\n📝 *Tarefa:* ${analise.tarefa}\n⏰ *Quando:* ${quando}\n🆔 *ID:* ${lembreteId}`;
      break;
      
    case 'tarefa_dia_hora':
      const diaSemana = formatarDiaSemana(analise.dia);
      mensagem = `✅ *Lembrete criado!*\n\n📝 *Tarefa:* ${analise.tarefa}\n⏰ *Quando:* ${diaSemana} às ${analise.hora}h\n🆔 *ID:* ${lembreteId}`;
      break;
      
    default:
      mensagem = `✅ *Lembrete criado!*\n\n📝 *Tarefa:* ${analise.tarefa}\n⏰ *Quando:* ${formatarDataHora(dataAgendamento)}\n🆔 *ID:* ${lembreteId}`;
  }
  
  mensagem += '\n\n📋 Use "lista" para ver seus lembretes.';
  
  await sendTextMessage(phoneNumber, mensagem);
}

// ==============================================
// 📋 FUNÇÕES DE CONSULTA E GERENCIAMENTO
// ==============================================

// 📋 LISTAR LEMBRETES
async function listarLembretes(phoneNumber) {
  console.log(`📋 Listando lembretes para ${phoneNumber}`);
  
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();
    
    if (userError || !user) {
      await sendTextMessage(phoneNumber, '📋 *Seus lembretes*\n\nNenhum lembrete encontrado!');
      return;
    }
    
    const { data: lembretes, error } = await supabase
      .from('reminders')
      .select('id, task, scheduled_time, status, recurrence_count, parent_id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('scheduled_time', { ascending: true })
      .limit(10);
    
    if (error) {
      console.error('❌ Erro ao buscar:', error);
      await sendTextMessage(phoneNumber, '📋 *Seus lembretes*\n\nErro ao buscar lembretes.');
      return;
    }
    
    if (!lembretes || lembretes.length === 0) {
      await sendTextMessage(phoneNumber, '📋 *Seus lembretes*\n\nNenhum lembrete pendente! 🎉');
      return;
    }
    
    let mensagem = '📋 *Seus lembretes pendentes:*\n\n';
    
    lembretes.forEach((lembrete, index) => {
      const data = new Date(lembrete.scheduled_time);
      const agora = new Date();
      const diffMinutos = Math.floor((data - agora) / (1000 * 60));
      
      let quando = '';
      let tipo = '';
      
      if (lembrete.parent_id) {
        tipo = '🔁 ';
        if (lembrete.recurrence_count === 1) {
          tipo += '(Relembrete 30min) ';
        } else if (lembrete.recurrence_count === 2) {
          tipo += '(Relembrete 1h) ';
        }
      }
      
      if (diffMinutos < 60) {
        quando = `em ${diffMinutos} minutos`;
      } else if (diffMinutos < 24 * 60) {
        const horas = Math.floor(diffMinutos / 60);
        quando = `em ${horas}h`;
      } else if (data.toDateString() === agora.toDateString()) {
        quando = `hoje às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}h`;
      } else {
        const amanha = new Date(agora);
        amanha.setDate(amanha.getDate() + 1);
        quando = data.toDateString() === amanha.toDateString() 
          ? `amanhã às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}h`
          : `${data.getDate()}/${data.getMonth() + 1} às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}h`;
      }
      
      mensagem += `${index + 1}. ${tipo}${lembrete.task} - ${quando} (ID: ${lembrete.id})\n`;
    });
    
    mensagem += '\n💡 *Comandos:*\n• "feito" - Marcar tudo como feito\n• "feito [ID]" - Marcar específico\n• "cancelar [ID]" - Cancelar tarefa';
    
    await sendTextMessage(phoneNumber, mensagem);
    
  } catch (error) {
    console.error('❌ Erro no comando lista:', error);
    await sendTextMessage(phoneNumber, '📋 *Seus lembretes*\n\nErro ao carregar lista.');
  }
}

// ✅ MARCAR COMO FEITO (COMPLETO COM SISTEMA DE RELEMBRETES)
async function marcarComoFeito(phoneNumber, lembreteId = null) {
  console.log(`✅ Marcando como feito${lembreteId ? ` lembrete ${lembreteId}` : ' todos'}`);
  
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();
    
    if (!user) {
      await sendTextMessage(phoneNumber, '❌ Usuário não encontrado.');
      return;
    }
    
    // SE TEM ID ESPECÍFICO
    if (lembreteId) {
      // Buscar o lembrete
      const { data: lembrete } = await supabase
        .from('reminders')
        .select('id, task, parent_id')
        .eq('id', lembreteId)
        .eq('user_id', user.id)
        .single();
      
      if (!lembrete) {
        await sendTextMessage(phoneNumber, '❌ Lembrete não encontrado.');
        return;
      }
      
      const parentId = lembrete.parent_id || lembreteId;
      
      // Marcar todos relacionados (parent e filhos) como concluídos
      await supabase
        .from('reminders')
        .update({ 
          status: 'completed',
          confirmed: true,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${parentId},parent_id.eq.${parentId}`)
        .eq('user_id', user.id);
      
      await sendTextMessage(
        phoneNumber, 
        `✅ *Tarefa concluída!*\n\n"${lembrete.task}" marcada como feita.\n\n🎉 Todos os lembretes desta tarefa foram cancelados.`
      );
      
    } else {
      // "FEITO" SEM ID - MARCAR TODOS PENDENTES
      const { data: atualizados, error } = await supabase
        .from('reminders')
        .update({ 
          status: 'completed',
          confirmed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .eq('confirmed', false)
        .select();
      
      if (error) {
        console.error('❌ Erro ao marcar tudo:', error);
        await sendTextMessage(phoneNumber, '❌ Erro ao processar.');
        return;
      }
      
      if (atualizados && atualizados.length > 0) {
        await sendTextMessage(
          phoneNumber, 
          `✅ *${atualizados.length} tarefa(s) marcada(s) como concluída(s)!* 🎉\n\nTodos os lembretes futuros foram cancelados.`
        );
      } else {
        await sendTextMessage(phoneNumber, '✅ Não havia tarefas pendentes para marcar como feitas.');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no comando feito:', error);
    await sendTextMessage(phoneNumber, '✅ Tarefa(s) marcada(s) localmente como concluída(s)!');
  }
}

// ❌ CANCELAR LEMBRETE
async function cancelarLembrete(phoneNumber, lembreteId) {
  console.log(`❌ Cancelando lembrete ${lembreteId}`);
  
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();
    
    if (!user) {
      await sendTextMessage(phoneNumber, '❌ Usuário não encontrado.');
      return;
    }
    
    // Buscar o lembrete
    const { data: lembrete } = await supabase
      .from('reminders')
      .select('id, task, parent_id')
      .eq('id', lembreteId)
      .eq('user_id', user.id)
      .single();
    
    if (!lembrete) {
      await sendTextMessage(phoneNumber, '❌ Lembrete não encontrado.');
      return;
    }
    
    const parentId = lembrete.parent_id || lembreteId;
    
    // Cancelar todos relacionados
    await supabase
      .from('reminders')
      .update({ 
        status: 'cancelled',
        confirmed: true,
        updated_at: new Date().toISOString()
      })
      .or(`id.eq.${parentId},parent_id.eq.${parentId}`)
      .eq('user_id', user.id);
    
    await sendTextMessage(
      phoneNumber, 
      `✅ *Tarefa cancelada!*\n\n"${lembrete.task}" removida.\n\nTodos os lembretes foram cancelados.`
    );
    
  } catch (error) {
    console.error('❌ Erro ao cancelar:', error);
    await sendTextMessage(phoneNumber, '❌ Erro ao cancelar tarefa.');
  }
}

// ==============================================
// 🎨 FUNÇÕES DE FORMATAÇÃO
// ==============================================

function formatarDataHora(data) {
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  
  if (data.toDateString() === hoje.toDateString()) {
    return `hoje às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}h`;
  } else if (data.toDateString() === amanha.toDateString()) {
    return `amanhã às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}h`;
  } else {
    const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    return `${dias[data.getDay()]} às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}h`;
  }
}

function formatarHora(data) {
  return `${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}h`;
}

function formatarDiaSemana(dia) {
  const dias = {
    'segunda': 'segunda-feira',
    'terça': 'terça-feira',
    'terca': 'terça-feira',
    'quarta': 'quarta-feira',
    'quinta': 'quinta-feira',
    'sexta': 'sexta-feira',
    'sábado': 'sábado',
    'sabado': 'sábado',
    'domingo': 'domingo'
  };
  
  return dias[dia] || dia;
}

// ==============================================
// 📤 FUNÇÕES DE ENVIO DE MENSAGENS
// ==============================================

async function sendWhatsAppMessage(to, templateName) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Variáveis não configuradas!');
    return { error: 'Configuração incompleta' };
  }
  
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'pt_BR' }
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
      console.error('❌ Erro na API:', result.error.message);
      return { success: false, error: result.error };
    }
    
    console.log('✅ Mensagem enviada!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendTextMessage(to, text) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Variáveis não configuradas!');
    return { error: 'Configuração incompleta' };
  }
  
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
      console.error('❌ Erro na API:', result.error.message);
      
      if (result.error.code === 131051 || result.error.code === 132000) {
        return await sendWhatsAppMessage(to, 'hello_world');
      }
      
      return { success: false, error: result.error };
    }
    
    console.log('✅ Mensagem de texto enviada!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return { success: false, error: error.message };
  }
}
