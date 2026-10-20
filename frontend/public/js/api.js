// ==========================================================
// NEXUS SAC - CLIENTE DE API HTTP
// ==========================================================

const API = {
  baseUrl: window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? (window.location.port === '5000' ? 'http://localhost:3000/api' : '/api')
    : '/api',

  getHeaders() {
    const user = Auth.getCurrentUser();
    const headers = {
      'Content-Type': 'application/json'
    };

    if (user) {
      headers['x-user-id'] = user.id;
      headers['x-user-role'] = user.role;
      const token = localStorage.getItem('nexus_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error en servidor: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  // Auth
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async getDemoUsers() {
    return this.request('/auth/users');
  },

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products${query ? `?${query}` : ''}`);
  },

  async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  // Clients
  async getClients(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/clients${query ? `?${query}` : ''}`);
  },

  async createClient(clientData) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  },

  // Rates
  async getRates(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/rates${query ? `?${query}` : ''}`);
  },

  async createRate(rateData) {
    return this.request('/rates', {
      method: 'POST',
      body: JSON.stringify(rateData)
    });
  },

  // Quotations
  async getQuotations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/quotations${query ? `?${query}` : ''}`);
  },

  async getQuotation(id) {
    return this.request(`/quotations/${id}`);
  },

  async createQuotation(quotationData) {
    return this.request('/quotations', {
      method: 'POST',
      body: JSON.stringify(quotationData)
    });
  },

  async updateQuotationStatus(id, status, notes) {
    return this.request(`/quotations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, approval_notes: notes })
    });
  }
};
