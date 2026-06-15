require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { absoluteUploadsPath } = require('./middleware/upload');
const expertsRouter = require('./routes/experts');
const messagesRouter = require('./routes/messages');
const dashboardRouter = require('./routes/dashboard');
const scheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve arquivos enviados
app.use('/uploads', express.static(absoluteUploadsPath));

// Rotas da API
app.use('/api/experts', expertsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// 404 para rotas de API desconhecidas
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada.' });
});

// Handler de erros (inclui erros do multer)
app.use((err, req, res, next) => {
  console.error('[server] Erro não tratado:', err.message);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const message =
    err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo excede o limite de 50MB.'
      : err.message || 'Erro interno do servidor.';
  res.status(status).json({ success: false, error: message });
});

app.listen(PORT, () => {
  console.log(`[server] TelegramManager backend rodando em http://localhost:${PORT}`);
  scheduler.start();
});
