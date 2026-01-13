import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Customer360View } from './customer-360-view';

export default async function CustomerPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerClient();

  // Fetch customer
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !customer) {
    notFound();
  }

  // Fetch related data in parallel
  const [
    { data: seller },
    { data: orders },
    { data: interactions },
    { data: tasks },
    { data: kanbanCard },
  ] = await Promise.all([
    customer.seller_id
      ? supabase.from('profiles').select('*').eq('id', customer.seller_id).single()
      : { data: null },
    supabase
      .from('orders')
      .select('*')
      .eq('customer_id', params.id)
      .order('ordered_at', { ascending: false })
      .limit(20),
    supabase
      .from('interactions')
      .select('*')
      .eq('customer_id', params.id)
      .order('occurred_at', { ascending: false })
      .limit(50),
    supabase
      .from('tasks')
      .select('*')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('kanban_cards')
      .select('*, column:kanban_columns(*)')
      .eq('customer_id', params.id)
      .single(),
  ]);

  return (
    <Customer360View
      customer={customer}
      seller={seller}
      orders={orders || []}
      interactions={interactions || []}
      tasks={tasks || []}
      kanbanCard={kanbanCard}
    />
  );
}
