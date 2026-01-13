'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  formatCurrency,
  formatRelativeTime,
  getLifecycleColor,
  getLifecycleLabel,
} from '@/lib/utils';
import {
  MoreHorizontal,
  Plus,
  Clock,
  AlertTriangle,
  GripVertical,
  User,
} from 'lucide-react';

interface KanbanViewProps {
  columns: any[];
  cardsByColumn: Record<string, any[]>;
}

function KanbanCard({ card }: { card: any }) {
  const customer = card.customer;
  const seller = card.seller;

  const isOverdue =
    card.sla_deadline && new Date(card.sla_deadline) < new Date();
  const isAtRisk =
    card.sla_deadline &&
    !isOverdue &&
    new Date(card.sla_deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const initials = seller?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2) || '??';

  return (
    <Card className="kanban-card mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            href={`/clientes/${customer?.id}`}
            className="font-medium text-sm hover:text-primary truncate flex-1"
          >
            {card.title || customer?.company_name || 'Sem nome'}
          </Link>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {customer?.contact_name && (
          <p className="text-xs text-gray-500 mb-2 truncate">
            <User className="w-3 h-3 inline mr-1" />
            {customer.contact_name}
          </p>
        )}

        {card.value && (
          <p className="text-sm font-semibold text-green-600 mb-2">
            {formatCurrency(card.value)}
          </p>
        )}

        {/* SLA indicator */}
        {card.sla_deadline && (
          <div
            className={`flex items-center gap-1 text-xs mb-2 ${
              isOverdue
                ? 'text-red-600'
                : isAtRisk
                ? 'text-amber-600'
                : 'text-gray-500'
            }`}
          >
            {isOverdue ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            <span>
              {isOverdue
                ? 'SLA estourado'
                : isAtRisk
                ? 'SLA próximo'
                : `Prazo: ${formatRelativeTime(card.sla_deadline)}`}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          {customer?.lifecycle_status && (
            <Badge
              variant="outline"
              className={`text-[10px] ${getLifecycleColor(
                customer.lifecycle_status
              )}`}
            >
              {getLifecycleLabel(customer.lifecycle_status)}
            </Badge>
          )}

          {seller && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={seller.avatar_url} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  column,
  cards,
}: {
  column: any;
  cards: any[];
}) {
  const totalValue = cards.reduce((sum, card) => sum + (card.value || 0), 0);

  return (
    <div className="kanban-column flex flex-col bg-gray-50 rounded-lg">
      {/* Column header */}
      <div
        className="p-3 border-b"
        style={{ borderTopColor: column.color, borderTopWidth: 4 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{column.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {cards.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        {totalValue > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Cards container */}
      <div className="flex-1 p-3 overflow-y-auto">
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}

        {cards.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Nenhum card nesta coluna
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="p-3 border-t">
        <Button variant="ghost" className="w-full justify-start text-gray-500">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar card
        </Button>
      </div>
    </div>
  );
}

export function KanbanView({ columns, cardsByColumn }: KanbanViewProps) {
  // Calculate totals
  const totalCards = Object.values(cardsByColumn).reduce(
    (sum, cards) => sum + cards.length,
    0
  );
  const totalValue = Object.values(cardsByColumn)
    .flat()
    .reduce((sum, card) => sum + (card.value || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kanban</h1>
          <p className="text-gray-500">
            {totalCards} oportunidades · {formatCurrency(totalValue)} em pipeline
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Oportunidade
        </Button>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cardsByColumn[column.id] || []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
