const { supabase, isConfigured, memoryStore } = require('../config/supabase');
const crypto = require('crypto');

const getProducts = async (req, res) => {
  try {
    const { type, search } = req.query;

    if (isConfigured) {
      let query = supabase.from('products').select('*, rates(*)');
      if (type) query = query.eq('product_type', type);
      if (search) query = query.ilike('name', `%${search}%`);

      const { data, error } = await query.order('name');
      if (!error && data) {
        const enriched = data.map(prod => {
          const rateObj = (prod.rates && prod.rates.length > 0) ? prod.rates[0] : null;
          return {
            ...prod,
            rate: rateObj ? parseFloat(rateObj.amount) : null,
            rate_id: rateObj ? rateObj.id : null,
            currency: rateObj ? rateObj.currency : 'PEN'
          };
        });
        return res.json({ success: true, products: enriched });
      }
    }

    let products = [...memoryStore.products];
    if (type) {
      products = products.filter(p => p.product_type.toLowerCase() === type.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        p => p.name.toLowerCase().includes(q) ||
             p.author.toLowerCase().includes(q) ||
             p.editorial.toLowerCase().includes(q)
      );
    }

    // Unir con las tarifas
    const enriched = products.map(prod => {
      const rate = memoryStore.rates.find(r => r.product_id === prod.id);
      return {
        ...prod,
        rate: rate ? rate.amount : null,
        currency: rate ? rate.currency : 'PEN',
        rates: rate ? [rate] : []
      };
    });

    res.json({ success: true, products: enriched });
  } catch (error) {
    console.error('Error listando productos:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar productos' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { product_type, name, author, editorial, stock, initial_rate, currency = 'PEN' } = req.body;

    // Validación de campos mínimos
    const validTypes = ['Libros', 'Revistas', 'Pruebas'];
    if (!validTypes.includes(product_type)) {
      return res.status(400).json({
        success: false,
        message: `El tipo de producto debe ser uno de: ${validTypes.join(', ')}`
      });
    }

    if (!name || !author || !editorial) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, autor y editorial son campos obligatorios.'
      });
    }

    const stockNumber = parseInt(stock, 10);
    if (isNaN(stockNumber) || stockNumber < 0) {
      return res.status(400).json({
        success: false,
        message: 'El stock actual debe ser un número entero mayor o igual a 0.'
      });
    }

    if (isConfigured) {
      const { data: newProd, error: prodErr } = await supabase
        .from('products')
        .insert([{ product_type, name, author, editorial, stock: stockNumber }])
        .select()
        .single();

      if (prodErr) throw prodErr;

      if (initial_rate) {
        await supabase
          .from('rates')
          .insert([{ product_id: newProd.id, amount: parseFloat(initial_rate), currency }]);
      }

      return res.status(201).json({ success: true, product: newProd });
    }

    // Modo local / memoria
    const newProduct = {
      id: crypto.randomUUID(),
      product_type,
      name,
      author,
      editorial,
      stock: stockNumber,
      created_at: new Date().toISOString()
    };

    memoryStore.products.push(newProduct);

    if (initial_rate) {
      const newRate = {
        id: crypto.randomUUID(),
        product_id: newProduct.id,
        amount: parseFloat(initial_rate),
        currency
      };
      memoryStore.rates.push(newRate);
    }

    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ success: false, message: 'Error interno al registrar producto' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { product_type, name, author, editorial, stock } = req.body;
    const validTypes = ['Libros', 'Revistas', 'Pruebas'];
    const stockNumber = Number(stock);

    if (!validTypes.includes(product_type)) {
      return res.status(400).json({ success: false, message: `El tipo de producto debe ser uno de: ${validTypes.join(', ')}` });
    }
    if (![name, author, editorial].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ success: false, message: 'Nombre, autor y editorial son campos obligatorios.' });
    }
    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
      return res.status(400).json({ success: false, message: 'El stock actual debe ser un número entero mayor o igual a 0.' });
    }

    const updates = {
      product_type,
      name: name.trim(),
      author: author.trim(),
      editorial: editorial.trim(),
      stock: stockNumber
    };

    if (isConfigured) {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
      return res.json({ success: true, product: data });
    }

    const product = memoryStore.products.find(item => item.id === req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    Object.assign(product, updates);
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({ success: false, message: 'Error interno al actualizar producto' });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct
};
