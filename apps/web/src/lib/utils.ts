import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return formatDate(d);
}

export function getPriorityColor(bucket: string): string {
  switch (bucket) {
    case 'P1':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'P2':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'P3':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'P4':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function getLifecycleColor(status: string): string {
  switch (status) {
    case 'ATIVO':
      return 'bg-green-100 text-green-700';
    case 'EM_RISCO':
      return 'bg-amber-100 text-amber-700';
    case 'INATIVO_RECENTE':
      return 'bg-orange-100 text-orange-700';
    case 'INATIVO_ANTIGO':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getLifecycleLabel(status: string): string {
  switch (status) {
    case 'ATIVO':
      return 'Ativo';
    case 'EM_RISCO':
      return 'Em Risco';
    case 'INATIVO_RECENTE':
      return 'Inativo Recente';
    case 'INATIVO_ANTIGO':
      return 'Inativo Antigo';
    default:
      return status;
  }
}

export function getReasonLabel(code: string): string {
  switch (code) {
    case 'MSG_UNANSWERED_2H':
      return 'Mensagem sem resposta (+2h)';
    case 'COMPLAINT':
      return 'Reclamação';
    case 'SLA_BREACHING':
      return 'SLA estourando';
    case 'REPURCHASE_DUE':
      return 'Ciclo de recompra';
    case 'QUOTE_STALE_2D':
      return 'Orçamento parado (+2d)';
    case 'FOLLOWUP_DUE':
      return 'Follow-up pendente';
    case 'POSTSALE_D45':
      return 'Pós-venda D+45';
    default:
      return code;
  }
}
