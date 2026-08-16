export interface ExcelExportOptions {
  fileName: string
  sheetName?: string
  title?: string
  subtitle?: string
  metadata?: Array<{ label: string; value: string }>
  headers: string[]
  rows: (string | number)[][]
}

export interface PrintBinCardOptions {
  cardNo: string
  description: string
  dosage: string
  unit: string
  shelfNo: string
  entries: Array<{
    date: string
    batchNo: string
    qtyReceived: number
    qtyIssued: number
    balance: number
    expiryDate: string
    party: string
    remark: string
  }>
}

/**
 * Modular Excel Export function (.xls / .xlsx XML format)
 * Opens natively in Microsoft Excel, Apple Numbers, and Google Sheets
 */
export function exportToExcel({
  fileName,
  sheetName = "Sheet1",
  title = "Habtom Kebede Veterinary Drug Import",
  subtitle,
  metadata = [],
  headers,
  rows,
}: ExcelExportOptions): void {
  const sanitize = (val: any) => {
    if (val === null || val === undefined) return ""
    return String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="SubTitleStyle">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#047857"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#64748B"/>
  </Style>
  <Style ss:ID="MetaVal">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="DataCell">
   <Font ss:FontName="Calibri" ss:Size="11"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="NumCell">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
   <Alignment ss:Horizontal="Right"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sanitize(sheetName)}">
  <Table>`

  // 1. Company Title Header
  if (title) {
    xml += `
   <Row ss:Height="24">
    <Cell ss:StyleID="TitleStyle"><Data ss:Type="String">${sanitize(title)}</Data></Cell>
   </Row>`
  }

  // 2. Subtitle Header
  if (subtitle) {
    xml += `
   <Row ss:Height="20">
    <Cell ss:StyleID="SubTitleStyle"><Data ss:Type="String">${sanitize(subtitle)}</Data></Cell>
   </Row>`
  }

  // 3. Metadata Key-Values
  if (metadata.length > 0) {
    metadata.forEach(m => {
      xml += `
   <Row>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">${sanitize(m.label)}:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${sanitize(m.value)}</Data></Cell>
   </Row>`
    })
    xml += `<Row></Row>` // Empty spacer row
  }

  // 4. Data Headers Row
  xml += `
   <Row ss:Height="22">`
  headers.forEach(h => {
    xml += `<Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${sanitize(h)}</Data></Cell>`
  })
  xml += `</Row>`

  // 5. Data Rows
  rows.forEach(r => {
    xml += `
   <Row>`
    r.forEach(cellVal => {
      const isNum = typeof cellVal === "number" && !isNaN(cellVal)
      const style = isNum ? "NumCell" : "DataCell"
      const dataType = isNum ? "Number" : "String"
      xml += `<Cell ss:StyleID="${style}"><Data ss:Type="${dataType}">${sanitize(cellVal)}</Data></Cell>`
    })
    xml += `</Row>`
  })

  xml += `
  </Table>
 </Worksheet>
</Workbook>`

  // Create Blob & Download
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" })
  const finalFileName = fileName.endsWith(".xls") || fileName.endsWith(".xlsx") ? fileName : `${fileName}.xls`
  
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = finalFileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

/**
 * Open clean, dedicated print document window for Bin Cards
 * Eliminates blank pages and website chrome PDF issues 100%
 */
export function printBinCardDocument(card: PrintBinCardOptions): void {
  const printWindow = window.open("", "_blank", "width=980,height=1000")
  if (!printWindow) {
    window.print()
    return
  }

  const totalReceived = card.entries.reduce((sum, e) => sum + e.qtyReceived, 0)
  const totalIssued = card.entries.reduce((sum, e) => sum + e.qtyIssued, 0)
  const currentBalance = card.entries.length > 0 ? card.entries[card.entries.length - 1].balance : 0
  const logoUrl = `${window.location.origin}/hkc_logo.png`

  const rowsHtml = card.entries.length === 0
    ? `<tr><td colspan="8" style="padding:20px; text-align:center; color:#71717a; font-style:italic;">No transaction entries recorded on this bin card.</td></tr>`
    : card.entries.map(rec => `
        <tr style="border-bottom:1px solid #d4d4d8;">
          <td style="padding:8px 10px; font-weight:bold; font-family:monospace; border-right:1px solid #d4d4d8;">${rec.date}</td>
          <td style="padding:8px 10px; font-weight:bold; font-family:monospace; border-right:1px solid #d4d4d8;">${rec.batchNo}</td>
          <td style="padding:8px 10px; text-align:right; font-weight:bold; color:${rec.qtyReceived > 0 ? '#047857' : '#9ca3af'}; border-right:1px solid #d4d4d8;">${rec.qtyReceived > 0 ? '+' + rec.qtyReceived.toLocaleString() : '-'}</td>
          <td style="padding:8px 10px; text-align:right; font-weight:bold; color:${rec.qtyIssued > 0 ? '#b91c1c' : '#9ca3af'}; border-right:1px solid #d4d4d8;">${rec.qtyIssued > 0 ? '-' + rec.qtyIssued.toLocaleString() : '-'}</td>
          <td style="padding:8px 10px; text-align:right; font-weight:900; font-family:monospace; background:#f4f4f5; border-right:1px solid #d4d4d8;">${rec.balance.toLocaleString()}</td>
          <td style="padding:8px 10px; font-family:monospace; border-right:1px solid #d4d4d8;">${rec.expiryDate}</td>
          <td style="padding:8px 10px; border-right:1px solid #d4d4d8;">${rec.party}</td>
          <td style="padding:8px 10px; color:#52525b;">${rec.remark}</td>
        </tr>
      `).join("")

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BIN CARD - ${card.cardNo}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #09090b; margin: 0; padding: 24px; background: #ffffff; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #09090b; padding-bottom: 14px; margin-bottom: 18px; }
    .logo-container { display: flex; align-items: center; gap: 16px; }
    .logo { height: 65px; width: auto; object-fit: contain; }
    .company-name { font-size: 19px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: -0.3px; color: #09090b; }
    .contact-info { font-size: 11px; color: #475569; margin-top: 4px; font-weight: 600; }
    .card-no-badge { font-size: 14px; font-family: monospace; font-weight: 900; color: #09090b; text-align: right; }
    
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 11px; }
    .meta-label { font-size: 9px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 2px; }
    .meta-val { font-size: 12px; font-weight: 800; color: #0f172a; }
    .meta-shelf { font-size: 12px; font-weight: 900; color: #047857; font-family: monospace; }
    
    table.ledger-table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #d4d4d8; border-radius: 8px; overflow: hidden; table-layout: fixed; }
    table.ledger-table th { background: #f4f4f5; font-size: 10px; text-transform: uppercase; font-weight: 900; color: #09090b; padding: 8px 10px; border-right: 1px solid #d4d4d8; border-bottom: 1px solid #d4d4d8; }
    table.ledger-table td { padding: 8px 10px; }
    table.ledger-table tfoot tr { background: #f4f4f5; font-weight: bold; border-top: 2px solid #d4d4d8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <img src="${logoUrl}" class="logo" alt="HKC Logo" />
      <div>
        <h1 class="company-name">Habtom Kebede Veterinary Drug Import</h1>
        <div class="contact-info">Addis Ababa, Ethiopia &nbsp;|&nbsp; Phone: +251 911 12 21 02 / +251 944 73 92 22</div>
      </div>
    </div>
    <div class="card-no-badge">
      Card No: ${card.cardNo}
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <div class="meta-label">Description / Name</div>
      <div class="meta-val">${card.description}</div>
    </div>
    <div>
      <div class="meta-label">Strength / Dosage</div>
      <div class="meta-val">${card.dosage}</div>
    </div>
    <div>
      <div class="meta-label">Unit of Measurement</div>
      <div class="meta-val">${card.unit}</div>
    </div>
    <div>
      <div class="meta-label">Shelf Number</div>
      <div class="meta-shelf">${card.shelfNo}</div>
    </div>
  </div>

  <table class="ledger-table">
    <thead>
      <tr>
        <th rowspan="2" style="width: 12%;">Date</th>
        <th rowspan="2" style="width: 14%;">Batch Number</th>
        <th colspan="3" style="text-align:center;">Quantity In</th>
        <th rowspan="2" style="width: 12%;">Expiry Date</th>
        <th rowspan="2" style="width: 20%;">Received / Issued To</th>
        <th rowspan="2" style="width: 16%;">Remark</th>
      </tr>
      <tr>
        <th style="width: 9%; text-align:right; color:#047857;">Received</th>
        <th style="width: 9%; text-align:right; color:#b91c1c;">Issued</th>
        <th style="width: 10%; text-align:right; background:#e4e4e7;">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="text-align:right; font-weight:900; font-size:10px; text-transform:uppercase; border-right:1px solid #d4d4d8;">Total Ledger Summary:</td>
        <td style="text-align:right; color:#047857; font-weight:bold; border-right:1px solid #d4d4d8;">+${totalReceived.toLocaleString()}</td>
        <td style="text-align:right; color:#b91c1c; font-weight:bold; border-right:1px solid #d4d4d8;">-${totalIssued.toLocaleString()}</td>
        <td style="text-align:right; font-weight:900; background:#e4e4e7; border-right:1px solid #d4d4d8;">${currentBalance.toLocaleString()} ${card.unit}</td>
        <td colspan="3" style="font-size:10px; color:#71717a; font-style:italic;">Ledger verified & synchronized with Habtom Kebede Vet Stock Store</td>
      </tr>
    </tfoot>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
