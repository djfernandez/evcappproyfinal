const { supabase, isConfigured, memoryStore } = require('../config/supabase');
const crypto = require('crypto');

const getRates = async (req, res) => {
  try {
    const { product_id } = req.query;

    if (isConfigured) {
      let query = supabase.from('rates').select('*, products(name, product_type)');
      if (product_id) query = query.eq('product_id', product_id);
      const { data, error } = await query;
      if (!error && data) {
        const enriched = data.map(r => ({
          ...r,
          product_name: r.products ? r.products.name : 'Desconocido',
          product_type: r.products ? r.products.product_type : '-'
        }));
        return res.json({ success: true, rates: enriched });
      }
    }

    let rates = [...memoryStore.rates];
    if (product_id) {
      rates = rates.filter(r => r.product_id === product_id);
    }

    const enriched = rates.map(r => {
      const prod = memoryStore.products.find(p => p.id === r.product_id);
      return {
        ...r,
        product_name: prod ? prod.name : 'Desconocido',
        product_type: prod ? prod.product_type : '-'
      };
    });

    res.json({ success: true, rates: enriched });
  } catch (error) {
    console.error('Error obteniendo tarifas:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar tarifas' });
  }
};

const createRate = async (req, res) => {
  try {
    const { product_id, amount, currency = 'PEN' } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'El id del producto es obligatorio.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ success: false, message: 'El monto de la tarifa debe ser un valor positivo.' });
    }

    if (!['PEN', 'USD'].includes(currency)) {
      return res.status(400).json({ success: false, message: 'La moneda debe ser PEN o USD.' });
    }

    if (isConfigured) {
      const { data, error } = await supabase
        .from('rates')
        .insert([{ product_id, amount: numAmount, currency }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, rate: data });
    }

    const newRate = {
      id: crypto.randomUUID(),
      product_id,
      amount: numAmount,
      currency,
      created_at: new Date().toISOString()
    };

    memoryStore.rates.push(newRate);
    res.status(201).json({ success: true, rate: newRate });
  } catch (error) {
    console.error('Error registrando tarifa:', error);
    res.status(500).json({ success: false, message: 'Error interno al registrar tarifa' });
  }
};

module.exports = {
  getRates,
  createRate
};
