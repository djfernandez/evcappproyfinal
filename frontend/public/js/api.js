// ==========================================================
// NEXUS SAC - CLIENTE DE API HTTP Y PROVEEDOR DEMO / OFFLINE
// ==========================================================
// Soporta conexión a backend Node.js real (local o en la nube)
// y fallback automático interactivo para GitHub Pages / Modo Demo.

(function() {
  // Datos Semilla Oficiales (sincronizados con backend/database/04_seed_data.sql)
  const INITIAL_USERS = [
    { id: '11111111-1111-1111-1111-111111111111', email: 'vendedor@nexussac.pe', full_name: 'Carlos Mendoza (Ventas)', role: 'vendedor' },
    { id: '22222222-2222-2222-2222-222222222222', email: 'supervisor@nexussac.pe', full_name: 'Elena Ramos (Supervisora Comercial)', role: 'supervisor' },
    { id: '33333333-3333-3333-3333-333333333333', email: 'admin@nexussac.pe', full_name: 'Administrador Nexus SAC', role: 'administrador' }
  ];

  const INITIAL_PRODUCTS = [
    { id: 'a0000001-0000-0000-0000-000000000001', product_type: 'Libros', name: 'Gestión Financiera para Empresas B2B', author: 'Alejandro Morales', editorial: 'Editorial Planeta Pro', stock: 85, rate: 145.00, currency: 'PEN', rate_id: 'c0000001-0000-0000-0000-000000000001' },
    { id: 'a0000002-0000-0000-0000-000000000002', product_type: 'Libros', name: 'Metodologías Ágiles y Scrum en Negocios', author: 'Mariana Torres', editorial: "O'Reilly Hispano", stock: 120, rate: 180.00, currency: 'PEN', rate_id: 'c0000002-0000-0000-0000-000000000002' },
    { id: 'a0000003-0000-0000-0000-000000000003', product_type: 'Libros', name: 'Derecho Tributario y Regulación SUNAT', author: 'Dr. Jorge Benavides', editorial: 'Gaceta Jurídica', stock: 45, rate: 220.00, currency: 'PEN', rate_id: 'c0000003-0000-0000-0000-000000000003' },
    { id: 'a0000004-0000-0000-0000-000000000004', product_type: 'Revistas', name: 'Revista Business Tech Perú - Edición 2026', author: 'Comité Editorial Nexus', editorial: 'Nexus Publishing', stock: 250, rate: 65.00, currency: 'PEN', rate_id: 'c0000004-0000-0000-0000-000000000004' },
    { id: 'a0000005-0000-0000-0000-000000000005', product_type: 'Revistas', name: 'Harvard Deusto Marketing & Ventas', author: 'Varios Autores', editorial: 'Deusto Ediciones', stock: 110, rate: 85.00, currency: 'PEN', rate_id: 'c0000005-0000-0000-0000-000000000005' },
    { id: 'a0000006-0000-0000-0000-000000000006', product_type: 'Pruebas', name: 'Batería de Evaluación Psicométrica B2B-Pro', author: 'Instituto de Psicometría', editorial: 'Nexus Psicometría', stock: 60, rate: 450.00, currency: 'PEN', rate_id: 'c0000006-0000-0000-0000-000000000006' },
    { id: 'a0000007-0000-0000-0000-000000000007', product_type: 'Pruebas', name: 'Test de Competencias Comerciales y Liderazgo', author: 'Dra. Sofía Valenzuela', editorial: 'Talent Metrics', stock: 95, rate: 380.00, currency: 'PEN', rate_id: 'c0000007-0000-0000-0000-000000000007' }
  ];

  const INITIAL_CLIENTS = [
    { id: 'b0000001-0000-0000-0000-000000000001', doc_type: 'RUC', full_name: 'Corporación Minera del Sur S.A.C.', doc_number: '20549876541', address: 'Av. Las Begonias 441, San Isidro, Lima', phone: '+51 1 612-4000' },
    { id: 'b0000002-0000-0000-0000-000000000002', doc_type: 'RUC', full_name: 'Distribuidora Logística Andina E.I.R.L.', doc_number: '20601234567', address: 'Jr. Los Ficus 820, Surquillo, Lima', phone: '+51 1 445-8921' },
    { id: 'b0000003-0000-0000-0000-000000000003', doc_type: 'RUC', full_name: 'Consultora Financiera Salazar & Asociados', doc_number: '10458923145', address: 'Av. Benavides 1570 Of. 602, Miraflores', phone: '+51 987 654 321' },
    { id: 'b0000004-0000-0000-0000-000000000004', doc_type: 'DNI', full_name: 'Roberto Carlos Díaz Peña', doc_number: '45891234', address: 'Calle Los Sauces 142, La Molina', phone: '+51 998 123 456' }
  ];

  const INITIAL_RATES = INITIAL_PRODUCTS.map((p, idx) => ({
    id: p.rate_id,
    product_id: p.id,
    amount: p.rate,
    currency: p.currency,
    created_at: new Date().toISOString(),
    products: { name: p.name, product_type: p.product_type }
  }));

  const INITIAL_QUOTATIONS = [
    {
      id: 'd0000001-0000-0000-0000-000000000001',
      client_id: 'b0000001-0000-0000-0000-000000000001',
      quotation_number: '2026-0001',
      quotation_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      references_text: 'Capacitación anual del departamento contable',
      subtotal: 1450.00,
      discount_percent: 5.00,
      discount_amount: 72.50,
      igv: 247.95,
      total: 1625.45,
      status: 'aprobado',
      currency: 'PEN',
      created_by: '11111111-1111-1111-1111-111111111111',
      clients: INITIAL_CLIENTS[0],
      items: [
        {
          product_id: 'a0000001-0000-0000-0000-000000000001',
          product_name: 'Gestión Financiera para Empresas B2B',
          quantity: 10,
          unit_price: 145.00,
          subtotal: 1450.00,
          products: { name: 'Gestión Financiera para Empresas B2B', product_type: 'Libros' }
        }
      ]
    },
    {
      id: 'd0000002-0000-0000-0000-000000000002',
      client_id: 'b0000002-0000-0000-0000-000000000002',
      quotation_number: '2026-0002',
      quotation_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      references_text: 'Pedido corporativo por volumen de pruebas psicométricas (Descuento 25% solicitado)',
      subtotal: 4500.00,
      discount_percent: 25.00,
      discount_amount: 1125.00,
      igv: 607.50,
      total: 3982.50,
      status: 'pendiente',
      currency: 'PEN',
      created_by: '11111111-1111-1111-1111-111111111111',
      clients: INITIAL_CLIENTS[1],
      items: [
        {
          product_id: 'a0000006-0000-0000-0000-000000000006',
          product_name: 'Batería de Evaluación Psicométrica B2B-Pro',
          quantity: 10,
          unit_price: 450.00,
          subtotal: 4500.00,
          products: { name: 'Batería de Evaluación Psicométrica B2B-Pro', product_type: 'Pruebas' }
        }
      ]
    }
  ];

  // Gestor de persistencia Mock en LocalStorage
  const MockDB = {
    getKey(name) { return `nexus_mock_${name}`; },
    get(name, defaultVal) {
      const raw = localStorage.getItem(this.getKey(name));
      if (!raw) {
        this.set(name, defaultVal);
        return JSON.parse(JSON.stringify(defaultVal));
      }
      try {
        return JSON.parse(raw);
      } catch (e) {
        return JSON.parse(JSON.stringify(defaultVal));
      }
    },
    set(name, val) {
      localStorage.setItem(this.getKey(name), JSON.stringify(val));
    },
    init() {
      if (!localStorage.getItem(this.getKey('products'))) this.set('products', INITIAL_PRODUCTS);
      if (!localStorage.getItem(this.getKey('clients'))) this.set('clients', INITIAL_CLIENTS);
      if (!localStorage.getItem(this.getKey('rates'))) this.set('rates', INITIAL_RATES);
      if (!localStorage.getItem(this.getKey('quotations'))) this.set('quotations', INITIAL_QUOTATIONS);
      if (!localStorage.getItem(this.getKey('users'))) this.set('users', INITIAL_USERS);
    }
  };

  MockDB.init();

  const supabaseConfig = window.NEXUS_SUPABASE_CONFIG;
  const hasSupabaseConfig = Boolean(supabaseConfig?.url && supabaseConfig?.anonKey);
  const supabaseClient = hasSupabaseConfig && window.supabase?.createClient
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;

  if (supabaseClient) window.SupabaseClient = supabaseClient;

  async function getSupabaseData(query) {
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async function getCurrentSupabaseUser() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
    return data.session.user;
  }

  // Detección de entorno
  const isGitHubPages = window.location.hostname.includes('github.io');
  const customApiUrl = localStorage.getItem('nexus_api_base_url');

  let defaultBaseUrl = '/api';
  if (customApiUrl) {
    defaultBaseUrl = customApiUrl;
  } else if (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) {
    defaultBaseUrl = window.location.port === '5000' ? 'http://localhost:3000/api' : '/api';
  }

  // Notificar al usuario una sola vez si está en modo demo GitHub Pages
  let mockModeNoticeShown = false;
  function notifyMockMode(reason = 'GitHub Pages / Sin Backend') {
    if (!mockModeNoticeShown && window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(`Modo Demo Interactivo Activo (${reason})`, 'info');
      mockModeNoticeShown = true;
    }
  }

  window.API = {
    baseUrl: defaultBaseUrl,
    usesSupabase: Boolean(supabaseClient),
    forceMockMode: isGitHubPages && !customApiUrl && !hasSupabaseConfig,

    async restoreSession() {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw new Error(error.message);
      if (!data.session) {
        localStorage.removeItem('nexus_user');
        localStorage.removeItem('nexus_token');
        return null;
      }

      const profile = await getSupabaseData(
        supabaseClient.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle()
      );
      if (!profile) {
        await supabaseClient.auth.signOut();
        localStorage.removeItem('nexus_user');
        localStorage.removeItem('nexus_token');
        throw new Error('Tu cuenta de Supabase Auth no tiene un perfil de Nexus asignado.');
      }
      return profile;
    },

    setBackendUrl(url) {
      if (!url) {
        localStorage.removeItem('nexus_api_base_url');
        this.baseUrl = defaultBaseUrl;
      } else {
        localStorage.setItem('nexus_api_base_url', url);
        this.baseUrl = url;
      }
    },

    getHeaders() {
      const user = window.Auth ? window.Auth.getCurrentUser() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        headers['x-user-id'] = user.id;
        headers['x-user-role'] = user.role;
        const token = localStorage.getItem('nexus_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
    },

    async request(endpoint, options = {}) {
      if (hasSupabaseConfig && !supabaseClient) {
        throw new Error('No se pudo cargar el SDK de Supabase. Recarga la página o revisa la conexión.');
      }
      // Si estamos forzados en Mock Mode (ej. GitHub Pages sin URL remota)
      if (this.forceMockMode) {
        notifyMockMode('GitHub Pages');
        return this.handleMockRequest(endpoint, options);
      }

      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {})
        }
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout
        config.signal = controller.signal;

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Error en servidor: ${response.status}`);
        }
        return data;
      } catch (error) {
        console.warn(`[Nexus API] Error conectando a ${url}. Activando fallback a Mock Store...`, error.message);
        notifyMockMode('Servidor desconectado');
        return this.handleMockRequest(endpoint, options);
      }
    },

    // ========================================================
    // SIMULADOR COMPLETO DE SERVICIOS REST (MOCK STORE)
    // ========================================================
    async handleMockRequest(endpoint, options = {}) {
      const method = (options.method || 'GET').toUpperCase();
      const body = options.body ? JSON.parse(options.body) : {};
      const cleanEndpoint = endpoint.split('?')[0];
      const requireMockAdmin = () => {
        if (window.Auth?.getCurrentUser()?.role !== 'administrador') {
          throw new Error('Acceso denegado. Solo un administrador puede modificar catálogos.');
        }
      };

      // 1. Auth: Login
      if (cleanEndpoint === '/auth/login' && method === 'POST') {
        const users = MockDB.get('users', INITIAL_USERS);
        const user = users.find(u => u.email.toLowerCase() === body.email?.toLowerCase()) || {
          id: 'user-' + Date.now(),
          email: body.email,
          full_name: body.email.split('@')[0].toUpperCase(),
          role: 'vendedor'
        };
        return { success: true, user, token: 'mock-jwt-token-' + user.id };
      }

      // 2. Auth: Demo Users
      if (cleanEndpoint === '/auth/users') {
        return { success: true, users: MockDB.get('users', INITIAL_USERS) };
      }

      // 3. Products
      if (cleanEndpoint === '/products') {
        let products = MockDB.get('products', INITIAL_PRODUCTS);
        if (method === 'GET') {
          return { success: true, products };
        }
        if (method === 'POST') {
          requireMockAdmin();
          const newProduct = {
            id: 'prod-' + Date.now(),
            product_type: body.product_type || 'Libros',
            name: body.name,
            author: body.author || 'Nexus',
            editorial: body.editorial || 'Nexus SAC',
            stock: parseInt(body.stock || 0, 10),
            rate: parseFloat(body.initial_rate || 0),
            currency: body.currency || 'PEN',
            rate_id: 'rate-' + Date.now()
          };
          products.unshift(newProduct);
          MockDB.set('products', products);

          // También registrar su tarifa en el catálogo de tarifas
          const rates = MockDB.get('rates', INITIAL_RATES);
          rates.unshift({
            id: newProduct.rate_id,
            product_id: newProduct.id,
            amount: newProduct.rate,
            currency: newProduct.currency,
            created_at: new Date().toISOString(),
            products: { name: newProduct.name, product_type: newProduct.product_type }
          });
          MockDB.set('rates', rates);

          return { success: true, product: newProduct, message: 'Producto registrado exitosamente' };
        }
      }

      const productUpdate = cleanEndpoint.match(/^\/products\/([^/]+)$/);
      if (productUpdate && method === 'PATCH') {
        requireMockAdmin();
        const products = MockDB.get('products', INITIAL_PRODUCTS);
        const product = products.find(item => item.id === productUpdate[1]);
        if (!product) throw new Error('Producto no encontrado');
        Object.assign(product, body);
        MockDB.set('products', products);
        return { success: true, product };
      }

      // 4. Clients
      if (cleanEndpoint === '/clients') {
        let clients = MockDB.get('clients', INITIAL_CLIENTS);
        if (method === 'GET') {
          return { success: true, clients };
        }
        if (method === 'POST') {
          requireMockAdmin();
          // Validación de RUC / DNI
          if (body.doc_type === 'RUC' && (!body.doc_number?.startsWith('10') && !body.doc_number?.startsWith('20'))) {
            throw new Error('El RUC debe comenzar con 10 o 20.');
          }
          if (body.doc_type === 'DNI' && body.doc_number?.length !== 8) {
            throw new Error('El DNI debe tener exactamente 8 dígitos.');
          }

          const newClient = {
            id: 'client-' + Date.now(),
            doc_type: body.doc_type,
            full_name: body.full_name,
            doc_number: body.doc_number,
            address: body.address || '',
            phone: body.phone || ''
          };
          clients.unshift(newClient);
          MockDB.set('clients', clients);
          return { success: true, client: newClient, message: 'Cliente registrado exitosamente' };
        }
      }

      const clientUpdate = cleanEndpoint.match(/^\/clients\/([^/]+)$/);
      if (clientUpdate && method === 'PATCH') {
        requireMockAdmin();
        const clients = MockDB.get('clients', INITIAL_CLIENTS);
        const client = clients.find(item => item.id === clientUpdate[1]);
        if (!client) throw new Error('Cliente no encontrado');
        Object.assign(client, body);
        MockDB.set('clients', clients);
        return { success: true, client };
      }

      // 5. Rates
      if (cleanEndpoint === '/rates') {
        let rates = MockDB.get('rates', INITIAL_RATES);
        if (method === 'GET') {
          return { success: true, rates };
        }
        if (method === 'POST') {
          requireMockAdmin();
          const products = MockDB.get('products', INITIAL_PRODUCTS);
          const prod = products.find(p => p.id === body.product_id);

          const newRate = {
            id: 'rate-' + Date.now(),
            product_id: body.product_id,
            amount: parseFloat(body.amount || 0),
            currency: body.currency || 'PEN',
            created_at: new Date().toISOString(),
            products: prod ? { name: prod.name, product_type: prod.product_type } : null
          };

          rates.unshift(newRate);
          MockDB.set('rates', rates);

          // Actualizar producto correspondiente
          if (prod) {
            prod.rate = newRate.amount;
            prod.currency = newRate.currency;
            MockDB.set('products', products);
          }

          return { success: true, rate: newRate, message: 'Tarifa registrada exitosamente' };
        }
      }

      const rateUpdate = cleanEndpoint.match(/^\/rates\/([^/]+)$/);
      if (rateUpdate && method === 'PATCH') {
        requireMockAdmin();
        const rates = MockDB.get('rates', INITIAL_RATES);
        const rate = rates.find(item => item.id === rateUpdate[1]);
        if (!rate) throw new Error('Tarifa no encontrada');
        Object.assign(rate, body);
        MockDB.set('rates', rates);
        const products = MockDB.get('products', INITIAL_PRODUCTS);
        const product = products.find(item => item.id === rate.product_id);
        if (product) {
          product.rate = rate.amount;
          product.currency = rate.currency;
          MockDB.set('products', products);
        }
        return { success: true, rate };
      }

      // 6. Quotations
      if (cleanEndpoint === '/quotations') {
        let quotations = MockDB.get('quotations', INITIAL_QUOTATIONS);
        if (method === 'GET') {
          return { success: true, quotations };
        }
        if (method === 'POST') {
          const clients = MockDB.get('clients', INITIAL_CLIENTS);
          const products = MockDB.get('products', INITIAL_PRODUCTS);
          const client = clients.find(c => c.id === body.client_id) || {};

          // Calcular totales y detalle
          let rawSubtotal = 0;
          const itemsWithDetails = (body.items || []).map(it => {
            const prod = products.find(p => p.id === it.product_id);
            const lineSub = parseFloat(it.quantity) * parseFloat(it.unit_price);
            rawSubtotal += lineSub;

            // Reducir stock del producto
            if (prod) {
              prod.stock = Math.max(0, prod.stock - parseInt(it.quantity, 10));
            }

            return {
              product_id: it.product_id,
              product_name: prod ? prod.name : 'Producto',
              quantity: it.quantity,
              unit_price: it.unit_price,
              subtotal: lineSub,
              products: prod ? { name: prod.name, product_type: prod.product_type } : null
            };
          });

          MockDB.set('products', products);

          const discountPercent = parseFloat(body.discount_percent || 0);
          const discountAmount = parseFloat(((rawSubtotal * discountPercent) / 100).toFixed(2));
          const baseAfterDiscount = parseFloat((rawSubtotal - discountAmount).toFixed(2));
          const igv = parseFloat((baseAfterDiscount * 0.18).toFixed(2));
          const total = parseFloat((baseAfterDiscount + igv).toFixed(2));

          // Regla de Negocio: > 15% genera estado pendiente de aprobación
          const status = discountPercent > 15 ? 'pendiente' : 'aprobado';
          const quoteNum = `2026-${String(quotations.length + 1).padStart(4, '0')}`;

          const newQuotation = {
            id: 'quote-' + Date.now(),
            quotation_number: quoteNum,
            client_id: body.client_id,
            quotation_date: body.quotation_date,
            due_date: body.due_date,
            references_text: body.references_text || '',
            subtotal: rawSubtotal,
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            igv: igv,
            total: total,
            status: status,
            currency: body.currency || 'PEN',
            created_by: window.Auth?.getCurrentUser()?.id || 'demo-user',
            clients: client,
            items: itemsWithDetails,
            quotation_items: itemsWithDetails
          };

          quotations.unshift(newQuotation);
          MockDB.set('quotations', quotations);

          return {
            success: true,
            quotation: newQuotation,
            message: status === 'aprobado'
              ? `Cotización ${quoteNum} emitida y aprobada automáticamente.`
              : `Cotización ${quoteNum} registrada. Enviada a Supervisor para aprobación de descuento (${discountPercent}%).`
          };
        }
      }

      // 7. Quotation Detail por ID
      if (cleanEndpoint.startsWith('/quotations/') && !cleanEndpoint.endsWith('/status')) {
        const id = cleanEndpoint.replace('/quotations/', '');
        const quotations = MockDB.get('quotations', INITIAL_QUOTATIONS);
        const quote = quotations.find(q => q.id === id);
        if (!quote) throw new Error('Cotización no encontrada');
        return { success: true, quotation: quote };
      }

      // 8. Actualizar Estado de Cotización (Aprobar / Rechazar)
      if (cleanEndpoint.startsWith('/quotations/') && cleanEndpoint.endsWith('/status') && method === 'PATCH') {
        const id = cleanEndpoint.replace('/quotations/', '').replace('/status', '');
        let quotations = MockDB.get('quotations', INITIAL_QUOTATIONS);
        const quote = quotations.find(q => q.id === id);
        if (!quote) throw new Error('Cotización no encontrada');

        quote.status = body.status;
        quote.approval_notes = body.approval_notes || '';
        MockDB.set('quotations', quotations);

        return {
          success: true,
          quotation: quote,
          message: body.status === 'aprobado'
            ? `Cotización ${quote.quotation_number} aprobada satisfactoriamente.`
            : `Cotización ${quote.quotation_number} ha sido rechazada.`
        };
      }

      return { success: true, data: [] };
    },

    // Métodos públicos del cliente de API
    async login(email, password) {
      if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);

        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profileError || !profile) {
          await supabaseClient.auth.signOut();
          throw new Error(profileError?.message || 'La cuenta no tiene un perfil de Nexus asignado.');
        }
        return { success: true, user: profile, token: data.session.access_token };
      }
      return this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },

    async getDemoUsers() {
      if (supabaseClient) {
        const users = await getSupabaseData(supabaseClient.from('profiles').select('*').order('full_name'));
        return { success: true, users };
      }
      return this.request('/auth/users');
    },

    async getProducts(params = {}) {
      if (supabaseClient) {
        let query = supabaseClient.from('products').select('*, rates(*)').order('name');
        if (params.type) query = query.eq('product_type', params.type);
        let products = await getSupabaseData(query);
        if (params.search) {
          const search = params.search.toLowerCase();
          products = products.filter(product =>
            [product.name, product.author, product.editorial].some(value => value?.toLowerCase().includes(search))
          );
        }
        products = products.map(product => {
          const rates = (product.rates || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const latestRate = rates[0];
          return {
            ...product,
            rates,
            rate: latestRate ? Number(latestRate.amount) : null,
            rate_id: latestRate?.id || null,
            currency: latestRate?.currency || 'PEN'
          };
        });
        return { success: true, products };
      }
      const query = new URLSearchParams(params).toString();
      return this.request(`/products${query ? `?${query}` : ''}`);
    },

    async createProduct(productData) {
      if (supabaseClient) {
        const product = await getSupabaseData(
          supabaseClient.from('products').insert([{
            product_type: productData.product_type,
            name: productData.name,
            author: productData.author,
            editorial: productData.editorial,
            stock: productData.stock
          }]).select().single()
        );
        if (productData.initial_rate) {
          await getSupabaseData(
            supabaseClient.from('rates').insert([{
              product_id: product.id,
              amount: productData.initial_rate,
              currency: productData.currency || 'PEN'
            }])
          );
        }
        return { success: true, product };
      }
      return this.request('/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      });
    },

    async updateProduct(id, productData) {
      if (supabaseClient) {
        const product = await getSupabaseData(
          supabaseClient.from('products').update({
            product_type: productData.product_type,
            name: productData.name,
            author: productData.author,
            editorial: productData.editorial,
            stock: productData.stock
          }).eq('id', id).select().single()
        );
        return { success: true, product };
      }
      return this.request(`/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(productData)
      });
    },

    async getClients(params = {}) {
      if (supabaseClient) {
        let clients = await getSupabaseData(
          supabaseClient.from('clients').select('*').order('full_name')
        );
        if (params.search) {
          const search = params.search.toLowerCase();
          clients = clients.filter(client =>
            client.full_name.toLowerCase().includes(search) || client.doc_number.includes(search)
          );
        }
        return { success: true, clients };
      }
      const query = new URLSearchParams(params).toString();
      return this.request(`/clients${query ? `?${query}` : ''}`);
    },

    async createClient(clientData) {
      if (supabaseClient) {
        const client = await getSupabaseData(
          supabaseClient.from('clients').insert([clientData]).select().single()
        );
        return { success: true, client };
      }
      return this.request('/clients', {
        method: 'POST',
        body: JSON.stringify(clientData)
      });
    },

    async updateClient(id, clientData) {
      if (supabaseClient) {
        const client = await getSupabaseData(
          supabaseClient.from('clients').update(clientData).eq('id', id).select().single()
        );
        return { success: true, client };
      }
      return this.request(`/clients/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(clientData)
      });
    },

    async getRates(params = {}) {
      if (supabaseClient) {
        let query = supabaseClient
          .from('rates')
          .select('*, products(name, product_type)')
          .order('created_at', { ascending: false });
        if (params.product_id) query = query.eq('product_id', params.product_id);
        const rates = await getSupabaseData(query);
        return {
          success: true,
          rates: rates.map(rate => ({
            ...rate,
            product_name: rate.products?.name || 'Desconocido',
            product_type: rate.products?.product_type || '-'
          }))
        };
      }
      const query = new URLSearchParams(params).toString();
      return this.request(`/rates${query ? `?${query}` : ''}`);
    },

    async createRate(rateData) {
      if (supabaseClient) {
        const rate = await getSupabaseData(
          supabaseClient.from('rates').insert([rateData]).select().single()
        );
        return { success: true, rate };
      }
      return this.request('/rates', {
        method: 'POST',
        body: JSON.stringify(rateData)
      });
    },

    async updateRate(id, rateData) {
      if (supabaseClient) {
        const rate = await getSupabaseData(
          supabaseClient.from('rates').update(rateData).eq('id', id).select().single()
        );
        return { success: true, rate };
      }
      return this.request(`/rates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(rateData)
      });
    },

    async getQuotations(params = {}) {
      if (supabaseClient) {
        let query = supabaseClient.from('quotations').select(`
          *,
          clients(*),
          profiles:profiles!quotations_created_by_fkey(id, full_name, email, role),
          approver:profiles!quotations_approved_by_fkey(id, full_name, email),
          quotation_items(*, products(id, name, product_type, stock), rates(id, amount, currency))
        `).order('created_at', { ascending: false });
        if (params.status) query = query.eq('status', params.status);
        if (params.client_id) query = query.eq('client_id', params.client_id);
        const quotations = await getSupabaseData(query);
        return { success: true, quotations };
      }
      const query = new URLSearchParams(params).toString();
      return this.request(`/quotations${query ? `?${query}` : ''}`);
    },

    async getQuotation(id) {
      if (supabaseClient) {
        const quotation = await getSupabaseData(
          supabaseClient.from('quotations').select(`
            *,
            clients(*),
            profiles:profiles!quotations_created_by_fkey(id, full_name, email, role),
            approver:profiles!quotations_approved_by_fkey(id, full_name, email),
            quotation_items(*, products(id, name, product_type, author, editorial, stock), rates(id, amount, currency))
          `).eq('id', id).single()
        );
        return { success: true, quotation };
      }
      return this.request(`/quotations/${id}`);
    },

    async createQuotation(quotationData) {
      if (supabaseClient) {
        await getCurrentSupabaseUser();
        return getSupabaseData(supabaseClient.rpc('create_quotation', { p_payload: quotationData }));
      }
      return this.request('/quotations', {
        method: 'POST',
        body: JSON.stringify(quotationData)
      });
    },

    async updateQuotationStatus(id, status, notes) {
      if (supabaseClient) {
        await getCurrentSupabaseUser();
        return getSupabaseData(supabaseClient.rpc('review_quotation', {
          p_quotation_id: id,
          p_status: status,
          p_approval_notes: notes || ''
        }));
      }
      return this.request(`/quotations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, approval_notes: notes })
      });
    },

    async logout() {
      if (!supabaseClient) return;
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw new Error(error.message);
    }
  };
})();
