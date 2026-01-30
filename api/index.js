// api/index.js - Servidor do Mind It Bot

// 1. IMPORTAR BIBLIOTECAS
const express = require('express');
const app = express();

// Middleware para parsear JSON e dados de formulário
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// 2. COLE AQUI TODO O CONTEÚDO DO SEU index.js ATUAL
// (os requires do twilio, supabase, etc.)
// ============================================

// ⬇️⬇️⬇️ COLE TODO O SEU CÓDIGO AQUI ⬇️⬇️⬇️

// Por exemplo:
// const twilio = require('twilio');
// const supabase = require('@supabase/supabase-js');
// const cron = require('node-cron');

// Suas configurações...
// Seus webhooks...
// Seus cron jobs...

// ⬆️⬆️⬆️ ATÉ O FINAL DO SEU CÓDIGO ⬆️⬆️⬆️

// ============================================
// 3. ROTAS BÁSICAS PARA TESTE
// ============================================

// Rota raiz - página de status
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
        code {
          background: #2d3436;
          color: #00b894;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Mind It WhatsApp Bot</h1>
        <p>Servidor backend está funcionando perfeitamente!</p>
        <div class="status">SISTEMA ONLINE ✅</div>
        
        <div class="endpoints">
          <h3>📡 Endpoints Disponíveis:</h3>
          <ul>
            <li><strong>GET <code>/</code></strong> - Esta página de status</li>
            <li><strong>GET <code>/health</code></strong> - Status do servidor (JSON)</li>
            <li><strong>POST <code>/webhook</code></strong> - Webhook do Twilio para WhatsApp</li>
            <!-- Adicione outras rotas que você tem -->
          </ul>
          
          <h3 style="margin-top: 25px;">🔗 Links Úteis:</h3>
          <ul>
            <li><a href="/health" target="_blank">Testar saúde do servidor</a></li>
            <li><a href="https://twilio.com" target="_blank">Painel do Twilio</a></li>
            <li><a href="https://supabase.com" target="_blank">Painel do Supabase</a></li>
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
    version: '1.0.0'
  });
});

// ============================================
// 4. INICIAR SERVIDOR (VERCEL USA EXPORT)
// ============================================

// IMPORTANTE: No Vercel, NÃO use app.listen()!
// Exporte o app para o Vercel gerenciar
module.exports = app;

// Se quiser testar localmente, pode deixar este código comentado:
/*
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
*/
