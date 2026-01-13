import { createServerClient } from '@/lib/supabase/server';
import { KanbanView } from './kanban-view';

export default async function KanbanPage() {
  const supabase = createServerClient();

  // Fetch columns
  const { data: columns } = await supabase
    .from('kanban_columns')
    .select('*')
    .order('position', { ascending: true });

  // Fetch cards with customer info
  const { data: cards } = await supabase
    .from('kanban_cards')
    .select(`
      *,
      customer:customers(id, company_name, trade_name, contact_name, phone, lifecycle_status),
      seller:profiles(id, full_name, avatar_url)
    `)
    .order('position', { ascending: true });

  // Group cards by column
  const cardsByColumn: Record<string, any[]> = {};
  for (const column of columns || []) {
    cardsByColumn[column.id] = (cards || []).filter(
      (card) => card.column_id === column.id
    );
  }

  return (
    <KanbanView
      columns={columns || []}
      cardsByColumn={cardsByColumn}
    />
  );
}
