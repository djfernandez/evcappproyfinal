// ==========================================================
// NEXUS SAC - GENERADOR PROFESIONAL DE COTIZACIONES EN PDF
// ==========================================================

const PDFGenerator = {
  // Generar vista imprimible y descargar como PDF
  generateQuotationPDF(quotation) {
    if (!quotation) {
      UI.showToast('No se encontró información de la cotización para exportar.', 'error');
      return;
    }

    const client = quotation.clients || {};
    const items = quotation.quotation_items || quotation.items || [];
    const currencySymbol = quotation.currency === 'USD' ? '$' : 'S/';

    // Si la librería jsPDF está cargada
    if (window.jspdf && window.jspdf.jsPDF) {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Encabezado Nexus SAC
        doc.setFillColor(15, 23, 42); // Navy 900
        doc.rect(0, 0, 210, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('NEXUS SAC', 14, 18);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('RUC: 20601289451 | Av. Rivera Navarrete 501, San Isidro, Lima', 14, 25);
        doc.text('ventas@nexussac.pe | Tel: (01) 612-4000', 14, 30);

        // Bloque Número de Cotización
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`COTIZACIÓN N° ${quotation.quotation_number}`, 14, 47);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha Emisión: ${quotation.quotation_date}`, 14, 53);
        doc.text(`Válido hasta: ${quotation.due_date}`, 14, 58);
        doc.text(`Moneda: ${quotation.currency}`, 14, 63);
        doc.text(`Estado: ${quotation.status.toUpperCase()}`, 140, 53);

        // Bloque Cliente
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 68, 182, 28, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('DATOS DEL CLIENTE', 18, 75);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Razón Social / Nombre: ${client.full_name || 'Cliente'}`, 18, 81);
        doc.text(`${client.doc_type || 'Doc'}: ${client.doc_number || '-'}`, 18, 86);
        doc.text(`Dirección: ${client.address || 'No especificada'}`, 18, 91);
        doc.text(`Teléfono: ${client.phone || '-'}`, 140, 86);

        // Tabla de Ítems
        let y = 105;
        doc.setFillColor(30, 41, 59);
        doc.rect(14, y, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Descripción / Producto', 18, y + 5.5);
        doc.text('Cant.', 120, y + 5.5);
        doc.text('P. Unit.', 142, y + 5.5);
        doc.text('Subtotal', 170, y + 5.5);

        y += 10;
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');

        items.forEach((item) => {
          const prodName = item.products?.name || item.product_name || 'Ítem de Cotización';
          doc.text(prodName.substring(0, 55), 18, y);
          doc.text(String(item.quantity), 125, y);
          doc.text(`${currencySymbol} ${parseFloat(item.unit_price).toFixed(2)}`, 142, y);
          doc.text(`${currencySymbol} ${parseFloat(item.subtotal).toFixed(2)}`, 170, y);
          y += 7;
        });

        // Totales
        y += 5;
        doc.setDrawColor(203, 213, 225);
        doc.line(120, y, 196, y);
        y += 6;

        doc.setFontSize(9);
        doc.text('Subtotal:', 125, y);
        doc.text(`${currencySymbol} ${parseFloat(quotation.subtotal).toFixed(2)}`, 170, y);
        y += 6;

        if (quotation.discount_amount > 0) {
          doc.text(`Descuento (${quotation.discount_percent}%):`, 125, y);
          doc.text(`-${currencySymbol} ${parseFloat(quotation.discount_amount).toFixed(2)}`, 170, y);
          y += 6;
        }

        doc.text('I.G.V. (18%):', 125, y);
        doc.text(`${currencySymbol} ${parseFloat(quotation.igv).toFixed(2)}`, 170, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('TOTAL:', 125, y);
        doc.text(`${currencySymbol} ${parseFloat(quotation.total).toFixed(2)}`, 168, y);

        // Notas y Referencias
        if (quotation.references_text) {
          y += 15;
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text(`Referencias / Observaciones: ${quotation.references_text}`, 14, y);
        }

        // Pie de página
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Este documento es una cotización comercial emitida por Nexus SAC y está sujeta a los términos y condiciones de venta.', 14, 280);

        // Guardar archivo
        doc.save(`Cotizacion_Nexus_${quotation.quotation_number}.pdf`);
        UI.showToast(`PDF de la cotización ${quotation.quotation_number} descargado correctamente`, 'success');
        return;
      } catch (err) {
        console.warn('Error con jsPDF nativo, usando render HTML de impresión:', err);
      }
    }

    // Alternativa autónoma con ventana de impresión estándar formateada
    this.openPrintWindow(quotation);
  },

  openPrintWindow(quotation) {
    const client = quotation.clients || {};
    const items = quotation.quotation_items || quotation.items || [];
    const currencySymbol = quotation.currency === 'USD' ? '$' : 'S/';

    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (!printWin) {
      UI.showToast('Por favor permite ventanas emergentes para generar el documento imprimible.', 'warning');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cotización ${quotation.quotation_number} - Nexus SAC</title>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; margin: 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0f172a; padding-bottom: 20px; }
          .logo h1 { color: #1e3a8a; margin: 0 0 5px 0; font-size: 26px; }
          .logo p { margin: 2px 0; font-size: 13px; color: #64748b; }
          .quote-info { text-align: right; }
          .quote-title { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 5px; }
          .client-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 25px 0; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .table th { background: #0f172a; color: white; padding: 10px; text-align: left; font-size: 13px; }
          .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .totals { width: 320px; margin-left: auto; margin-top: 20px; font-size: 14px; }
          .totals td { padding: 6px; }
          .grand-total { font-size: 18px; font-weight: bold; color: #1e3a8a; border-top: 2px solid #0f172a; }
          .footer { margin-top: 50px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 11px; text-align: center; color: #94a3b8; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
            🖨️ Imprimir / Guardar como PDF
          </button>
        </div>
        <div class="header">
          <div class="logo">
            <h1>NEXUS S.A.C.</h1>
            <p>RUC: 20601289451 | Av. Rivera Navarrete 501, San Isidro, Lima</p>
            <p>ventas@nexussac.pe | Tel: (01) 612-4000</p>
          </div>
          <div class="quote-info">
            <div class="quote-title">COTIZACIÓN N° ${quotation.quotation_number}</div>
            <div><strong>Fecha:</strong> ${quotation.quotation_date}</div>
            <div><strong>Válido hasta:</strong> ${quotation.due_date}</div>
            <div><strong>Estado:</strong> <span style="text-transform:uppercase; color: ${quotation.status === 'aprobado' ? '#059669' : '#d97706'}">${quotation.status}</span></div>
          </div>
        </div>

        <div class="client-box">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #334155;">DATOS DEL CLIENTE</h3>
          <div><strong>Razón Social / Nombre:</strong> ${client.full_name || 'Cliente General'}</div>
          <div><strong>${client.doc_type || 'Documento'}:</strong> ${client.doc_number || '-'}</div>
          <div><strong>Dirección:</strong> ${client.address || 'No especificada'}</div>
          <div><strong>Teléfono:</strong> ${client.phone || '-'}</div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Producto / Descripción</th>
              <th style="text-align: center;">Cantidad</th>
              <th style="text-align: right;">Precio Unitario</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td>${it.products?.name || it.product_name || 'Ítem'}</td>
                <td style="text-align: center;">${it.quantity}</td>
                <td style="text-align: right;">${currencySymbol} ${parseFloat(it.unit_price).toFixed(2)}</td>
                <td style="text-align: right;">${currencySymbol} ${parseFloat(it.subtotal).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="totals">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">${currencySymbol} ${parseFloat(quotation.subtotal).toFixed(2)}</td>
          </tr>
          ${quotation.discount_amount > 0 ? `
            <tr style="color: #d97706;">
              <td>Descuento (${quotation.discount_percent}%):</td>
              <td style="text-align: right;">-${currencySymbol} ${parseFloat(quotation.discount_amount).toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr>
            <td>I.G.V. (18%):</td>
            <td style="text-align: right;">${currencySymbol} ${parseFloat(quotation.igv).toFixed(2)}</td>
          </tr>
          <tr class="grand-total">
            <td>TOTAL:</td>
            <td style="text-align: right;">${currencySymbol} ${parseFloat(quotation.total).toFixed(2)}</td>
          </tr>
        </table>

        ${quotation.references_text ? `
          <div style="margin-top: 30px; font-size: 12px; color: #64748b;">
            <strong>Referencias / Observaciones:</strong> ${quotation.references_text}
          </div>
        ` : ''}

        <div class="footer">
          Documento generado por el Sistema Nexus SAC B2B. Los precios incluyen entrega según términos acordados.
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  }
};
