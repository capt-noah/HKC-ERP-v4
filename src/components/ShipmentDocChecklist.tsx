import React, { useState } from "react"
import { CheckCircle2, AlertCircle, FileText, Upload, Trash2, ExternalLink, ShieldCheck, ShieldAlert, Sparkles, UserCheck } from "lucide-react"
import {
  type ShipmentDocAttachment,
  type ShipmentDocEvaluation,
  uploadShipmentDoc,
  deleteShipmentDoc,
} from "@/lib/shipmentDocumentEngine"

interface ShipmentDocChecklistProps {
  recordId: string
  recordType: "purchase_order" | "sales_order"
  evaluation: ShipmentDocEvaluation
  attachments: ShipmentDocAttachment[]
  onAttachmentsChange: (updated: ShipmentDocAttachment[]) => void
  readOnly?: boolean
}

export const ShipmentDocChecklist: React.FC<ShipmentDocChecklistProps> = ({
  recordId,
  recordType,
  evaluation,
  attachments,
  onAttachmentsChange,
  readOnly = false,
}) => {
  const [selectedDocType, setSelectedDocType] = useState<string>("")
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetDocType?: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const docTypeToUse = targetDocType || selectedDocType || "Commercial Invoice"
    setIsUploading(true)
    setUploadError(null)

    try {
      // Convert file to base64 preview URL
      const reader = new FileReader()
      reader.onload = async () => {
        const fileUrl = (reader.result as string) || ""
        const payload: Partial<ShipmentDocAttachment> = {
          record_id: recordId,
          record_type: recordType,
          document_type: docTypeToUse,
          file_name: file.name,
          file_size: file.size,
          file_url: fileUrl,
          uploaded_at: new Date().toISOString(),
          uploaded_by: "Current User",
        }

        const created = await uploadShipmentDoc(payload)
        onAttachmentsChange([...attachments, created])
        setIsUploading(false)
        setSelectedDocType("")
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.")
      setIsUploading(false)
    }
  }

  const handleDelete = async (docId: string) => {
    try {
      await deleteShipmentDoc(docId)
      onAttachmentsChange(attachments.filter((a) => a.id !== docId))
    } catch (err) {
      console.error("Failed to delete document:", err)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* ── Top Executive Compliance Header ─────────────────────────────────────── */}
      <div
        className={`p-5 rounded-2xl border transition-all duration-300 ${
          evaluation.isComplete
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
            : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                evaluation.isComplete ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
              }`}
            >
              {evaluation.isComplete ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base tracking-tight">
                  {recordType === "purchase_order" ? "Import Shipment Clearance Checklist" : "Export / Shipping Clearance Checklist"}
                </h4>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    evaluation.isComplete
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {evaluation.isComplete ? "Gate Passed" : "Gate Locked"}
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {evaluation.isComplete
                  ? `All ${evaluation.totalRequired} mandatory trade documents attached & verified.`
                  : `${evaluation.satisfiedCount} of ${evaluation.totalRequired} satisfied — ${evaluation.missingCount} mandatory document(s) missing before dispatch.`}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black font-mono">
              {evaluation.satisfiedCount}/{evaluation.totalRequired}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">Clearance Progress</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              evaluation.isComplete ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{
              width: `${evaluation.totalRequired > 0 ? (evaluation.satisfiedCount / evaluation.totalRequired) * 100 : 100}%`,
            }}
          />
        </div>
      </div>

      {/* Read-Only HKC Docs Shortcut Banner */}
      {readOnly && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-semibold text-blue-950 dark:text-blue-200">
              Managed centrally in <span className="font-bold">HKC Docs</span> by assigned Customs Specialist.
            </span>
          </div>
          <a
            href={`/sales/hkc-docs?recordId=${recordId}`}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 shadow-xs transition-all shrink-0 flex items-center gap-1.5"
          >
            Open HKC Docs <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {/* ── Two-Column Attached vs Missing Section ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* LEFT COLUMN: Satisfied & Attached Documents */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h5 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Attached & Verified ({evaluation.satisfied.length})
            </h5>
          </div>

          {evaluation.satisfied.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-1">
              <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-xs font-medium text-zinc-500">No clearance documents attached yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {evaluation.satisfied.map(({ document_type, file }) => (
                <div
                  key={file.id}
                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md flex items-center justify-between group hover:border-emerald-500/40 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{file.file_name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                          {document_type}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                        <span>{formatBytes(file.file_size)}</span>
                        <span>•</span>
                        <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {file.file_url && (
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Preview Document"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {!readOnly && (
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Missing Mandatory Documents */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h5 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Missing Requirements ({evaluation.missing.length})
            </h5>
          </div>

          {evaluation.missing.length === 0 ? (
            <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-1">
              <Sparkles className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Clearance Checklist Complete!</p>
              <p className="text-[11px] text-zinc-500">All required transaction documents have been attached.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {evaluation.missing.map(({ document_type, reason }) => (
                <div
                  key={document_type}
                  className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-amber-900 dark:text-amber-200">{document_type}</div>
                    <div className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mt-0.5">{reason}</div>
                  </div>

                  {!readOnly && (
                    <label className="shrink-0 cursor-pointer px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 shadow-sm transition-all flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, document_type)}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Custom Document Upload Dropzone ──────────────────────────────── */}
      {!readOnly && (
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Attach Custom Trade Document</div>
              <div className="text-[10px] text-zinc-500">Attach additional shipping paperwork or custom manifests</div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium"
            >
              <option value="">Select Document Type...</option>
              <option value="Commercial Invoice">Commercial Invoice</option>
              <option value="Packing List">Packing List</option>
              <option value="Bill of Lading / Airway Bill">Bill of Lading / Airway Bill</option>
              <option value="Certificate of Origin">Certificate of Origin</option>
              <option value="Certificate of Analysis (COA)">Certificate of Analysis (COA)</option>
              <option value="Customs Declaration">Customs Declaration</option>
              <option value="Insurance Certificate">Insurance Certificate</option>
              <option value="Other Clearance Document">Other Clearance Document</option>
            </select>

            <label className="cursor-pointer px-4 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs hover:opacity-90 transition-all shrink-0">
              {isUploading ? "Uploading..." : "Choose File"}
              <input type="file" className="hidden" onChange={(e) => handleFileUpload(e)} disabled={isUploading} />
            </label>
          </div>
        </div>
      )}

      {uploadError && <p className="text-xs font-bold text-red-500 px-1">{uploadError}</p>}
    </div>
  )
}
