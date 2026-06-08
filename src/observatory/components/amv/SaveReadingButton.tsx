'use client'

export function SaveReadingButton({ scope }: { scope: string }) {
  return (
    <button type="button" className="border border-[#8a7035]/40 px-3 py-2 text-xs text-[#d7cdb8]" onClick={() => void fetch('/api/amv/save-reading', { method: 'POST', body: JSON.stringify({ scope }), headers: { 'content-type': 'application/json' } })}>
      Save reading
    </button>
  )
}
