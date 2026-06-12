import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

/**
 * LicenseDocument
 *
 * Shows a printable license certificate preview and allows PDF download.
 * Uses jsPDF for client-side generation.
 *
 * Props:
 *   open        {boolean}
 *   onClose     {function}
 *   tenant      {object}  — company_name, company_code
 *   license     {object}  — license_key, license_type, max_mailboxes, max_users, expires_at, activated_at
 */
export function LicenseDocument({ open, onClose, tenant, license }) {
  const [downloading, setDownloading] = useState(false)

  if (!tenant || !license) return null

  const issuedDate  = license.activated_at
    ? new Date(license.activated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  const expiryDate  = new Date(license.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const licenseYear = license.activated_at ? new Date(license.activated_at).getFullYear() : new Date().getFullYear()

  async function downloadPdf() {
    setDownloading(true)
    try {
      // Dynamic import so jsPDF is only loaded when needed
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const w = doc.internal.pageSize.getWidth()

      // Background header band
      doc.setFillColor(13, 21, 38) // #0d1526
      doc.rect(0, 0, w, 40, 'F')

      // Brand name
      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('FlowSentinel', 20, 20)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(163, 183, 220)
      doc.text('AP Mailbox Monitoring Platform', 20, 28)

      // Title
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(13, 21, 38)
      doc.text('Software License Certificate', 20, 60)

      // Horizontal rule
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(20, 66, w - 20, 66)

      // Helper to print a key-value row
      let y = 78
      function row(label, value) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139) // slate-500
        doc.text(label, 20, y)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 23, 42) // slate-900
        doc.text(value, 80, y)
        y += 10
      }

      row('Licensee',         tenant.company_name)
      row('Company Code',     tenant.company_code)
      row('License Type',     license.license_type)
      row('Max Mailboxes',    String(license.max_mailboxes))
      row('Max Users',        String(license.max_users))
      row('Issued Date',      issuedDate)
      row('Expiry Date',      expiryDate)
      y += 4
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('License Key', 20, y)
      doc.setFontSize(8)
      doc.setFont('courier', 'normal')
      doc.setTextColor(15, 23, 42)
      const keyLines = doc.splitTextToSize(license.license_key, w - 100)
      doc.text(keyLines, 80, y)
      y += 10 * keyLines.length + 4

      // Horizontal rule
      doc.setDrawColor(226, 232, 240)
      doc.line(20, y, w - 20, y)
      y += 10

      // Terms note
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(148, 163, 184)
      const terms = [
        `This license is granted to ${tenant.company_name} exclusively and is non-transferable.`,
        'Unauthorized reproduction, distribution, or sublicensing is prohibited.',
        `© ${licenseYear} FlowSentinel. All rights reserved.`,
      ]
      terms.forEach(line => {
        doc.text(line, 20, y)
        y += 6
      })

      // Footer
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text('https://flowsentinel.cloud', 20, 280)
      doc.text(`Generated ${new Date().toLocaleDateString()}`, w - 20, 280, { align: 'right' })

      doc.save(`FlowSentinel_License_${tenant.company_code}_${licenseYear}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="License Document" size="lg">
      {/* Preview */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
        {/* Header band */}
        <div className="px-6 py-4" style={{ background: '#0d1526' }}>
          <p className="text-white font-bold text-base">FlowSentinel</p>
          <p className="text-indigo-300/70 text-xs mt-0.5">AP Mailbox Monitoring Platform</p>
        </div>

        <div className="px-6 py-5 bg-white">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Software License Certificate</h3>
          <div className="border-t border-slate-200 my-3" />

          <div className="space-y-2 text-sm">
            <LicRow label="Licensee"      value={tenant.company_name} />
            <LicRow label="Company Code"  value={tenant.company_code} mono />
            <LicRow label="License Type"  value={license.license_type} />
            <LicRow label="Max Mailboxes" value={String(license.max_mailboxes)} />
            <LicRow label="Max Users"     value={String(license.max_users)} />
            <LicRow label="Issued Date"   value={issuedDate} />
            <LicRow label="Expiry Date"   value={expiryDate} />
            <div className="flex gap-3 pt-1">
              <span className="w-36 text-slate-500 shrink-0">License Key</span>
              <span className="font-mono text-xs text-slate-800 break-all bg-slate-50 px-2 py-1 rounded flex-1">{license.license_key}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-4 pt-3">
            <p className="text-xs text-slate-400 italic">
              This license is granted to {tenant.company_name} exclusively and is non-transferable.
              Unauthorized reproduction, distribution, or sublicensing is prohibited.
              © {licenseYear} FlowSentinel. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
          Close
        </button>
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
        >
          {downloading ? (
            <>Generating...</>
          ) : (
            <><Download className="h-4 w-4" /> Download PDF</>
          )}
        </button>
      </div>
    </Modal>
  )
}

function LicRow({ label, value, mono }) {
  return (
    <div className="flex gap-3">
      <span className="w-36 text-slate-500 shrink-0">{label}</span>
      <span className={`text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
