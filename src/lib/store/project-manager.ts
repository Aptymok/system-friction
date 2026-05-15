import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface Milestone {
  id?: string;
  name: string;
  dueDate: Date;
  completed: boolean;
}

export class ProjectManager {
  private supabase = createServerSupabaseClient();

  async addMilestone(nodeId: string, name: string, dueDate: Date) {
    const supabase = await this.supabase;
    const { data, error } = await supabase
      .from('actions')
      .insert({
        node_id: nodeId,
        description: name,
        verification_criterion: 'Fecha límite',
        due_at: dueDate.toISOString(),
        status: 'pending'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async markCompleted(actionId: string) {
    const supabase = await this.supabase;
    const { error } = await supabase
      .from('actions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', actionId);
    if (error) throw error;
  }

  async getFPD(nodeId: string): Promise<Date | null> {
    const supabase = await this.supabase;
    const { data } = await supabase
      .from('actions')
      .select('due_at')
      .eq('node_id', nodeId)
      .eq('status', 'pending')
      .order('due_at', { ascending: false });
    if (!data?.length) return null;
    return new Date(Math.max(...data.map(a => new Date(a.due_at).getTime())));
  }
}