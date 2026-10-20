const { supabase, isConfigured, memoryStore } = require('../config/supabase');
const crypto = require('crypto');

// Generador de correlativo anual en memoria (análogo al trigger SQL de Supabase)
const generateMemoryQuotationNumber = (dateStr) => {
  const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  if (!memoryStore.sequences[year]) {
    memoryStore.sequences[year] = 0;
  }
  memoryStore.sequences[year] += 1;
  const correlative = String(memoryStore.sequences[year]).padStart(4, '0');
  return `${year}-${correlative}`;
};

const getQuotations = async (req, res) => {
  try {
    const { status, client_id } = req.query;

    if (isConfigured) {
      let query = supabase
        .from('quotations')
        .select(`
          *,
          clients(*),
          profiles:created_by(id, full_name, email, role),
          quotation_items(
            *,
            products(id, name, product_type, stock),
            rates(id, amount, currency)
          )
        `);

      if (status) query = query.eq('status', status);
      if (client_id) query = query.eq('client_id', client_id);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) {
        return res.json({ success: true, quotations: data });
      }
    }

    // Modo local / memoria
    let list = [...memoryStore.quotations];
    if (status) {
      list = list.filter(q => q.status === status);
    }
    if (client_id) {
      list = list.filter(q => q.client_id === client_id);
    }

    // Enriquecer con datos de cliente, items y creador
    const enriched = list.map(q => {
      const client = memoryStore.clients.find(c => c.id === q.client_id);
      const creator = memoryStore.profiles.find(p => p.id === q.created_by);
      const items = (q.items || []).map(item => {
        const prod = memoryStore.products.find(p => p.id === item.product_id);
        const rate = memoryStore.rates.find(r => r.id === item.rate_id);
        return {
          ...item,
          products: prod || { name: 'Producto', product_type: '-' },
          rates: rate || { amount: item.unit_price, currency: q.currency }
        };
      });

      return {
        ...q,
        clients: client,
        profiles: creator,
        quotation_items: items
      };
    });

    res.json({ success: true, quotations: enriched });
  } catch (error) {
    console.error('Error listando cotizaciones:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar cotizaciones' });
  }
};

const getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (isConfigured) {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          clients(*),
          profiles:created_by(id, full_name, email, role),
          approver:approved_by(id, full_name, email),
          quotation_items(
            *,
            products(id, name, product_type, author, editorial, stock),
            rates(id, amount, currency)
          )
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        return res.json({ success: true, quotation: data });
      }
    }

    const q = memoryStore.quotations.find(item => item.id === id);
    if (!q) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    }

    const client = memoryStore.clients.find(c => c.id === q.client_id);
    const creator = memoryStore.profiles.find(p => p.id === q.created_by);
    const approver = q.approved_by ? memoryStore.profiles.find(p => p.id === q.approved_by) : null;
    const items = (q.items || []).map(item => {
      const prod = memoryStore.products.find(p => p.id === item.product_id);
      const rate = memoryStore.rates.find(r => r.id === item.rate_id);
      return {
        ...item,
        products: prod || { name: 'Producto', product_type: '-' },
        rates: rate || { amount: item.unit_price, currency: q.currency }
      };
    });

    res.json({
      success: true,
      quotation: {
        ...q,
        clients: client,
        profiles: creator,
        approver,
        quotation_items: items
      }
    });
  } catch (error) {
    console.error('Error obteniendo cotización:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar la cotización' });
  }
};

