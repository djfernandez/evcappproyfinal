const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiRoutes = require('./routes/api');
const { isConfigured } = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend estático directamente para desarrollo y despliegue unificado
const frontendPath = path.join(__dirname, '../../frontend/public');
app.use(express.static(frontendPath));

// Rutas de API
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Nexus SAC B2B Quotation System',
    supabase_connected: isConfigured,
    mode: isConfigured ? 'Supabase Cloud' : 'Local MVP / In-Memory Mock',
    timestamp: new Date().toISOString()
  });
});

// Fallback para SPA: si no coincide con ruta de API, servir index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint no encontrado' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Nexus SAC - Sistema B2B de Cotizaciones`);
    console.log(`📡 Servidor activo en: http://localhost:${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`💾 Modo Base de Datos: ${isConfigured ? 'Supabase Remoto' : 'Motor Local Embebido'}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
