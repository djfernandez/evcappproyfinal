// ==========================================================
// NEXUS SAC - APLICACIÓN PRINCIPAL (SPA CONTROLLER)
// ==========================================================

const UI = {
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <span style="font-size: 1.2rem;">${icon}</span>
      <div style="flex: 1; font-size: 0.88rem;">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && typeof modal.showModal === 'function') {
      modal.showModal();
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && typeof modal.close === 'function') {
      modal.close();
    }
  }
};

const App = {
  currentView: 'dashboard',
  state: {
    products: [],
    clients: [],
    rates: [],
    quotations: [],
    quotationLines: []
  },

  async init() {
    console.log('🚀 Inicializando Nexus SAC Frontend...');
    this.setupEventListeners();
    let currentUser;
    try {
      currentUser = API.usesSupabase ? await API.restoreSession() : Auth.getCurrentUser();
    } catch (error) {
      console.error('Error restaurando sesión de Supabase:', error);
      UI.showToast(error.message, 'error');
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
      return;
    }
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }
    Auth.setCurrentUser(currentUser);
    await this.loadInitialData();
    this.navigate('dashboard');
  },

  setupEventListeners() {
    // Menú de Navegación
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view) this.navigate(view);
      });
    });

    // Formulario de Nuevo Cliente con validación en vivo
    const clientForm = document.getElementById('form-new-client');
    if (clientForm) {
      clientForm.addEventListener('submit', (e) => this.handleCreateClient(e));
      
      const docTypeSelect = document.getElementById('client-doc-type');
      const docNumberInput = document.getElementById('client-doc-number');
      const hint = document.getElementById('client-doc-hint');

      if (docTypeSelect && docNumberInput && hint) {
        docNumberInput.addEventListener('input', () => {
          const type = docTypeSelect.value;
          const val = docNumberInput.value.trim();

          if (type === 'RUC') {
            if (val.length > 0 && !val.startsWith('10') && !val.startsWith('20')) {
              hint.textContent = '❌ Regla: El RUC debe iniciar obligatoriamente con 10 o 20.';
              hint.className = 'input-hint error';
            } else if (val.length === 11) {
              hint.textContent = '✅ RUC válido (11 dígitos, prefijo correcto)';
              hint.className = 'input-hint';
            } else {
              hint.textContent = 'Debe tener 11 dígitos y comenzar con 10 o 20.';
              hint.className = 'input-hint';
            }
          } else if (type === 'DNI') {
            if (val.length === 8 && /^[0-9]+$/.test(val)) {
              hint.textContent = '✅ DNI válido (8 dígitos)';
              hint.className = 'input-hint';
            } else {
              hint.textContent = 'Debe constar de exactamente 8 dígitos numéricos.';
              hint.className = 'input-hint';
            }
          }
        });
      }
    }

    // Formulario de Nuevo Producto
    const productForm = document.getElementById('form-new-product');
    if (productForm) {
      productForm.addEventListener('submit', (e) => this.handleCreateProduct(e));
    }

    // Formulario de Nueva Tarifa
    const rateForm = document.getElementById('form-new-rate');
    if (rateForm) {
      rateForm.addEventListener('submit', (e) => this.handleCreateRate(e));
    }

    // Botón agregar ítem en cotizador dinámico
    const btnAddItem = document.getElementById('btn-add-quote-item');
    if (btnAddItem) {
      btnAddItem.addEventListener('click', () => this.addQuotationLine());
    }

    // Input de descuento en cotizador para cálculo reactivo
    const discountInput = document.getElementById('quote-discount-percent');
    if (discountInput) {
      discountInput.addEventListener('input', () => this.recalculateQuotation());
    }

    // Envío de cotización
    const quoteForm = document.getElementById('form-create-quotation');
    if (quoteForm) {
      quoteForm.addEventListener('submit', (e) => this.handleSaveQuotation(e));
    }

    // Formulario modal de aprobación / rechazo
    const approvalForm = document.getElementById('form-approval-decision');
    if (approvalForm) {
      approvalForm.addEventListener('submit', (e) => this.handleSubmitApprovalDecision(e));
    }
  },

  async loadInitialData() {
    try {
      const [prodsRes, clientsRes, ratesRes, quotesRes] = await Promise.all([
        API.getProducts(),
        API.getClients(),
        API.getRates(),
        API.getQuotations()
      ]);

      this.state.products = prodsRes.products || [];
      this.state.clients = clientsRes.clients || [];
      this.state.rates = ratesRes.rates || [];
      this.state.quotations = quotesRes.quotations || [];

      this.updateApprovalsBadge();
    } catch (error) {
      console.warn('Error cargando datos iniciales:', error);
      UI.showToast('Conectando con el servidor backend...', 'warning');
    }
  },

  onRoleChanged(user) {
    this.updateApprovalsBadge();
    // Refrescar vista actual
    this.navigate(this.currentView);
  },

  navigate(viewId) {
    this.currentView = viewId;

    // Actualizar sidebar activa
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Ocultar todas las vistas y mostrar la seleccionada
    document.querySelectorAll('.view-section').forEach(section => {
      section.style.display = 'none';
    });

    const activeSection = document.getElementById(`view-${viewId}`);
    if (activeSection) {
      activeSection.style.display = 'block';
    }

    // Renderizar datos de la vista
    switch (viewId) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'quotations':
        this.renderQuotationsList();
        break;
      case 'quotation-new':
        this.initNewQuotationForm();
        break;
      case 'approvals':
        this.renderApprovals();
        break;
      case 'products':
        this.renderProductsList();
        break;
      case 'clients':
        this.renderClientsList();
        break;
      case 'rates':
        this.renderRatesList();
        break;
    }
  },

  updateApprovalsBadge() {
    const pendingCount = this.state.quotations.filter(q => q.status === 'pendiente').length;
    const badge = document.getElementById('pending-approvals-badge');
    if (badge) {
      badge.textContent = pendingCount;
      badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
  },

  // ==========================================
  // DASHBOARD VIEW
  // ==========================================
  renderDashboard() {
    const quotes = this.state.quotations;
    const totalQuotes = quotes.length;
    const pendingQuotes = quotes.filter(q => q.status === 'pendiente').length;
    const approvedQuotes = quotes.filter(q => q.status === 'aprobado').length;

    // Sumar montos de aprobadas en PEN
    const totalRevenuePEN = quotes
      .filter(q => q.status === 'aprobado' && q.currency === 'PEN')
      .reduce((sum, q) => sum + parseFloat(q.total || 0), 0);

    const kpiTotalEl = document.getElementById('kpi-total-quotes');
    const kpiPendingEl = document.getElementById('kpi-pending-quotes');
    const kpiApprovedEl = document.getElementById('kpi-approved-quotes');
    const kpiRevenueEl = document.getElementById('kpi-total-revenue');

    if (kpiTotalEl) kpiTotalEl.textContent = totalQuotes;
    if (kpiPendingEl) kpiPendingEl.textContent = pendingQuotes;
    if (kpiApprovedEl) kpiApprovedEl.textContent = approvedQuotes;
    if (kpiRevenueEl) kpiRevenueEl.textContent = `S/ ${totalRevenuePEN.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    // Tabla de cotizaciones recientes en dashboard
    const tbody = document.getElementById('dashboard-recent-quotes-tbody');
    if (tbody) {
      const recent = quotes.slice(0, 5);
      if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">No hay cotizaciones registradas. Haz clic en "Nueva Cotización" para comenzar.</td></tr>`;
      } else {
        tbody.innerHTML = recent.map(q => `
          <tr>
            <td><strong style="color: #60a5fa; font-family: var(--font-mono);">${q.quotation_number}</strong></td>
            <td>${q.clients?.full_name || 'Cliente'}</td>
            <td>${q.quotation_date}</td>
            <td><strong style="font-family: var(--font-mono);">${q.currency === 'USD' ? '$' : 'S/'} ${parseFloat(q.total).toFixed(2)}</strong></td>
            <td><span class="badge-status badge-${q.status}">${q.status}</span></td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="App.exportPDF('${q.id}')">📄 PDF</button>
            </td>
          </tr>
        `).join('');
      }
    }
  },

  // ==========================================
  // COTIZACIONES (LISTADO)
  // ==========================================
  renderQuotationsList(filterStatus = '', btn = null) {
    if (btn) {
      const container = btn.closest('.filter-pills');
      if (container) {
        container.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    }

    const tbody = document.getElementById('quotations-table-tbody');
    if (!tbody) return;

    let list = this.state.quotations;
    if (filterStatus) {
      list = list.filter(q => q.status === filterStatus);
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;">No se encontraron cotizaciones con los criterios seleccionados.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(q => `
      <tr>
        <td><strong style="color: #60a5fa; font-family: var(--font-mono);">${q.quotation_number}</strong></td>
        <td>
          <div style="font-weight: 600; color: var(--text-main);">${q.clients?.full_name || 'Cliente'}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim);">${q.clients?.doc_type || 'Doc'}: ${q.clients?.doc_number || '-'}</div>
        </td>
        <td>${q.quotation_date}</td>
        <td>${q.due_date}</td>
        <td>
          <strong style="font-family: var(--font-mono);">${q.currency === 'USD' ? '$' : 'S/'} ${parseFloat(q.total).toFixed(2)}</strong>
          ${q.discount_percent > 0 ? `<div style="font-size: 0.72rem; color: #fbbf24;">-${q.discount_percent}% desc.</div>` : ''}
        </td>
        <td><span class="badge-status badge-${q.status}">${q.status}</span></td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-primary btn-sm" onclick="App.exportPDF('${q.id}')">📄 Exportar PDF</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  // ==========================================
  // FORMULARIO DINÁMICO DE NUEVA COTIZACIÓN
  // ==========================================
  initNewQuotationForm() {
    // Poblar selector de clientes
    const clientSelect = document.getElementById('quote-client-select');
    if (clientSelect) {
      clientSelect.innerHTML = `<option value="">-- Selecciona un Cliente --</option>` +
        this.state.clients.map(c => `
          <option value="${c.id}">${c.full_name} (${c.doc_type}: ${c.doc_number})</option>
        `).join('');
    }

    // Inicializar fechas predeterminadas
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    const dateInput = document.getElementById('quote-date');
    const dueDateInput = document.getElementById('quote-due-date');
    if (dateInput) dateInput.value = today;
    if (dueDateInput) dueDateInput.value = dueDate;

    // Reiniciar líneas de cotización y agregar la primera línea vacía
    this.state.quotationLines = [];
    const container = document.getElementById('quote-items-container');
    if (container) container.innerHTML = '';
    this.addQuotationLine();
    this.recalculateQuotation();
  },

  addQuotationLine() {
    const lineIndex = this.state.quotationLines.length;
    this.state.quotationLines.push({
      productId: '',
      quantity: 1,
      unitPrice: 0,
      stock: 0,
      subtotal: 0
    });

    const container = document.getElementById('quote-items-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.id = `quote-line-${lineIndex}`;

    row.innerHTML = `
      <div>
        <select class="form-select line-product-select" data-index="${lineIndex}">
          <option value="">-- Seleccionar Producto --</option>
          ${this.state.products.map(p => {
            const productRate = (p.rate !== undefined && p.rate !== null)
              ? p.rate
              : (p.rates && p.rates.length ? p.rates[0].amount : 0);
            const rateId = (p.rates && p.rates.length) ? p.rates[0].id : (p.rate_id || '');
            return `
            <option value="${p.id}" data-rate="${productRate}" data-rate-id="${rateId}" data-stock="${p.stock}">
              [${p.product_type}] ${p.name} (Stock: ${p.stock})
            </option>
          `;
          }).join('')}
        </select>
        <div class="line-stock-info" id="line-stock-${lineIndex}"></div>
      </div>
      <div>
        <input type="number" class="form-input line-qty-input" data-index="${lineIndex}" value="1" min="1" />
      </div>
      <div>
        <input type="number" step="0.01" class="form-input line-price-input" data-index="${lineIndex}" value="0.00" min="0" />
      </div>
      <div>
        <input type="text" class="form-input line-subtotal-input" id="line-subtotal-${lineIndex}" value="S/ 0.00" readonly style="background: rgba(0,0,0,0.2);" />
      </div>
      <div>
        <button type="button" class="btn-remove-item" onclick="App.removeQuotationLine(${lineIndex})" title="Eliminar ítem">
          🗑️
        </button>
      </div>
    `;

    container.appendChild(row);

    // Eventos reactivos para cambio de producto, cantidad o precio
    const prodSelect = row.querySelector('.line-product-select');
    const qtyInput = row.querySelector('.line-qty-input');
    const priceInput = row.querySelector('.line-price-input');

    prodSelect.addEventListener('change', () => {
      const selectedOption = prodSelect.options[prodSelect.selectedIndex];
      const rate = parseFloat(selectedOption?.dataset?.rate || 0);
      const rateId = selectedOption?.dataset?.rateId || null;
      const stock = parseInt(selectedOption?.dataset?.stock || 0, 10);
      const productId = prodSelect.value;

      priceInput.value = rate.toFixed(2);
      this.state.quotationLines[lineIndex].productId = productId;
      this.state.quotationLines[lineIndex].rateId = rateId;
      this.state.quotationLines[lineIndex].unitPrice = rate;
      this.state.quotationLines[lineIndex].stock = stock;

      // Actualizar badge de stock
      const stockInfo = document.getElementById(`line-stock-${lineIndex}`);
      if (stockInfo) {
        if (!productId) {
          stockInfo.innerHTML = '';
        } else if (stock === 0) {
          stockInfo.innerHTML = `<span class="stock-badge stock-out">Sin Stock (0 disponibles)</span>`;
        } else if (stock < 5) {
          stockInfo.innerHTML = `<span class="stock-badge stock-low">Stock Crítico (${stock} disp.)</span>`;
        } else {
          stockInfo.innerHTML = `<span class="stock-badge stock-ok">En Stock (${stock} disp.)</span>`;
        }
      }

      this.recalculateQuotation();
    });

    qtyInput.addEventListener('input', () => {
      const qty = parseInt(qtyInput.value || 0, 10);
      const line = this.state.quotationLines[lineIndex];
      line.quantity = qty;

      if (line.stock > 0 && qty > line.stock) {
        UI.showToast(`Advertencia: La cantidad (${qty}) supera el stock disponible (${line.stock})`, 'warning');
      }

      this.recalculateQuotation();
    });

    priceInput.addEventListener('input', () => {
      const pr = parseFloat(priceInput.value || 0);
      this.state.quotationLines[lineIndex].unitPrice = pr;
      this.recalculateQuotation();
    });
  },

  removeQuotationLine(index) {
    if (this.state.quotationLines.length <= 1) {
      UI.showToast('La cotización debe contener al menos un producto.', 'warning');
      return;
    }

    const row = document.getElementById(`quote-line-${index}`);
    if (row) row.remove();
    this.state.quotationLines[index] = null; // marcar eliminado
    this.recalculateQuotation();
  },

  recalculateQuotation() {
    let rawSubtotal = 0;
    const currency = document.getElementById('quote-currency')?.value || 'PEN';
    const currencySymbol = currency === 'USD' ? '$' : 'S/';

    this.state.quotationLines.forEach((line, idx) => {
      if (!line) return;
      const sub = parseFloat((line.quantity * line.unitPrice).toFixed(2));
      line.subtotal = sub;
      rawSubtotal += sub;

      const subInput = document.getElementById(`line-subtotal-${idx}`);
      if (subInput) {
        subInput.value = `${currencySymbol} ${sub.toFixed(2)}`;
      }
    });

    // Descuentos y regla de negocio (> 15% genera flujo de aprobación)
    const discountPercent = parseFloat(document.getElementById('quote-discount-percent')?.value || 0);
    const discountAmount = parseFloat(((rawSubtotal * discountPercent) / 100).toFixed(2));
    const baseAfterDiscount = parseFloat((rawSubtotal - discountAmount).toFixed(2));

    // IGV (18%) y Total
    const igv = parseFloat((baseAfterDiscount * 0.18).toFixed(2));
    const total = parseFloat((baseAfterDiscount + igv).toFixed(2));

    // Actualizar campos en UI
    const subtotalEl = document.getElementById('summary-subtotal');
    const discountAmountEl = document.getElementById('summary-discount-amount');
    const igvEl = document.getElementById('summary-igv');
    const totalEl = document.getElementById('summary-total');
    const alertBox = document.getElementById('discount-business-rule-alert');

    if (subtotalEl) subtotalEl.textContent = `${currencySymbol} ${rawSubtotal.toFixed(2)}`;
    if (discountAmountEl) discountAmountEl.textContent = `-${currencySymbol} ${discountAmount.toFixed(2)}`;
    if (igvEl) igvEl.textContent = `${currencySymbol} ${igv.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `${currencySymbol} ${total.toFixed(2)}`;

    // Manejo de la alerta de regla de negocio
    if (alertBox) {
      if (discountPercent > 15) {
        alertBox.className = 'discount-alert warning';
        alertBox.innerHTML = `
          <span>⚠️</span>
          <div>
            <strong>Descuento Especial (${discountPercent}%):</strong> Supera el estándar máximo (15%). 
            Esta cotización quedará en estado <strong>PENDIENTE</strong> y se enviará automáticamente a la bandeja de aprobación del Supervisor.
          </div>
        `;
      } else if (discountPercent > 0) {
        alertBox.className = 'discount-alert standard';
        alertBox.innerHTML = `
          <span>✅</span>
          <div>
            <strong>Descuento Estándar (${discountPercent}%):</strong> Dentro del rango permitido comercialmente (&le; 15%). 
            Se emitirá directamente como <strong>APROBADA</strong>.
          </div>
        `;
      } else {
        alertBox.className = 'discount-alert standard';
        alertBox.innerHTML = `
          <span>ℹ️</span>
          <div>Tarifa regular de lista seleccionada sin descuento. Aprobación inmediata.</div>
        `;
      }
    }
  },

  async handleSaveQuotation(e) {
    e.preventDefault();

    const clientId = document.getElementById('quote-client-select').value;
    const quotationDate = document.getElementById('quote-date').value;
    const dueDate = document.getElementById('quote-due-date').value;
    const referencesText = document.getElementById('quote-references').value;
    const discountPercent = parseFloat(document.getElementById('quote-discount-percent').value || 0);
    const currency = document.getElementById('quote-currency').value;

    if (!clientId) {
      UI.showToast('Debes seleccionar un cliente para la cotización.', 'warning');
      return;
    }

    const activeLines = this.state.quotationLines.filter(l => l !== null && l.productId);
    if (activeLines.length === 0) {
      UI.showToast('Debes agregar al menos un producto válido al detalle.', 'warning');
      return;
    }

    const payload = {
      client_id: clientId,
      quotation_date: quotationDate,
      due_date: dueDate,
      references_text: referencesText,
      discount_percent: discountPercent,
      currency: currency,
      items: activeLines.map(l => ({
        product_id: l.productId,
        quantity: l.quantity,
        unit_price: l.unitPrice
      }))
    };

    try {
      const res = await API.createQuotation(payload);
      UI.showToast(res.message, res.quotation.status === 'aprobado' ? 'success' : 'warning');

      // Actualizar listado local y vista
      await this.loadInitialData();
      this.navigate('quotations');
    } catch (error) {
      UI.showToast(`Error al crear cotización: ${error.message}`, 'error');
    }
  },

  // ==========================================
  // BANDEJA DE APROBACIONES (SUPERVISOR / ADMIN)
  // ==========================================
  renderApprovals() {
    const container = document.getElementById('approvals-cards-container');
    if (!container) return;

    const pendingList = this.state.quotations.filter(q => q.status === 'pendiente');

    if (pendingList.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
          <h3>No hay cotizaciones pendientes de aprobación</h3>
          <p style="color: var(--text-dim); margin-top: 0.5rem;">Todas las solicitudes comerciales están al día.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pendingList.map(q => {
      const client = q.clients || {};
      const items = q.quotation_items || q.items || [];
      const currencySymbol = q.currency === 'USD' ? '$' : 'S/';

      return `
        <div class="approval-card">
          <div class="approval-card-header">
            <div>
              <span class="badge-status badge-pending">Pendiente de Aprobación</span>
              <h3 style="margin-top: 0.5rem; font-family: var(--font-mono); color: #60a5fa;">
                ${q.quotation_number}
              </h3>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.8rem; color: var(--text-dim);">Total Solicitado</div>
              <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-main);">
                ${currencySymbol} ${parseFloat(q.total).toFixed(2)}
              </div>
            </div>
          </div>

          <div class="approval-meta">
            <div><strong>Cliente:</strong> ${client.full_name || 'Desconocido'} (${client.doc_type || 'RUC'}: ${client.doc_number || '-'})</div>
            <div><strong>Descuento Especial:</strong> <span style="color: #fbbf24; font-weight: 700;">${q.discount_percent}% (-${currencySymbol} ${parseFloat(q.discount_amount).toFixed(2)})</span></div>
            <div><strong>Fecha Emisión:</strong> ${q.quotation_date}</div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.4); border-radius: var(--radius-md); padding: 0.85rem; font-size: 0.85rem;">
            <strong>Ítems en cotización (${items.length}):</strong>
            <ul style="margin: 0.5rem 0 0 1.25rem; color: var(--text-muted);">
              ${items.map(it => `
                <li>${it.products?.name || it.product_name || 'Ítem'} - Cantidad: ${it.quantity} @ ${currencySymbol} ${parseFloat(it.unit_price).toFixed(2)}</li>
              `).join('')}
            </ul>
            ${q.references_text ? `<div style="margin-top: 0.5rem; color: var(--text-dim);"><em>Justificación del vendedor:</em> "${q.references_text}"</div>` : ''}
          </div>

          <div class="approval-actions">
            <button class="btn btn-danger btn-sm" onclick="App.openApprovalModal('${q.id}', 'rechazado')">
              ❌ Rechazar Cotización
            </button>
            <button class="btn btn-success btn-sm" onclick="App.openApprovalModal('${q.id}', 'aprobado')">
              ✅ Aprobar Descuento y Cotización
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  openApprovalModal(quotationId, decision) {
    const modal = document.getElementById('modal-approval-decision');
    const quoteIdInput = document.getElementById('approval-quote-id');
    const decisionInput = document.getElementById('approval-decision-type');
    const title = document.getElementById('approval-modal-title');

    if (quoteIdInput) quoteIdInput.value = quotationId;
    if (decisionInput) decisionInput.value = decision;
    if (title) {
      title.textContent = decision === 'aprobado' ? 'Aprobar Cotización y Descuento' : 'Rechazar Cotización';
    }

    UI.openModal('modal-approval-decision');
  },

  async handleSubmitApprovalDecision(e) {
    e.preventDefault();
    const quotationId = document.getElementById('approval-quote-id').value;
    const decision = document.getElementById('approval-decision-type').value;
    const notes = document.getElementById('approval-notes').value;

    try {
      const res = await API.updateQuotationStatus(quotationId, decision, notes);
      UI.closeModal('modal-approval-decision');
      UI.showToast(res.message, decision === 'aprobado' ? 'success' : 'info');
      await this.loadInitialData();
      this.renderApprovals();
    } catch (error) {
      UI.showToast(`Error al procesar decisión: ${error.message}`, 'error');
    }
  },

  // ==========================================
  // CATÁLOGO DE PRODUCTOS
  // ==========================================
  renderProductsList(typeFilter = '', btn = null) {
    if (btn) {
      const container = btn.closest('.filter-pills');
      if (container) {
        container.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    }

    const tbody = document.getElementById('products-table-tbody');
    if (!tbody) return;

    let list = this.state.products;
    if (typeFilter) {
      list = list.filter(p => p.product_type === typeFilter);
    }

    tbody.innerHTML = list.map(p => {
      let stockClass = 'stock-ok';
      if (p.stock === 0) stockClass = 'stock-out';
      else if (p.stock < 5) stockClass = 'stock-low';
      return `
        <tr>
          <td>
            <span style="display: inline-block; padding: 0.2rem 0.5rem; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
              ${p.product_type}
            </span>
          </td>
          <td>
            <strong style="color: var(--text-main);">${p.name}</strong>
          </td>
          <td>${p.author}</td>
          <td>${p.editorial}</td>
          <td>
            <span class="stock-badge ${stockClass}">${p.stock} unidades</span>
          </td>
          <td>
            <strong style="font-family: var(--font-mono);">${p.currency || 'PEN'} ${parseFloat(p.rate || 0).toFixed(2)}</strong>
          </td>
          <td class="admin-only-action" style="display: ${Auth.getCurrentUser()?.role === 'administrador' ? 'table-cell' : 'none'};">${Auth.getCurrentUser()?.role === 'administrador'
            ? `<button class="btn btn-secondary btn-sm" onclick="App.openEditProduct('${p.id}')">✏️ Editar</button>`
            : ''}</td>
        </tr>
      `;
    }).join('');
  },

  openEditProduct(productId) {
    const product = this.state.products.find(item => item.id === productId);
    if (!product || Auth.getCurrentUser()?.role !== 'administrador') return;

    const form = document.getElementById('form-new-product');
    form.dataset.editId = product.id;
    document.getElementById('product-modal-title').textContent = 'Editar Producto';
    document.getElementById('prod-type').value = product.product_type;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-author').value = product.author;
    document.getElementById('prod-editorial').value = product.editorial;
    document.getElementById('prod-stock').value = product.stock;
    document.getElementById('prod-initial-rate-group').style.display = 'none';
    document.getElementById('prod-currency-group').style.display = 'none';
    document.getElementById('product-submit-label').textContent = 'Guardar Cambios';
    UI.openModal('modal-new-product');
  },

  openNewProductModal() {
    const form = document.getElementById('form-new-product');
    form.reset();
    delete form.dataset.editId;
    document.getElementById('product-modal-title').textContent = 'Registrar Nuevo Producto';
    document.getElementById('prod-initial-rate-group').style.display = '';
    document.getElementById('prod-currency-group').style.display = '';
    document.getElementById('product-submit-label').textContent = 'Guardar Producto';
    UI.openModal('modal-new-product');
  },

  async handleCreateProduct(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const productId = form.dataset.editId;
    const payload = {
      product_type: document.getElementById('prod-type').value,
      name: document.getElementById('prod-name').value,
      author: document.getElementById('prod-author').value,
      editorial: document.getElementById('prod-editorial').value,
      stock: parseInt(document.getElementById('prod-stock').value || 0, 10)
    };
    if (!productId) {
      payload.initial_rate = parseFloat(document.getElementById('prod-rate').value || 0);
      payload.currency = document.getElementById('prod-currency').value;
    }

    try {
      if (productId) await API.updateProduct(productId, payload);
      else await API.createProduct(payload);
      UI.closeModal('modal-new-product');
      UI.showToast(productId ? 'Producto actualizado exitosamente' : 'Producto registrado exitosamente', 'success');
      form.reset();
      delete form.dataset.editId;
      document.getElementById('product-modal-title').textContent = 'Registrar Nuevo Producto';
      document.getElementById('prod-initial-rate-group').style.display = '';
      document.getElementById('prod-currency-group').style.display = '';
      document.getElementById('product-submit-label').textContent = 'Guardar Producto';
      await this.loadInitialData();
      this.renderProductsList();
    } catch (error) {
      UI.showToast(`Error al registrar producto: ${error.message}`, 'error');
    }
  },

  // ==========================================
  // CATÁLOGO DE CLIENTES
  // ==========================================
  renderClientsList() {
    const tbody = document.getElementById('clients-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.state.clients.map(c => `
      <tr>
        <td>
          <span style="display: inline-block; padding: 0.2rem 0.5rem; background: rgba(6, 182, 212, 0.15); color: #22d3ee; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
            ${c.doc_type}
          </span>
        </td>
        <td><strong style="font-family: var(--font-mono);">${c.doc_number}</strong></td>
        <td><strong style="color: var(--text-main);">${c.full_name}</strong></td>
        <td>${c.address || '-'}</td>
        <td>${c.phone || '-'}</td>
        <td class="admin-only-action" style="display: ${Auth.getCurrentUser()?.role === 'administrador' ? 'table-cell' : 'none'};">${Auth.getCurrentUser()?.role === 'administrador'
          ? `<button class="btn btn-secondary btn-sm" onclick="App.openEditClient('${c.id}')">✏️ Editar</button>`
          : ''}</td>
      </tr>
    `).join('');
  },

  openEditClient(clientId) {
    const client = this.state.clients.find(item => item.id === clientId);
    if (!client || Auth.getCurrentUser()?.role !== 'administrador') return;

    const form = document.getElementById('form-new-client');
    form.dataset.editId = client.id;
    document.getElementById('client-modal-title').textContent = 'Editar Cliente';
    document.getElementById('client-doc-type').value = client.doc_type;
    document.getElementById('client-doc-number').value = client.doc_number;
    document.getElementById('client-fullname').value = client.full_name;
    document.getElementById('client-address').value = client.address || '';
    document.getElementById('client-phone').value = client.phone || '';
    document.getElementById('client-submit-label').textContent = 'Guardar Cambios';
    UI.openModal('modal-new-client');
  },

  openNewClientModal() {
    const form = document.getElementById('form-new-client');
    form.reset();
    delete form.dataset.editId;
    document.getElementById('client-modal-title').textContent = 'Registrar Nuevo Cliente';
    document.getElementById('client-submit-label').textContent = 'Guardar Cliente';
    UI.openModal('modal-new-client');
  },

  async handleCreateClient(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const clientId = form.dataset.editId;
    const payload = {
      doc_type: document.getElementById('client-doc-type').value,
      full_name: document.getElementById('client-fullname').value,
      doc_number: document.getElementById('client-doc-number').value,
      address: document.getElementById('client-address').value,
      phone: document.getElementById('client-phone').value
    };

    try {
      if (clientId) await API.updateClient(clientId, payload);
      else await API.createClient(payload);
      UI.closeModal('modal-new-client');
      UI.showToast(clientId ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente', 'success');
      form.reset();
      delete form.dataset.editId;
      document.getElementById('client-modal-title').textContent = 'Registrar Nuevo Cliente';
      document.getElementById('client-submit-label').textContent = 'Guardar Cliente';
      await this.loadInitialData();
      this.renderClientsList();
    } catch (error) {
      UI.showToast(`Error de validación: ${error.message}`, 'error');
    }
  },

  // ==========================================
  // CATÁLOGO DE TARIFAS
  // ==========================================
  openNewRateModal() {
    const form = document.getElementById('form-new-rate');
    delete form.dataset.editId;
    document.getElementById('rate-modal-title').textContent = 'Registrar Nueva Tarifa';
    document.getElementById('rate-submit-label').textContent = 'Guardar Tarifa';
    form.reset();
    const select = document.getElementById('rate-product-id');
    if (select) {
      select.innerHTML = '<option value="">-- Selecciona un Producto --</option>' +
        this.state.products.map(p => `
          <option value="${p.id}">[${p.product_type}] ${p.name}</option>
        `).join('');
    }
    UI.openModal('modal-new-rate');
  },

  openEditRate(rateId) {
    const rate = this.state.rates.find(item => item.id === rateId);
    if (!rate || Auth.getCurrentUser()?.role !== 'administrador') return;

    this.openNewRateModal();
    const form = document.getElementById('form-new-rate');
    form.dataset.editId = rate.id;
    document.getElementById('rate-modal-title').textContent = 'Editar Tarifa';
    document.getElementById('rate-product-id').value = rate.product_id;
    document.getElementById('rate-amount').value = rate.amount;
    document.getElementById('rate-currency').value = rate.currency;
    document.getElementById('rate-submit-label').textContent = 'Guardar Cambios';
  },

  renderRatesList() {
    const tbody = document.getElementById('rates-table-tbody');
    if (!tbody) return;

    if (!this.state.rates || this.state.rates.length === 0) {
      const columns = Auth.getCurrentUser()?.role === 'administrador' ? 5 : 4;
      tbody.innerHTML = `<tr><td colspan="${columns}" style="text-align: center; padding: 2rem; color: var(--text-dim);">No hay tarifas registradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.rates.map(r => {
      const prodName = r.product_name || r.products?.name || 'Producto';
      const prodType = r.product_type || r.products?.product_type || '-';
      return `
      <tr>
        <td><strong style="color: var(--text-main);">${prodName}</strong></td>
        <td><span class="badge" style="background: rgba(96, 165, 250, 0.15); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.3); font-weight: 600;">${prodType}</span></td>
        <td><strong style="font-family: var(--font-mono); color: #34d399;">${r.currency} ${parseFloat(r.amount).toFixed(2)}</strong></td>
        <td>${r.currency}</td>
        <td class="admin-only-action" style="display: ${Auth.getCurrentUser()?.role === 'administrador' ? 'table-cell' : 'none'};">${Auth.getCurrentUser()?.role === 'administrador'
          ? `<button class="btn btn-secondary btn-sm" onclick="App.openEditRate('${r.id}')">✏️ Editar</button>`
          : ''}</td>
      </tr>
    `}).join('');
  },

  async handleCreateRate(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const rateId = form.dataset.editId;
    const payload = {
      product_id: document.getElementById('rate-product-id').value,
      amount: parseFloat(document.getElementById('rate-amount').value),
      currency: document.getElementById('rate-currency').value
    };

    try {
      if (rateId) await API.updateRate(rateId, payload);
      else await API.createRate(payload);
      UI.closeModal('modal-new-rate');
      UI.showToast(rateId ? 'Tarifa actualizada con éxito' : 'Tarifa registrada con éxito', 'success');
      form.reset();
      delete form.dataset.editId;
      document.getElementById('rate-modal-title').textContent = 'Registrar Nueva Tarifa';
      document.getElementById('rate-submit-label').textContent = 'Guardar Tarifa';
      await this.loadInitialData();
      this.renderRatesList();
    } catch (error) {
      UI.showToast(`Error al registrar tarifa: ${error.message}`, 'error');
    }
  },

  // ==========================================
  // EXPORTAR PDF
  // ==========================================
  exportPDF(quotationId) {
    const q = this.state.quotations.find(item => item.id === quotationId);
    if (!q) {
      UI.showToast('Cotización no encontrada', 'error');
      return;
    }
    PDFGenerator.generateQuotationPDF(q);
  }
};

// Arrancar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  window.App = App;
  App.init();
});
