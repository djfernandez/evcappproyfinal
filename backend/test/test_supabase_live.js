const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.SUPABASE_URL;
// Usamos SUPABASE_KEY (publishable key válida)
const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('========================================================');
console.log('🔍 PROBANDO CONEXIÓN DIRECTA A SUPABASE CLOUD');
console.log('========================================================');
console.log('📡 URL de Supabase:', url);
console.log('🔑 Key usada:', key ? key.substring(0, 16) + '...' : 'NO DEFINIDA');

if (!url || !key) {
  console.error('❌ Error: Falta SUPABASE_URL o SUPABASE_KEY en backend/.env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
  try {
    console.log('\n1. Verificando conectividad con Supabase Cloud...');
    const tables = ['profiles', 'products', 'clients', 'rates', 'quotations', 'quotation_items'];
    const results = {};

    for (const table of tables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(3);

      if (error) {
        results[table] = { status: 'ERROR', message: error.message, code: error.code };
      } else {
        results[table] = { status: 'OK', records: count !== null ? count : (data ? data.length : 0), sample: data };
      }
    }

    console.log('\n2. Resultado de verificación de tablas:');
    let allOk = true;
    for (const [table, res] of Object.entries(results)) {
      if (res.status === 'OK') {
        console.log(`   ✅ Tabla '${table}': Existe (${res.records} registros encontrados)`);
      } else {
        allOk = false;
        console.log(`   ⚠️ Tabla '${table}': ${res.message} (Código: ${res.code})`);
      }
    }

    if (allOk) {
      console.log('\n🎉 ¡CONEXIÓN A SUPABASE EXITOSA Y TODAS LAS TABLAS EXISTEN!');
    } else {
      console.log('\n⚠️ Conexión establecida pero algunas tablas aún no existen en tu base de datos Supabase.');
      console.log('👉 Recuerda ejecutar el script "backend/database/setup_all.sql" en el SQL Editor de tu proyecto Supabase.');
    }

  } catch (err) {
    console.error('❌ Error fatal al conectar con Supabase:', err.message);
  }
}

testConnection();
