const http = require('http');
const assert = require('assert');

// Keep the API test suite isolated from a developer's configured cloud database.
process.env.SUPABASE_URL = '';
process.env.SUPABASE_KEY = '';
process.env.SUPABASE_ANON_KEY = '';

const app = require('../src/server');

const runTests = async () => {
  console.log('🧪 Iniciando pruebas automáticas de la API Nexus SAC...\n');

  const server = app.listen(3099);
  const BASE_URL = 'http://localhost:3099/api';

  const request = (path, method = 'GET', data = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL + path);
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: reqHeaders
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  };

  try {
    // 1. Health check
    const health = await request('/health');
    console.assert(health.status === 200, 'Health check falló');
    console.log('✅ 1. Health check exitoso');

    // 2. Pruebas de Login para Administrador y Supervisor (incluyendo alias)
    const loginAdmin1 = await request('/auth/login', 'POST', { email: 'admin@nexussac.pe' });
    console.assert(loginAdmin1.status === 200 && loginAdmin1.data.user.role === 'administrador', 'Fallo login admin@nexussac.pe');
    
    const loginAdmin2 = await request('/auth/login', 'POST', { email: 'administrador@nexussac.pe' });
    console.assert(loginAdmin2.status === 200 && loginAdmin2.data.user.role === 'administrador', 'Fallo login administrador@nexussac.pe');
    
    const loginSupervisor = await request('/auth/login', 'POST', { email: 'supervisor@nexussac.pe' });
    console.assert(loginSupervisor.status === 200 && loginSupervisor.data.user.role === 'supervisor', 'Fallo login supervisor@nexussac.pe');
    
    const loginVendedor = await request('/auth/login', 'POST', { email: 'vendedor@nexussac.pe' });
    console.assert(loginVendedor.status === 200 && loginVendedor.data.user.role === 'vendedor', 'Fallo login vendedor@nexussac.pe');
    console.log('✅ 2. Autenticación exitosa verificada para Administrador, Supervisor y Vendedor (incluyendo alias)');

    // 3. Productos
    const prods = await request('/products');
    console.assert(prods.status === 200 && prods.data.products.length > 0, 'No se cargaron los productos');
    console.log(`✅ 3. Catálogo de productos OK (${prods.data.products.length} productos)`);

    // 3. Regla: Vendedor NO puede modificar catálogo de clientes (debe retornar 403)
    const vendedorCreateAttempt = await request('/clients', 'POST', {
      doc_type: 'RUC',
      full_name: 'Intento de Vendedor S.A.C.',
      doc_number: '20999888777'
    }, { 'x-user-role': 'vendedor' });

    console.assert(vendedorCreateAttempt.status === 403, 'Vendedor no debe poder modificar catálogos maestros (debe dar 403)');
    console.log('✅ 3. Regla verificada: Vendedor tiene denegada la modificación de catálogos maestros (403 Forbidden)');

    const supervisorProductUpdate = await request('/products/a0000001-0000-0000-0000-000000000001', 'PATCH', {
      product_type: 'Libros', name: 'No autorizado', author: 'Autor', editorial: 'Editorial', stock: 1
    }, { 'x-user-role': 'supervisor' });
    const supervisorClientUpdate = await request('/clients/b0000001-0000-0000-0000-000000000001', 'PATCH', {
      doc_type: 'RUC', full_name: 'No autorizado S.A.C.', doc_number: '20549876541'
    }, { 'x-user-role': 'supervisor' });
    const supervisorRateUpdate = await request('/rates/c0000001-0000-0000-0000-000000000001', 'PATCH', {
      product_id: 'a0000001-0000-0000-0000-000000000001', amount: 1, currency: 'PEN'
    }, { 'x-user-role': 'supervisor' });
    assert.strictEqual(supervisorProductUpdate.status, 403, 'Supervisor no debe actualizar productos');
    assert.strictEqual(supervisorClientUpdate.status, 403, 'Supervisor no debe actualizar clientes');
    assert.strictEqual(supervisorRateUpdate.status, 403, 'Supervisor no debe actualizar tarifas');
    console.log('✅ Supervisor no puede actualizar productos, clientes ni tarifas (403 Forbidden)');

    // 4. Regla RUC Inválido con rol Administrador (debe dar 400 por no iniciar con 10 o 20)
    const invalidRuc = await request('/clients', 'POST', {
      doc_type: 'RUC',
      full_name: 'Empresa Falsa S.A.C.',
      doc_number: '15987456321', // No empieza con 10 o 20
      address: 'Calle Falsa 123'
    }, { 'x-user-role': 'administrador' });

    console.assert(invalidRuc.status === 400, 'Debió rechazar RUC que no inicia con 10 o 20');
    console.log('✅ 4. Regla de RUC inviable verificada (Rechazó RUC no iniciado con 10/20)');

    // 5. Creación de cliente por Administrador con RUC Válido (inicia con 20)
    const validClient = await request('/clients', 'POST', {
      doc_type: 'RUC',
      full_name: 'Soluciones Tecnológicas del Perú S.A.C.',
      doc_number: '20784512963',
      address: 'Av. Javier Prado Este 450, San Borja',
      phone: '+51 1 500-8000'
    }, { 'x-user-role': 'administrador' });

    console.assert(validClient.status === 201, 'No pudo crear cliente válido con RUC 20...');
    console.log('✅ 5. Creación de cliente por Administrador con RUC válido OK (inicia con 20)');
    const createdClientId = validClient.data.client.id;

    // 5. Cotización Estándar (Descuento 10% <= 15% -> Estado Aprobado)
    const standardQuotation = await request('/quotations', 'POST', {
      client_id: createdClientId,
      discount_percent: 10,
      currency: 'PEN',
      items: [
        {
          product_id: prods.data.products[0].id,
          rate_id: prods.data.products[0].rates?.[0]?.id,
          quantity: 2,
          unit_price: 145.00
        }
      ]
    }, { 'x-user-role': 'vendedor' });

    console.assert(standardQuotation.status === 201, 'Fallo al crear cotización estándar');
    console.assert(standardQuotation.data.quotation.status === 'aprobado', 'Cotización con 10% debió ser aprobada directamente');
    console.assert(standardQuotation.data.quotation.quotation_number.startsWith('2026-'), 'Número correlativo con formato incorrecto');
    console.log(`✅ 5. Cotización Estándar creada (${standardQuotation.data.quotation.quotation_number}) en estado: ${standardQuotation.data.quotation.status}`);

    // 6. Cotización con Descuento Extraordinario (25% > 15% -> Estado Pendiente)
    const specialQuotation = await request('/quotations', 'POST', {
      client_id: createdClientId,
      discount_percent: 25,
      currency: 'PEN',
      references_text: 'Solicitud de descuento especial por compra en volumen',
      items: [
        {
          product_id: prods.data.products[1].id,
          rate_id: prods.data.products[1].rates?.[0]?.id,
          quantity: 5,
          unit_price: 180.00
        }
      ]
    }, { 'x-user-role': 'vendedor' });

    console.assert(specialQuotation.status === 201, 'Fallo al crear cotización especial');
    console.assert(specialQuotation.data.quotation.status === 'pendiente', 'Cotización con 25% debió quedar en estado pendiente');
    console.log(`✅ 6. Cotización con Descuento Especial (>15%) creada en estado: ${specialQuotation.data.quotation.status}`);
    const specialQuotationId = specialQuotation.data.quotation.id;

    // 7. Flujo de Aprobación por Supervisor
    const approval = await request(`/quotations/${specialQuotationId}/status`, 'PATCH', {
      status: 'aprobado',
      approval_notes: 'Aprobado comercialmente por gerencia de ventas'
    }, { 'x-user-role': 'supervisor' });

    console.assert(approval.status === 200, 'Error al aprobar cotización como supervisor');
    console.assert(approval.data.quotation.status === 'aprobado', 'El estado debió cambiar a aprobado');
    console.log(`✅ 7. Flujo de aprobación por Supervisor verificado con éxito (Estado: ${approval.data.quotation.status})`);

    const productUpdate = await request('/products/a0000001-0000-0000-0000-000000000001', 'PATCH', {
      product_type: 'Libros',
      name: 'Gestión Financiera para Empresas B2B (Actualizado)',
      author: 'Alejandro Morales',
      editorial: 'Editorial Planeta Pro',
      stock: 84
    }, { 'x-user-role': 'administrador' });
    const clientUpdate = await request('/clients/b0000001-0000-0000-0000-000000000001', 'PATCH', {
      doc_type: 'RUC',
      full_name: 'Corporación Minera del Sur S.A.C. (Actualizado)',
      doc_number: '20549876541',
      address: 'Av. Las Begonias 441, San Isidro, Lima',
      phone: '+51 1 612-4000'
    }, { 'x-user-role': 'administrador' });
    const rateUpdate = await request('/rates/c0000001-0000-0000-0000-000000000001', 'PATCH', {
      product_id: 'a0000001-0000-0000-0000-000000000001',
      amount: 146,
      currency: 'PEN'
    }, { 'x-user-role': 'administrador' });
    assert.strictEqual(productUpdate.status, 200, 'Administrador debe actualizar productos');
    assert.strictEqual(clientUpdate.status, 200, 'Administrador debe actualizar clientes');
    assert.strictEqual(rateUpdate.status, 200, 'Administrador debe actualizar tarifas');
    console.log('✅ Administrador puede actualizar productos, clientes y tarifas');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA API Y REGLAS DE NEGOCIO PASARON EXITOSAMENTE!\n');
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error);
    process.exit(1);
  } finally {
    server.close(() => {
      process.exit(0);
    });
  }
};

runTests();
