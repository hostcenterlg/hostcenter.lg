import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  DollarSign,
  BarChart3,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createServerClient();

  // Fetch metrics
  const [
    { data: customers },
    { data: orders },
    { data: tasks },
    { data: kanbanCards },
  ] = await Promise.all([
    supabase.from('customers').select('lifecycle_status, total_revenue'),
    supabase.from('orders').select('net_amount, ordered_at'),
    supabase.from('tasks').select('priority_bucket, status, due_at'),
    supabase.from('kanban_cards').select('stage, value'),
  ]);

  // Calculate customer metrics
  const customerCounts = {
    total: customers?.length || 0,
    ativo: customers?.filter((c) => c.lifecycle_status === 'ATIVO').length || 0,
    emRisco: customers?.filter((c) => c.lifecycle_status === 'EM_RISCO').length || 0,
    inativo:
      customers?.filter(
        (c) =>
          c.lifecycle_status === 'INATIVO_RECENTE' ||
          c.lifecycle_status === 'INATIVO_ANTIGO'
      ).length || 0,
  };

  // Calculate revenue
  const totalRevenue =
    customers?.reduce((sum, c) => sum + (c.total_revenue || 0), 0) || 0;
  const monthRevenue =
    orders
      ?.filter((o) => {
        const date = new Date(o.ordered_at);
        const now = new Date();
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, o) => sum + (o.net_amount || 0), 0) || 0;

  // Calculate task metrics
  const now = new Date();
  const taskCounts = {
    total: tasks?.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length || 0,
    p1: tasks?.filter((t) => t.priority_bucket === 'P1' && t.status !== 'COMPLETED').length || 0,
    overdue:
      tasks?.filter(
        (t) =>
          (t.status === 'PENDING' || t.status === 'IN_PROGRESS') &&
          new Date(t.due_at) < now
      ).length || 0,
  };

  // Calculate pipeline
  const pipeline = {
    total: kanbanCards?.reduce((sum, c) => sum + (c.value || 0), 0) || 0,
    lead: kanbanCards?.filter((c) => c.stage === 'LEAD').length || 0,
    negociacao: kanbanCards?.filter((c) => c.stage === 'NEGOCIACAO').length || 0,
    concluido:
      kanbanCards?.filter((c) => c.stage === 'VENDA_CONCLUIDA').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Visão geral do seu CRM</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Clientes Ativos</p>
                <p className="text-3xl font-bold">{customerCounts.ativo}</p>
                <p className="text-xs text-gray-400 mt-1">
                  de {customerCounts.total} total
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Receita do Mês</p>
                <p className="text-3xl font-bold">{formatCurrency(monthRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">+12% vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pipeline</p>
                <p className="text-3xl font-bold">{formatCurrency(pipeline.total)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {pipeline.negociacao} em negociação
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tarefas Pendentes</p>
                <p className="text-3xl font-bold">{taskCounts.total}</p>
                {taskCounts.overdue > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600">
                      {taskCounts.overdue} atrasadas
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saúde da Carteira</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Ativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{customerCounts.ativo}</span>
                  <span className="text-xs text-gray-500">
                    {customerCounts.total > 0
                      ? Math.round((customerCounts.ativo / customerCounts.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm">Em Risco</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{customerCounts.emRisco}</span>
                  <span className="text-xs text-gray-500">
                    {customerCounts.total > 0
                      ? Math.round((customerCounts.emRisco / customerCounts.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Inativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{customerCounts.inativo}</span>
                  <span className="text-xs text-gray-500">
                    {customerCounts.total > 0
                      ? Math.round((customerCounts.inativo / customerCounts.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden bg-gray-100 flex">
                <div
                  className="bg-green-500"
                  style={{
                    width: `${
                      customerCounts.total > 0
                        ? (customerCounts.ativo / customerCounts.total) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-amber-500"
                  style={{
                    width: `${
                      customerCounts.total > 0
                        ? (customerCounts.emRisco / customerCounts.total) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-red-500"
                  style={{
                    width: `${
                      customerCounts.total > 0
                        ? (customerCounts.inativo / customerCounts.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task priorities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tarefas por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(['P1', 'P2', 'P3', 'P4'] as const).map((bucket) => {
                const count =
                  tasks?.filter(
                    (t) =>
                      t.priority_bucket === bucket &&
                      (t.status === 'PENDING' || t.status === 'IN_PROGRESS')
                  ).length || 0;

                const colors = {
                  P1: 'bg-red-500',
                  P2: 'bg-amber-500',
                  P3: 'bg-blue-500',
                  P4: 'bg-gray-500',
                };

                const labels = {
                  P1: 'Urgente',
                  P2: 'Recompra',
                  P3: 'Follow-up',
                  P4: 'Pós-venda',
                };

                return (
                  <div key={bucket} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colors[bucket]}`} />
                      <span className="text-sm">
                        {bucket} - {labels[bucket]}
                      </span>
                    </div>
                    <Badge
                      variant={bucket === 'P1' && count > 0 ? 'destructive' : 'outline'}
                    >
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* SLA status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm">No prazo</span>
                </div>
                <span className="font-semibold text-green-600">
                  {taskCounts.total - taskCounts.overdue}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Próximo do prazo</span>
                </div>
                <span className="font-semibold text-amber-600">
                  {tasks?.filter((t) => {
                    if (t.status === 'COMPLETED' || t.status === 'CANCELLED')
                      return false;
                    const due = new Date(t.due_at);
                    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
                    return hoursLeft > 0 && hoursLeft <= 24;
                  }).length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Atrasado</span>
                </div>
                <span className="font-semibold text-red-600">
                  {taskCounts.overdue}
                </span>
              </div>

              {taskCounts.total > 0 && (
                <div className="pt-2">
                  <div className="text-center">
                    <span className="text-3xl font-bold text-green-600">
                      {Math.round(
                        ((taskCounts.total - taskCounts.overdue) / taskCounts.total) *
                          100
                      )}
                      %
                    </span>
                    <p className="text-xs text-gray-500">Taxa de cumprimento</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline funnel placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funil de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4" />
              <p>Gráfico de funil disponível com dados reais</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
