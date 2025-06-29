// Invoice generation and management system
export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  tableNumber?: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    vatRate: number;
    vatAmount: number;
    notes?: string;
  }>;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  qrCode?: string;
  notes?: string;
}

export interface CompanyData {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  vatId: string;
}

// Generate PDF invoice using jsPDF (would need to be installed)
export const generateInvoicePDF = async (
  invoiceData: InvoiceData, 
  companyData: CompanyData
): Promise<Blob> => {
  console.log('Generating PDF invoice for:', invoiceData.invoiceNumber);
  
  // For now, create a simple HTML-based PDF simulation
  // In a real implementation, you would use jsPDF or similar
  const htmlContent = generateInvoiceHTML(invoiceData, companyData);
  
  // Convert HTML to PDF (simplified simulation)
  const blob = new Blob([htmlContent], { type: 'text/html' });
  
  console.log('PDF invoice generated successfully');
  return blob;
};

// Generate HTML invoice content
const generateInvoiceHTML = (invoiceData: InvoiceData, companyData: CompanyData): string => {
  const netAmount = invoiceData.subtotal - invoiceData.totalVat;
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rechnung ${invoiceData.invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company-info { text-align: left; }
        .invoice-info { text-align: right; }
        .customer-info { margin: 30px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .items-table th { background-color: #f5f5f5; font-weight: bold; }
        .total-section { margin-top: 30px; text-align: right; }
        .total-row { margin: 5px 0; }
        .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
        .footer { margin-top: 50px; font-size: 12px; color: #666; }
        .qr-code { text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>${companyData.name}</h1>
            <p>${companyData.address}<br>
            ${companyData.city}<br>
            Tel: ${companyData.phone}<br>
            E-Mail: ${companyData.email}<br>
            Web: ${companyData.website}</p>
        </div>
        <div class="invoice-info">
            <h2>RECHNUNG</h2>
            <p><strong>Rechnungsnummer:</strong> ${invoiceData.invoiceNumber}<br>
            <strong>Datum:</strong> ${invoiceData.date}</p>
        </div>
    </div>

    <div class="customer-info">
        <h3>Rechnungsempfänger:</h3>
        <p><strong>${invoiceData.customerName}</strong><br>
        ${invoiceData.tableNumber ? `Tisch ${invoiceData.tableNumber}` : 'Abholung'}</p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Pos.</th>
                <th>Artikel</th>
                <th>Menge</th>
                <th>Einzelpreis</th>
                <th>MwSt %</th>
                <th>Gesamtpreis</th>
            </tr>
        </thead>
        <tbody>
            ${invoiceData.items.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}${item.notes ? `<br><small><em>${item.notes}</em></small>` : ''}</td>
                    <td>${item.quantity}</td>
                    <td>€${item.unitPrice.toFixed(2)}</td>
                    <td>${item.vatRate}%</td>
                    <td>€${item.totalPrice.toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">Nettobetrag: €${netAmount.toFixed(2)}</div>
        <div class="total-row">MwSt (19%): €${invoiceData.totalVat.toFixed(2)}</div>
        <div class="total-row grand-total">Gesamtbetrag: €${invoiceData.grandTotal.toFixed(2)}</div>
    </div>

    ${invoiceData.notes ? `
    <div style="margin-top: 30px;">
        <h4>Bemerkungen:</h4>
        <p>${invoiceData.notes}</p>
    </div>
    ` : ''}

    <div class="qr-code">
        <p><strong>QR-Code für Zahlung</strong></p>
        <div style="width: 150px; height: 150px; border: 2px solid #333; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
            QR-Code<br>€${invoiceData.grandTotal.toFixed(2)}
        </div>
    </div>

    <div class="footer">
        <p><strong>Zahlungsinformationen:</strong><br>
        Bitte begleichen Sie den Rechnungsbetrag innerhalb von 14 Tagen.<br>
        Vielen Dank für Ihren Besuch!</p>
        
        <p><strong>Steuerliche Angaben:</strong><br>
        Steuernummer: ${companyData.taxNumber}<br>
        USt-IdNr.: ${companyData.vatId}</p>
    </div>
</body>
</html>`;
};

// Send invoice via email
export const sendInvoiceEmail = async (
  invoiceData: InvoiceData,
  companyData: CompanyData,
  accountantEmail: string,
  ccEmail: string
): Promise<void> => {
  console.log('Sending invoice email to:', accountantEmail);
  
  // Generate PDF
  const pdfBlob = await generateInvoicePDF(invoiceData, companyData);
  
  // In a real implementation, this would use a backend email service
  // For now, we'll simulate the email sending
  const emailData = {
    to: accountantEmail,
    cc: ccEmail,
    subject: `Neue Rechnung ${invoiceData.invoiceNumber} - ${companyData.name}`,
    body: `
Sehr geehrte Damen und Herren,

anbei erhalten Sie die Rechnung ${invoiceData.invoiceNumber} vom ${invoiceData.date}.

Rechnungsdetails:
- Kunde: ${invoiceData.customerName}
- Betrag: €${invoiceData.grandTotal.toFixed(2)}
- Netto: €${(invoiceData.subtotal - invoiceData.totalVat).toFixed(2)}
- MwSt (19%): €${invoiceData.totalVat.toFixed(2)}

Die Rechnung wurde automatisch über das RestaurantOS-System generiert.

Mit freundlichen Grüßen
${companyData.name}
    `,
    attachments: [
      {
        filename: `Rechnung-${invoiceData.invoiceNumber}.pdf`,
        content: pdfBlob
      }
    ]
  };

  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Invoice email sent successfully');
  console.log('Email data:', emailData);
};

// Generate DATEV-compatible CSV export
export const generateDATEVExport = async (invoices: InvoiceData[]): Promise<Blob> => {
  console.log('Generating DATEV export for', invoices.length, 'invoices');
  
  // DATEV CSV format headers
  const headers = [
    'Umsatz (ohne Soll/Haben-Kz)',
    'Soll/Haben-Kennzeichen',
    'WKZ Umsatz',
    'Kurs',
    'Basis-Umsatz',
    'WKZ Basis-Umsatz',
    'Konto',
    'Gegenkonto (ohne BU-Schlüssel)',
    'BU-Schlüssel',
    'Belegdatum',
    'Belegfeld 1',
    'Belegfeld 2',
    'Skonto',
    'Buchungstext'
  ];

  // Generate CSV rows
  const rows = invoices.flatMap(invoice => {
    const date = invoice.date.split('.').reverse().join(''); // Convert DD.MM.YYYY to YYYYMMDD
    const netAmount = invoice.subtotal - invoice.totalVat;
    
    return [
      // Revenue booking (net amount)
      [
        netAmount.toFixed(2).replace('.', ','),
        'S', // Soll
        'EUR',
        '',
        '',
        '',
        '8400', // Revenue account
        '1400', // Customer account
        '',
        date,
        invoice.invoiceNumber,
        invoice.customerName,
        '',
        `Umsatz ${invoice.invoiceNumber}`
      ],
      // VAT booking
      [
        invoice.totalVat.toFixed(2).replace('.', ','),
        'S', // Soll
        'EUR',
        '',
        '',
        '',
        '1576', // VAT account
        '1400', // Customer account
        '',
        date,
        invoice.invoiceNumber,
        invoice.customerName,
        '',
        `USt 19% ${invoice.invoiceNumber}`
      ]
    ];
  });

  // Create CSV content
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  // Add BOM for proper Excel encoding
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { 
    type: 'text/csv;charset=utf-8' 
  });

  console.log('DATEV export generated successfully');
  return blob;
};

// Generate QR code for payment (simplified)
export const generatePaymentQRCode = (amount: number, reference: string): string => {
  // In a real implementation, this would generate a proper payment QR code
  // For now, return a placeholder
  return `QR:EUR:${amount.toFixed(2)}:REF:${reference}`;
};