const createQuotation = async (req, res) => {
  try {
    const {
      client_id,
      quotation_date,
      due_date,
      references_text,
      discount_percent = 0,
      currency = 'PEN',
      items = []
    } = req.body;

    // Validaciones básicas
    if (!client_id) {
      return res.status(400).json({ success: false, message: 'El cliente es obligatorio.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'La cotización debe tener al menos un producto en el detalle.' });
    }

    // Validar ítems y stock
    let rawSubtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      const unitPrice = parseFloat(item.unit_price);

      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'La cantidad de cada ítem debe ser mayor a 0.' });
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ success: false, message: 'El precio unitario debe ser válido.' });
      }

      // Validar producto en memoria o supabase
      let product = memoryStore.products.find(p => p.id === item.product_id);
      if (isConfigured && !product) {
        const { data: dbProd } = await supabase.from('products').select('*').eq('id', item.product_id).single();
        product = dbProd;
      }

      if (!product) {
        return res.status(400).json({ success: false, message: `El producto ${item.product_id} no existe.` });
      }

      // Advertencia/Verificación de stock
      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para "${product.name}". Solicitado: ${quantity}, disponible: ${product.stock}.`
        });
      }

      const itemSubtotal = parseFloat((quantity * unitPrice).toFixed(2));
      rawSubtotal += itemSubtotal;

      processedItems.push({
        product_id: item.product_id,
        rate_id: item.rate_id || null,
        quantity,
        unit_price: unitPrice,
        subtotal: itemSubtotal
      });
    }

    // Regla de Negocio: Lógica de Descuentos
    // Descuento estándar máximo: 15%. Si supera 15%, requiere aprobación de supervisor.
    const discPercent = parseFloat(discount_percent) || 0;
    const discountAmount = parseFloat(((rawSubtotal * discPercent) / 100).toFixed(2));
    const baseAfterDiscount = parseFloat((rawSubtotal - discountAmount).toFixed(2));

    // Cálculo de IGV (18%) y Total
    const igv = parseFloat((baseAfterDiscount * 0.18).toFixed(2));
    const total = parseFloat((baseAfterDiscount + igv).toFixed(2));

    // REGLA: Descuentos fuera de rango (> 15%) generan automáticamente solicitud en flujo de aprobaciones (pendiente)
    const requiresApproval = discPercent > 15;
    const status = requiresApproval ? 'pendiente' : 'aprobado';

    const qDate = quotation_date || new Date().toISOString().split('T')[0];
    const qDueDate = due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    const creatorId = req.user?.id || '11111111-1111-1111-1111-111111111111';

    if (isConfigured) {
      // Inserción en Supabase con generación segura de correlativo anual YYYY-0001
      const currentYear = new Date(qDate).getFullYear();
      let quotationNumber = null;
      try {
        const { data: latestQuote } = await supabase
          .from('quotations')
          .select('quotation_number')
          .like('quotation_number', `${currentYear}-%`)
          .order('quotation_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextNum = 1;
        if (latestQuote && latestQuote.quotation_number) {
          const parts = latestQuote.quotation_number.split('-');
          if (parts.length === 2) {
            const parsed = parseInt(parts[1], 10);
            if (!isNaN(parsed)) nextNum = parsed + 1;
          }
        }
        quotationNumber = `${currentYear}-${String(nextNum).padStart(4, '0')}`;
      } catch (seqErr) {
        console.warn('Aviso: Calculando correlativo base:', seqErr.message);
      }

      const insertPayload = {
        client_id,
        quotation_date: qDate,
        due_date: qDueDate,
        references_text: references_text || '',
        subtotal: rawSubtotal,
        discount_percent: discPercent,
        discount_amount: discountAmount,
        igv,
        total,
        status,
        currency,
        created_by: creatorId
      };
      if (quotationNumber) {
        insertPayload.quotation_number = quotationNumber;
      }

      const { data: quotation, error: qErr } = await supabase
        .from('quotations')
        .insert([insertPayload])
        .select()
        .single();

      if (qErr) throw qErr;

      // Insertar detalle
      const itemsToInsert = processedItems.map(it => ({
        ...it,
        quotation_id: quotation.id
      }));

      const { error: itemsErr } = await supabase.from('quotation_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      return res.status(201).json({
        success: true,
        message: requiresApproval
          ? 'Cotización creada en estado PENDIENTE. Requiere aprobación de supervisor por descuento extraordinario (> 15%).'
          : 'Cotización creada y APROBADA exitosamente.',
        quotation: {
          ...quotation,
          items: processedItems,
          requires_approval: requiresApproval
        }
      });
    }

    // Modo local / memoria
    const quotationNumber = generateMemoryQuotationNumber(qDate);
    const newQuotationId = crypto.randomUUID();

    const createdItems = processedItems.map(it => ({
      id: crypto.randomUUID(),
      quotation_id: newQuotationId,
      ...it
    }));

    const newQuotation = {
      id: newQuotationId,
      client_id,
      quotation_number: quotationNumber,
      quotation_date: qDate,
      due_date: qDueDate,
      references_text: references_text || '',
      subtotal: rawSubtotal,
      discount_percent: discPercent,
      discount_amount: discountAmount,
      igv,
      total,
      status,
      currency,
      created_by: creatorId,
      created_at: new Date().toISOString(),
      items: createdItems
    };

    memoryStore.quotations.unshift(newQuotation);

    res.status(201).json({
      success: true,
      message: requiresApproval
        ? 'Cotización creada en estado PENDIENTE. Requiere aprobación de supervisor por descuento extraordinario (> 15%).'
        : 'Cotización creada y APROBADA exitosamente.',
      quotation: {
        ...newQuotation,
        requires_approval: requiresApproval
      }
    });
  } catch (error) {
    console.error('Error creando cotización:', error);
    res.status(500).json({ success: false, message: error.message || 'Error interno al registrar cotización' });
  }
};

// Flujo de Aprobación para Supervisores
const updateQuotationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approval_notes } = req.body;

    if (!['aprobado', 'rechazado'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'El estado solo puede cambiar a "aprobado" o "rechazado".'
      });
    }

    const approverId = req.user?.id || '22222222-2222-2222-2222-222222222222';

    if (isConfigured) {
      const { data, error } = await supabase
        .from('quotations')
        .update({
          status,
          approved_by: approverId,
          approval_notes: approval_notes || `Evaluado por supervisor en ${new Date().toLocaleString()}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: `Cotización ${status} con éxito.`, quotation: data });
    }

    const q = memoryStore.quotations.find(item => item.id === id);
    if (!q) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada.' });
    }

    q.status = status;
    q.approved_by = approverId;
    q.approval_notes = approval_notes || `Evaluado por supervisor en ${new Date().toLocaleString()}`;
    q.updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: `Cotización ${status} con éxito por el supervisor.`,
      quotation: q
    });
  } catch (error) {
    console.error('Error actualizando estado de cotización:', error);
    res.status(500).json({ success: false, message: 'Error interno al actualizar estado' });
  }
};

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotationStatus
};
