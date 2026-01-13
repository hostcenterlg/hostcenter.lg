'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  formatRelativeTime,
  getReasonLabel,
  getLifecycleColor,
  getLifecycleLabel,
} from '@/lib/utils';
import {
  AlertCircle,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  MoreHorizontal,
  RefreshCcw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from 'lucide-react';

interface TodayViewProps {
  tasks: any[];
  tasksByBucket: {
    P1: any[];
    P2: any[];
    P3: any[];
    P4: any[];
  };
  counts: {
    P1: number;
    P2: number;
    P3: number;
    P4: number;
    total: number;
  };
  isManager: boolean;
}

const priorityConfig = {
  P1: {
    label: 'P1 - Urgente',
    description: 'Requer ação imediata',
    color: 'bg-red-500',
    badgeVariant: 'p1' as const,
    icon: AlertCircle,
  },
  P2: {
    label: 'P2 - Recompra',
    description: 'Ciclo de recompra atingido',
    color: 'bg-amber-500',
    badgeVariant: 'p2' as const,
    icon: RefreshCcw,
  },
  P3: {
    label: 'P3 - Follow-up',
    description: 'Acompanhamento pendente',
    color: 'bg-blue-500',
    badgeVariant: 'p3' as const,
    icon: Clock,
  },
  P4: {
    label: 'P4 - Pós-venda',
    description: 'Contato de relacionamento',
    color: 'bg-gray-500',
    badgeVariant: 'p4' as const,
    icon: CheckCircle2,
  },
};

function TaskCard({ task }: { task: any }) {
  const customer = task.customer;
  const seller = task.seller;
  const config = priorityConfig[task.priority_bucket as keyof typeof priorityConfig];
  const Icon = config?.icon || Clock;

  const initials = seller?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2) || 'JC';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Priority indicator */}
          <div className={`w-1 self-stretch rounded-full ${config?.color}`} />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={config?.badgeVariant}>
                <Icon className="w-3 h-3 mr-1" />
                {task.priority_bucket}
              </Badge>
              <span className="text-sm text-gray-500">
                {getReasonLabel(task.reason_code)}
              </span>
              {task.ai_confidence && (
                <Badge variant="outline\" className="ml-auto text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {Math.round(task.ai_confidence * 100)}% conf.
                </Badge>
              )}
            </div>

            {/* Customer info */}
            <Link
              href={`/clientes/${customer?.id}`}
              className="group block"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-primary truncate">
                {customer?.company_name || customer?.contact_name || 'Cliente'}
              </h3>
              {customer?.contact_name && customer?.company_name && (
                <p className="text-sm text-gray-500 truncate">
                  {customer.contact_name}
                </p>
              )}
            </Link>

            {/* Task details */}
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {task.reason_details || task.description}
            </p>

            {/* Contact buttons */}
            <div className="flex items-center gap-2 mt-3">
              {customer?.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${customer.phone}`}>
                    <Phone className="w-4 h-4 mr-1" />
                    Ligar
                  </a>
                </Button>
              )}
              {customer?.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {customer?.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${customer.email}`}>
                    <Mail className="w-4 h-4 mr-1" />
                    Email
                  </a>
                </Button>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                {customer?.lifecycle_status && (
                  <Badge
                    variant="outline"
                    className={getLifecycleColor(customer.lifecycle_status)}
                  >
                    {getLifecycleLabel(customer.lifecycle_status)}
                  </Badge>
                )}
                <span className="text-xs text-gray-400">
                  {formatRelativeTime(task.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {seller && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={seller.avatar_url} />
                    <AvatarFallback className="text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <Button variant="ghost" size="sm">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Concluir
                </Button>
              </div>
            </div>

            {/* AI Suggestions */}
            {task.ai_suggestions && task.ai_suggestions.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
                  <Sparkles className="w-4 h-4" />
                  Sugestão da IA
                </div>
                <p className="text-sm text-blue-800">
                  {task.ai_suggestions[0].action}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {task.ai_suggestions[0].reason}
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
            )}
          </div>

          {/* Action button */}
          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PrioritySection({
  bucket,
  tasks,
}: {
  bucket: 'P1' | 'P2' | 'P3' | 'P4';
  tasks: any[];
}) {
  const config = priorityConfig[bucket];

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
        <p>Nenhuma tarefa {config.label.toLowerCase()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

export function TodayView({
  tasks,
  tasksByBucket,
  counts,
  isManager,
}: TodayViewProps) {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hoje</h1>
          <p className="text-gray-500">
            {counts.total} tarefas pendentes
          </p>
        </div>
        <Button>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Priority summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['P1', 'P2', 'P3', 'P4'] as const).map((bucket) => {
          const config = priorityConfig[bucket];
          const count = counts[bucket];
          const Icon = config.icon;

          return (
            <Card
              key={bucket}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                activeTab === bucket ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveTab(bucket)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${config.color} bg-opacity-10`}
                  >
                    <Icon
                      className={`w-5 h-5 ${config.color.replace('bg-', 'text-')}`}
                    />
                  </div>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <h3 className="font-medium mt-2">{config.label}</h3>
                <p className="text-xs text-gray-500">{config.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Task list with tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas ({counts.total})</TabsTrigger>
          <TabsTrigger value="P1">
            <Badge variant="p1" className="mr-1">
              {counts.P1}
            </Badge>
            Urgentes
          </TabsTrigger>
          <TabsTrigger value="P2">
            <Badge variant="p2" className="mr-1">
              {counts.P2}
            </Badge>
            Recompra
          </TabsTrigger>
          <TabsTrigger value="P3">
            <Badge variant="p3" className="mr-1">
              {counts.P3}
            </Badge>
            Follow-up
          </TabsTrigger>
          <TabsTrigger value="P4">
            <Badge variant="p4" className="mr-1">
              {counts.P4}
            </Badge>
            Pós-venda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium">Tudo em dia!</h3>
                <p>Não há tarefas pendentes no momento.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {(['P1', 'P2', 'P3', 'P4'] as const).map((bucket) => (
          <TabsContent key={bucket} value={bucket} className="mt-4">
            <PrioritySection bucket={bucket} tasks={tasksByBucket[bucket]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
