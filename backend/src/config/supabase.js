const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isConfigured = false;

if (
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_URL.includes('tu-proyecto') &&
  SUPABASE_URL.startsWith('http')
) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    isConfigured = true;
    console.log('✅ Supabase conectado a:', SUPABASE_URL);
  } catch (err) {
    console.warn('⚠️ No se pudo inicializar cliente Supabase:', err.message);
  }
} else {
  console.log('ℹ️ Supabase no configurado con credenciales remotas. Activando motor de almacenamiento de respaldo local/MVP.');
}

// Almacén en memoria persistente para el modo MVP/Demo cuando no hay conexión a Supabase
const memoryStore = {
  profiles: [
    { id: '11111111-1111-1111-1111-111111111111', email: 'vendedor@nexussac.pe', full_name: 'Carlos Mendoza (Ventas)', role: 'vendedor' },
    { id: '22222222-2222-2222-2222-222222222222', email: 'supervisor@nexussac.pe', full_name: 'Elena Ramos (Supervisora Comercial)', role: 'supervisor' },
    { id: '33333333-3333-3333-3333-333333333333', email: 'admin@nexussac.pe', full_name: 'Administrador Nexus SAC', role: 'administrador' }
  ],
  products: [
    { id: 'a0000001-0000-0000-0000-000000000001', product_type: 'Libros', name: 'Gestión Financiera para Empresas B2B', author: 'Alejandro Morales', editorial: 'Editorial Planeta Pro', stock: 85 },
    { id: 'a0000002-0000-0000-0000-000000000002', product_type: 'Libros', name: 'Metodologías Ágiles y Scrum en Negocios', author: 'Mariana Torres', editorial: 'O\'Reilly Hispano', stock: 120 },
    { id: 'a0000003-0000-0000-0000-000000000003', product_type: 'Libros', name: 'Derecho Tributario y Regulación SUNAT', author: 'Dr. Jorge Benavides', editorial: 'Gaceta Jurídica', stock: 45 },
    { id: 'a0000004-0000-0000-0000-000000000004', product_type: 'Revistas', name: 'Revista Business Tech Perú - Edición 2026', author: 'Comité Editorial Nexus', editorial: 'Nexus Publishing', stock: 250 },
    { id: 'a0000005-0000-0000-0000-000000000005', product_type: 'Revistas', name: 'Harvard Deusto Marketing & Ventas', author: 'Varios Autores', editorial: 'Deusto Ediciones', stock: 110 },
    { id: 'a0000006-0000-0000-0000-000000000006', product_type: 'Pruebas', name: 'Batería de Evaluación Psicométrica B2B-Pro', author: 'Instituto de Psicometría', editorial: 'Nexus Psicometría', stock: 60 },
    { id: 'a0000007-0000-0000-0000-000000000007', product_type: 'Pruebas', name: 'Test de Competencias Comerciales y Liderazgo', author: 'Dra. Sofía Valenzuela', editorial: 'Talent Metrics', stock: 95 }
  ],
  clients: [
    { id: 'b0000001-0000-0000-0000-000000000001', doc_type: 'RUC', full_name: 'Corporación Minera del Sur S.A.C.', doc_number: '20549876541', address: 'Av. Las Begonias 441, San Isidro, Lima', phone: '+51 1 612-4000' },
    { id: 'b0000002-0000-0000-0000-000000000002', doc_type: 'RUC', full_name: 'Distribuidora Logística Andina E.I.R.L.', doc_number: '20601234567', address: 'Jr. Los Ficus 820, Surquillo, Lima', phone: '+51 1 445-8921' },
    { id: 'b0000003-0000-0000-0000-000000000003', doc_type: 'RUC', full_name: 'Consultora Financiera Salazar & Asociados', doc_number: '10458923145', address: 'Av. Benavides 1570 Of. 602, Miraflores', phone: '+51 987 654 321' },
    { id: 'b0000004-0000-0000-0000-000000000004', doc_type: 'DNI', full_name: 'Roberto Carlos Díaz Peña', doc_number: '45891234', address: 'Calle Los Sauces 142, La Molina', phone: '+51 998 123 456' }
  ],
  rates: [
    { id: 'c0000001-0000-0000-0000-000000000001', product_id: 'a0000001-0000-0000-0000-000000000001', amount: 145.00, currency: 'PEN' },
    { id: 'c0000002-0000-0000-0000-000000000002', product_id: 'a0000002-0000-0000-0000-000000000002', amount: 180.00, currency: 'PEN' },
    { id: 'c0000003-0000-0000-0000-000000000003', product_id: 'a0000003-0000-0000-0000-000000000003', amount: 220.00, currency: 'PEN' },
    { id: 'c0000004-0000-0000-0000-000000000004', product_id: 'a0000004-0000-0000-0000-000000000004', amount: 65.00, currency: 'PEN' },
    { id: 'c0000005-0000-0000-0000-000000000005', product_id: 'a0000005-0000-0000-0000-000000000005', amount: 85.00, currency: 'PEN' },
    { id: 'c0000006-0000-0000-0000-000000000006', product_id: 'a0000006-0000-0000-0000-000000000006', amount: 450.00, currency: 'PEN' },
    { id: 'c0000007-0000-0000-0000-000000000007', product_id: 'a0000007-0000-0000-0000-000000000007', amount: 380.00, currency: 'PEN' }
  ],
  quotations: [
    {
      id: 'd0000001-0000-0000-0000-000000000001',
      client_id: 'b0000001-0000-0000-0000-000000000001',
      quotation_number: '2026-0001',
      quotation_date: '2026-10-18',
      due_date: '2026-11-02',
      references_text: 'Capacitación anual del departamento contable',
      subtotal: 1450.00,
      discount_percent: 5.00,
      discount_amount: 72.50,
      igv: 247.95,
      total: 1625.45,
      status: 'aprobado',
      currency: 'PEN',
      created_by: '11111111-1111-1111-1111-111111111111',
      created_at: new Date().toISOString(),
      items: [
        {
          id: 'e0000001-0000-0000-0000-000000000001',
          product_id: 'a0000001-0000-0000-0000-000000000001',
          rate_id: 'c0000001-0000-0000-0000-000000000001',
          quantity: 10,
          unit_price: 145.00,
          subtotal: 1450.00
        }
      ]
    },
    {
      id: 'd0000002-0000-0000-0000-000000000002',
      client_id: 'b0000002-0000-0000-0000-000000000002',
      quotation_number: '2026-0002',
      quotation_date: '2026-10-19',
      due_date: '2026-10-29',
      references_text: 'Pedido corporativo por volumen (Descuento especial 25% > 15% solicitado)',
      subtotal: 4500.00,
      discount_percent: 25.00,
      discount_amount: 1125.00,
      igv: 607.50,
      total: 3982.50,
      status: 'pendiente',
      currency: 'PEN',
      created_by: '11111111-1111-1111-1111-111111111111',
      created_at: new Date().toISOString(),
      items: [
        {
          id: 'e0000002-0000-0000-0000-000000000002',
          product_id: 'a0000006-0000-0000-0000-000000000006',
          rate_id: 'c0000006-0000-0000-0000-000000000006',
          quantity: 10,
          unit_price: 450.00,
          subtotal: 4500.00
        }
      ]
    }
  ],
  sequences: {
    2026: 2
  }
};

module.exports = {
  supabase,
  isConfigured,
  memoryStore
};
