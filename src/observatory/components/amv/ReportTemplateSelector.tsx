import { listAmvReportTemplates } from '@/lib/amv/registry/reportTemplateRegistry'

export function ReportTemplateSelector() {
  return (
    <div className="flex flex-wrap gap-2">
      {listAmvReportTemplates().map((template) => (
        <button key={template.id} type="button" className="border border-[#8a7035]/30 px-2 py-1 text-xs text-[#d7cdb8]">
          {template.title}
        </button>
      ))}
    </div>
  )
}
