const { supabase, isConfigured, memoryStore } = require('../config/supabase');
const crypto = require('crypto');

const validateClient = ({ doc_type, full_name, doc_number }) => {
  if (!['DNI', 'RUC'].includes(doc_type)) return 'Tipo de documento inválido. Debe ser DNI o RUC.';
  if (typeof full_name !== 'string' || full_name.trim().length < 3) {
    return 'El nombre completo o razón social es obligatorio (mínimo 3 caracteres).';
  }
  const cleanDoc = typeof doc_number === 'string' ? doc_number.trim() : '';
  if (!cleanDoc || cleanDoc.length > 15) {
    return 'El número de documento es obligatorio y debe tener como máximo 15 caracteres.';
  }
  if (doc_type === 'RUC' && !/^(10|20)[0-9]{9}$/.test(cleanDoc)) {
    return 'El RUC debe constar de 11 dígitos numéricos que comiencen con 10 o 20.';
  }
  if (doc_type === 'DNI' && !/^[0-9]{8}$/.test(cleanDoc)) {
    return 'El DNI debe constar exactamente de 8 dígitos numéricos.';
  }
  return null;
};

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
    const validationError = validateClient({ doc_type, full_name, doc_number });
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const cleanDoc = doc_number.trim();

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

const updateClient = async (req, res) => {
  try {
    const { doc_type, full_name, doc_number, address, phone } = req.body;
    const validationError = validateClient({ doc_type, full_name, doc_number });
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const cleanDoc = doc_number.trim();

    const updates = {
      doc_type,
      full_name: full_name.trim(),
      doc_number: cleanDoc,
      address: address || '',
      phone: phone || ''
    };

    if (isConfigured) {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
      return res.json({ success: true, client: data });
    }

    const client = memoryStore.clients.find(item => item.id === req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
    Object.assign(client, updates);
    res.json({ success: true, client });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({ success: false, message: 'Error interno al actualizar cliente' });
  }
};

module.exports = {
  getClients,
  createClient,
  updateClient
};
