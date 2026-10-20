const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const productsController = require('../controllers/productsController');
const clientsController = require('../controllers/clientsController');
const ratesController = require('../controllers/ratesController');
const quotationsController = require('../controllers/quotationsController');
const { authenticateUser, requireRole } = require('../middleware/auth');

// Rutas de Autenticación
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateUser, authController.getMe);
router.get('/auth/users', authController.getDemoUsers);

// Rutas de Productos
router.get('/products', productsController.getProducts);
router.post('/products', authenticateUser, requireRole(['administrador']), productsController.createProduct);
router.patch('/products/:id', authenticateUser, requireRole(['administrador']), productsController.updateProduct);

// Rutas de Clientes
router.get('/clients', clientsController.getClients);
router.post('/clients', authenticateUser, requireRole(['administrador']), clientsController.createClient);
router.patch('/clients/:id', authenticateUser, requireRole(['administrador']), clientsController.updateClient);

// Rutas de Tarifas
router.get('/rates', ratesController.getRates);
router.post('/rates', authenticateUser, requireRole(['administrador']), ratesController.createRate);
router.patch('/rates/:id', authenticateUser, requireRole(['administrador']), ratesController.updateRate);

// Rutas de Cotizaciones
router.get('/quotations', authenticateUser, quotationsController.getQuotations);
router.get('/quotations/:id', authenticateUser, quotationsController.getQuotationById);
router.post('/quotations', authenticateUser, quotationsController.createQuotation);

// Flujo de Aprobaciones: Solo supervisores o administradores pueden aprobar o rechazar
router.patch('/quotations/:id/status', authenticateUser, requireRole(['supervisor', 'administrador']), quotationsController.updateQuotationStatus);

module.exports = router;
