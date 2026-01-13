'use client';

// ============================================
// VITAO JARVIS CRM - Demo Toolbar
// ============================================
// Floating toolbar for demo presentations
// Only visible when DEMO_MODE=true

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Clapperboard,
  Webhook,
  FileText,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Play,
  CheckCircle,
} from 'lucide-react';
import { DEMO_MODE } from '@/lib/demo-mode';

export function DemoToolbar() {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!DEMO_MODE) return null;

  const handleAction = async (action: string, label: string) => {
    setIsLoading(true);
    setLastAction(null);

    // Simulate action (in real app, would call API)
    await new Promise((resolve) => setTimeout(resolve, 800));

    setLastAction(label);
    setIsLoading(false);

    // Clear after 3s
    setTimeout(() => setLastAction(null), 3000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {lastAction && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">
          <CheckCircle className="w-3 h-3 mr-1" />
          {lastAction}
        </Badge>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            className="bg-purple-600 hover:bg-purple-700 shadow-lg"
            disabled={isLoading}
          >
            <Clapperboard className="w-4 h-4 mr-2" />
            Demo Mode
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Ações de Demo</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => handleAction('webhook', 'Webhook simulado')}>
            <Webhook className="w-4 h-4 mr-2 text-blue-500" />
            Simular Webhook
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleAction('report', 'Relatório gerado')}>
            <FileText className="w-4 h-4 mr-2 text-green-500" />
            Gerar Relatório Agora
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleAction('dlq', 'Item DLQ inserido')}>
            <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
            Inserir Item DLQ
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleAction('reprocess', 'DLQ reprocessado')}>
            <RefreshCw className="w-4 h-4 mr-2 text-purple-500" />
            Reprocessar DLQ
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => handleAction('ai', 'IA executada')}>
            <Sparkles className="w-4 h-4 mr-2 text-pink-500" />
            Trigger IA Analysis
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleAction('reset', 'Demo reiniciado')}
            className="text-red-600"
          >
            <Play className="w-4 h-4 mr-2" />
            Reiniciar Demo Data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
