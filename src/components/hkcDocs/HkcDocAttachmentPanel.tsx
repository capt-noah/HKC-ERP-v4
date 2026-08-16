import React, { useRef } from "react"
import { File, Plus, X, Download } from "lucide-react"
import type { HkcDocAttachment } from "@/lib/erpStore"

interface HkcDocAttachmentPanelProps {
  attachments: HkcDocAttachment[]
  onAddAttachments: (newFiles: { fileName: string; fileUrl: string }[]) => void
  onRemoveAttachment: (attachmentId: string) => void
  isEditing?: boolean
}

export default function HkcDocAttachmentPanel({
  attachments,
  onAddAttachments,
  onRemoveAttachment,
}: HkcDocAttachmentPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    const promises = files.map((file) => {
      return new Promise<{ fileName: string; fileUrl: string }>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve({
            fileName: file.name,
            fileUrl: reader.result as string,
          })
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(promises).then((results) => {
      onAddAttachments(results)
      if (fileInputRef.current) fileInputRef.current.value = ""
    })
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const downloadAttachment = (fileName: string, fileUrl: string) => {
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/30 dark:bg-zinc-950/20">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          File Attachments ({attachments.length})
        </span>
        <button
          type="button"
          onClick={triggerFileSelect}
          className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-xs font-black inline-flex items-center gap-1 hover:border-zinc-300 active:scale-95 transition-all text-zinc-800 dark:text-zinc-200"
        >
          <Plus className="size-3.5 text-emerald-600" /> Add File
        </button>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <File className="size-6 text-zinc-400 mx-auto mb-1.5" />
          <p className="text-zinc-500 font-semibold text-[11px]">No files attached. Attach relevant documents above.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {attachments.map((file) => (
            <div
              key={file.attachmentId}
              className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-150/40 bg-white dark:bg-zinc-900 shadow-xs text-xs font-semibold"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <File className="size-4 text-zinc-400 shrink-0" />
                <span className="truncate text-zinc-800 dark:text-zinc-200 pr-2">
                  {file.fileName}
                </span>
                <span className="text-[9px] text-zinc-400 font-mono shrink-0">
                  {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : ""}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {file.fileUrl.startsWith("data:") && (
                  <button
                    type="button"
                    onClick={() => downloadAttachment(file.fileName, file.fileUrl)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 rounded-md"
                    title="Download attached file"
                  >
                    <Download className="size-3.5 text-emerald-600" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(file.attachmentId)}
                  className="p-1 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded-md"
                  title="Remove attachment"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
