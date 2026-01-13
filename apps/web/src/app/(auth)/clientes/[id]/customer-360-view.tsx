'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getLifecycleColor,
  getLifecycleLabel,
  getReasonLabel,
  getPriorityColor,
} from '@/lib/utils';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  MessageSquare,
  CheckSquare,
  Sparkles,
  Edit,
  MoreHorizontal,
  ExternalLink,
  TrendingUp,
  Clock,
  User,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

interface Customer360ViewProps {
  customer: any;
  seller: any;
  orders: any[];
  interactions: any[];
  tasks: any[];
  kanbanCard: any;
}

function SummaryTab({
  customer,
  seller,
  orders,
  interactions,
  kanbanCard,
}: {
  customer: any;
  seller: any;
  orders: any[];
  interactions: any[];
  kanbanCard: any;
}) {
  const sellerInitials = seller?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2) || '??';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Customer info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customer.contact_name && (
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Contato</p>
                <p className="font-medium">{customer.contact_name}</p>
              </div>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Telefone</p>
                <a
                  href={`tel:${customer.phone}`}
                  className="font-medium text-primary hover:underline"
                >
                  {customer.phone}
                </a>
              </div>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a
                  href={`mailto:${customer.email}`}
                  className="font-medium text-primary hover:underline"
                >
                  {customer.email}
                </a>
              </div>
            </div>
          )}
          {customer.address_city && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Localização</p>
                <p className="font-medium">
                  {customer.address_city}/{customer.address_state}
                </p>
              </div>
            </div>
          )}
          {customer.cnpj && (
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">CNPJ</p>
                <p className="font-medium">{customer.cnpj}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métricas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Receita Total</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(customer.total_revenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Ticket Médio</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(customer.average_ticket || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Total Pedidos</p>
              <p className="text-xl font-bold text-purple-700">
                {customer.total_orders || 0}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-600">Ciclo Recompra</p>
              <p className="text-xl font-bold text-amber-700">
                {customer.repurchase_cycle_days || 30} dias
              </p>
            </div>
          </div>

          {customer.last_order_at && (
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-500">Último pedido</p>
              <p className="font-medium">
                {formatDate(customer.last_order_at)}
                <span className="text-gray-400 ml-2">
                  ({customer.days_since_last_order} dias atrás)
                </span>
              </p>
            </div>
          )}

          {seller && (
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-500 mb-2">Vendedor</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={seller.avatar_url} />
                  <AvatarFallback>{sellerInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{seller.full_name}</p>
                  <p className="text-xs text-gray-500">{seller.email}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kanban status */}
      {kanbanCard && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: kanbanCard.column?.color || '#6B7280' }}
              />
              <span className="font-medium">
                {kanbanCard.column?.name || kanbanCard.stage}
              </span>
            </div>
            {kanbanCard.value && (
              <p className="text-lg font-bold text-green-600 mb-2">
                {formatCurrency(kanbanCard.value)}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Desde {formatRelativeTime(kanbanCard.entered_stage_at)}
            </p>
            {kanbanCard.sla_deadline && (
              <p className="text-sm text-amber-600 mt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                SLA: {formatDateTime(kanbanCard.sla_deadline)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Insights da IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700 mb-1">
                Próxima Melhor Ação
              </p>
              <p className="text-sm text-blue-800">
                Entrar em contato para verificar satisfação com último pedido e
                apresentar novidades do catálogo.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Baseado no ciclo de recompra e histórico de interações
              </p>
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" size="sm" className="h-7 text-blue-700">
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  Útil
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-blue-700">
                  <ThumbsDown className="w-3 h-3 mr-1" />
                  Não útil
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p>
                <strong>Por que está no Hoje:</strong>{' '}
                {customer.lifecycle_status === 'EM_RISCO'
                  ? 'Cliente em risco de churn - último pedido há mais de 50 dias'
                  : customer.lifecycle_status === 'ATIVO'
                  ? 'Ciclo de recompra se aproximando'
                  : 'Cliente inativo precisa de reativação'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersTab({ orders }: { orders: any[] }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>Nenhum pedido registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">#{order.order_number}</span>
                  <Badge variant={order.status === 'COMPLETED' ? 'success' : 'outline'}>
                    {order.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDateTime(order.ordered_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(order.net_amount)}
                </p>
                {order.discount_amount > 0 && (
                  <p className="text-xs text-gray-500">
                    Desconto: {formatCurrency(order.discount_amount)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InteractionsTab({ interactions }: { interactions: any[] }) {
  if (interactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>Nenhuma interação registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interactions.map((interaction) => (
        <Card key={interaction.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  interaction.direction === 'INBOUND'
                    ? 'bg-blue-100'
                    : 'bg-green-100'
                }`}
              >
                <MessageSquare
                  className={`w-4 h-4 ${
                    interaction.direction === 'INBOUND'
                      ? 'text-blue-600'
                      : 'text-green-600'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{interaction.channel}</Badge>
                  <Badge
                    variant={
                      interaction.direction === 'INBOUND' ? 'default' : 'secondary'
                    }
                  >
                    {interaction.direction === 'INBOUND' ? 'Entrada' : 'Saída'}
                  </Badge>
                  {interaction.responded_at === null &&
                    interaction.direction === 'INBOUND' && (
                      <Badge variant="destructive">Sem resposta</Badge>
                    )}
                </div>
                {interaction.content_preview && (
                  <p className="text-sm text-gray-700 mt-1">
                    {interaction.content_preview}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {formatDateTime(interaction.occurred_at)}
                </p>

                {/* AI analysis */}
                {interaction.ai_sentiment_label && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <span className="text-gray-500">Sentimento: </span>
                    <span
                      className={
                        interaction.ai_sentiment_score > 60
                          ? 'text-green-600'
                          : interaction.ai_sentiment_score < 40
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }
                    >
                      {interaction.ai_sentiment_label} (
                      {interaction.ai_sentiment_score}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TasksTab({ tasks }: { tasks: any[] }) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>Nenhuma tarefa registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getPriorityColor(task.priority_bucket)}>
                    {task.priority_bucket}
                  </Badge>
                  <span className="font-medium">{task.title}</span>
                </div>
                <p className="text-sm text-gray-500">
                  {getReasonLabel(task.reason_code)}
                </p>
              </div>
              <div className="text-right">
                <Badge
                  variant={task.status === 'COMPLETED' ? 'success' : 'outline'}
                >
                  {task.status}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDateTime(task.due_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function Customer360View({
  customer,
  seller,
  orders,
  interactions,
  tasks,
  kanbanCard,
}: Customer360ViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clientes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {customer.company_name || customer.trade_name || customer.contact_name}
              </h1>
              <Badge
                variant="outline"
                className={getLifecycleColor(customer.lifecycle_status)}
              >
                {getLifecycleLabel(customer.lifecycle_status)}
              </Badge>
            </div>
            {customer.trade_name && customer.company_name && (
              <p className="text-gray-500">{customer.trade_name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {customer.phone && (
          <>
            <Button asChild>
              <a href={`tel:${customer.phone}`}>
                <Phone className="w-4 h-4 mr-2" />
                Ligar
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </a>
            </Button>
          </>
        )}
        {customer.email && (
          <Button variant="outline" asChild>
            <a href={`mailto:${customer.email}`}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </a>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="pedidos">
            Pedidos ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="conversas">
            Conversas ({interactions.length})
          </TabsTrigger>
          <TabsTrigger value="tarefas">
            Tarefas ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="ia">
            <Sparkles className="w-4 h-4 mr-1" />
            IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4">
          <SummaryTab
            customer={customer}
            seller={seller}
            orders={orders}
            interactions={interactions}
            kanbanCard={kanbanCard}
          />
        </TabsContent>

        <TabsContent value="pedidos" className="mt-4">
          <OrdersTab orders={orders} />
        </TabsContent>

        <TabsContent value="conversas" className="mt-4">
          <InteractionsTab interactions={interactions} />
        </TabsContent>

        <TabsContent value="tarefas" className="mt-4">
          <TasksTab tasks={tasks} />
        </TabsContent>

        <TabsContent value="ia" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                <h3 className="text-lg font-medium mb-2">Análise de IA</h3>
                <p className="mb-4">
                  Obtenha insights automáticos sobre este cliente, incluindo
                  resumo de conversas, detecção de objeções e sugestões de ação.
                </p>
                <Button>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Análise
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
