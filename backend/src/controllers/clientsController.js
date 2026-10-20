const { supabase, isConfigured, memoryStore } = require('../config/supabase');
const crypto = require('crypto');

const getClients = async (req, res) => {
  try {
    const { search } = req.query;

    if (isConfigured) {
      let query = supabase.from('clients').select('*');
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,doc_number.ilike.%${search}%`);
      }
      const { data, error } = await query.order('full_name');
      if (!error && data) {
        return res.json({ success: true, clients: data });
      }
    }

    let clients = [...memoryStore.clients];
    if (search) {
      const q = search.toLowerCase();
      clients = clients.filter(
        c => c.full_name.toLowerCase().includes(q) || c.doc_number.includes(q)
      );
    }

    res.json({ success: true, clients });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar clientes' });
  }
};

const createClient = async (req, res) => {
  try {
    const { doc_type, full_name, doc_number, address, phone } = req.body;

    // 1. Validar tipo de documento
    if (!['DNI', 'RUC'].includes(doc_type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de documento inválido. Debe ser DNI o RUC.'
      });
    }

    // 2. Validar nombre / razón social
    if (!full_name || full_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'El nombre completo o razón social es obligatorio (mínimo 3 caracteres).'
      });
    }

    // 3. Validar longitud máxima de 15 caracteres
    const cleanDoc = (doc_number || '').trim();
    if (!cleanDoc || cleanDoc.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'El número de documento es obligatorio y debe tener como máximo 15 caracteres.'
      });
    }

    // 4. Regla de Negocio Específica: RUC debe iniciar con 10 o 20
    if (doc_type === 'RUC') {
      const rucRegex = /^(10|20)[0-9]{9}$/;
      if (!cleanDoc.startsWith('10') && !cleanDoc.startsWith('20')) {
        return res.status(400).json({
          success: false,
          message: 'Regla de negocio: El número de RUC debe iniciar obligatoriamente con 10 o 20.'
        });
      }
      if (!rucRegex.test(cleanDoc)) {
        return res.status(400).json({
          success: false,
          message: 'El RUC debe constar de 11 dígitos numéricos que comiencen con 10 o 20.'
        });
      }
    }

    // 5. Validación para DNI (8 dígitos numéricos)
    if (doc_type === 'DNI') {
      const dniRegex = /^[0-9]{8}$/;
      if (!dniRegex.test(cleanDoc)) {
        return res.status(400).json({
          success: false,
          message: 'El DNI debe constar exactamente de 8 dígitos numéricos.'
        });
      }
    }

    if (isConfigured) {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          doc_type,
          full_name: full_name.trim(),
          doc_number: cleanDoc,
          address: address || '',
          phone: phone || ''
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, client: data });
    }

    // Modo local / memoria
    const newClient = {
      id: crypto.randomUUID(),
      doc_type,
      full_name: full_name.trim(),
      doc_number: cleanDoc,
      address: address || '',
      phone: phone || '',
      created_at: new Date().toISOString()
    };

    memoryStore.clients.push(newClient);
    res.status(201).json({ success: true, client: newClient });
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ success: false, message: 'Error interno al registrar cliente' });
  }
};

module.exports = {
  getClients,
  createClient
};
