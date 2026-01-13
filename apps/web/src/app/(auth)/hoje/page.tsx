import { createServerClient } from '@/lib/supabase/server';
import { TodayView } from './today-view';

export default async function HojePage() {
  const supabase = createServerClient();

  // Get current user profile
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_uid', user?.id)
    .single();

  // Fetch tasks grouped by priority
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      customer:customers(id, company_name, trade_name, contact_name, phone, email, lifecycle_status),
      seller:profiles(id, full_name, avatar_url)
    `)
    .in('status', ['PENDING', 'IN_PROGRESS'])
    .order('priority_bucket', { ascending: true })
    .order('priority_score', { ascending: false })
    .limit(100);

  // Group tasks by priority bucket
  const tasksByBucket = {
    P1: (tasks || []).filter((t) => t.priority_bucket === 'P1'),
    P2: (tasks || []).filter((t) => t.priority_bucket === 'P2'),
    P3: (tasks || []).filter((t) => t.priority_bucket === 'P3'),
    P4: (tasks || []).filter((t) => t.priority_bucket === 'P4'),
  };

  // Get task counts
  const counts = {
    P1: tasksByBucket.P1.length,
    P2: tasksByBucket.P2.length,
    P3: tasksByBucket.P3.length,
    P4: tasksByBucket.P4.length,
    total: (tasks || []).length,
  };

  return (
    <TodayView
      tasks={tasks || []}
      tasksByBucket={tasksByBucket}
      counts={counts}
      isManager={profile?.role === 'admin' || profile?.role === 'manager'}
    />
  );
}
