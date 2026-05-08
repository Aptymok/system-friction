import { NextRequest, NextResponse } from 'next/server'
import { getAudits, getNode } from '@/lib/store/runtimeStore'
import { createServiceSupabaseClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceSupabaseClient()
  if (supabase) {
    const { data: node } = await supabase.from('nodes').select('*').eq('id', id).single()
    if (node) {
      const [{ data: audits }, { data: memoryFacts }, { data: actions }] = await Promise.all([
        supabase.from('audits').select('*').eq('node_id', id).order('created_at', { ascending: false }).limit(50),
        supabase.from('memory_facts').select('*').eq('node_id', id).order('last_seen_at', { ascending: false }).limit(50),
        supabase.from('actions').select('*').eq('node_id', id).order('created_at', { ascending: false }).limit(30)
      ])
      return NextResponse.json({ node, audits: audits || [], memory_facts: memoryFacts || [], actions: actions || [] })
    }
  }

  const node = getNode(id)
  if (!node) return NextResponse.json({ error: 'Nodo no encontrado' }, { status: 404 })
  return NextResponse.json({ node, audits: getAudits(node.id) })
}
