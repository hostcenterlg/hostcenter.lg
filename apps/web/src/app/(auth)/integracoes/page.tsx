import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import {
  Plug,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  Settings,
  FileSpreadsheet,
  Database,
  Cloud,
  ExternalLink,
  Upload,
} from 'lucide-react';

export default async function IntegracoesPage() {
  const supabase = createServerClient();

  // Fetch recent event logs
  const { data: eventLogs } = await supabase
    .from('event_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch error logs
  const { data: errorLogs } = await supabase
    .from('event_log')
    .select('*')
    .not('error', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  // Group logs by source
  const logsBySource = {
    CSV_IMPORT: eventLogs?.filter((e) => e.source === 'CSV_IMPORT') || [],
    MERCOS: eventLogs?.filter((e) => e.source === 'MERCOS') || [],
    DESKRIO: eventLogs?.filter((e) => e.source === 'DESKRIO') || [],
  };

  // Integration status (mock for now - would come from actual adapter health checks)
  const integrations = [
    {
      id: 'csv',
      name: 'CSV Import',
      description: 'Importação manual de dados via arquivo CSV',
      icon: FileSpreadsheet,
      status: 'CONNECTED' as const,
      lastSync: logsBySource.CSV_IMPORT[0]?.created_at || null,
      eventsProcessed: logsBySource.CSV_IMPORT.length,
    },
    {
      id: 'mercos',
      name: 'Mercos',
      description: 'Integração com ERP Mercos',
      icon: Cloud,
      status: 'DISCONNECTED' as const,
      lastSync: null,
      eventsProcessed: 0,
      todo: 'Configurar credenciais da API Mercos',
    },
    {
      id: 'deskrio',
      name: 'Deskrio',
      description: 'Integração com plataforma Deskrio',
      icon: Database,
      status: 'DISCONNECTED' as const,
      lastSync: null,
      eventsProcessed: 0,
      todo: 'Configurar webhook do Deskrio',
    },
  ];

  const statusConfig = {
    CONNECTED: {
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle2,
      label: 'Conectado',
    },
    DISCONNECTED: {
      color: 'bg-gray-100 text-gray-700',
      icon: XCircle,
      label: 'Desconectado',
    },
    ERROR: {
      color: 'bg-red-100 text-red-700',
      icon: AlertTriangle,
      label: 'Erro',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-gray-500">Gerencie conexões e importações de dados</p>
        </div>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Importar CSV
        </Button>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {integrations.map((integration) => {
          const status = statusConfig[integration.status];
          const StatusIcon = status.icon;
          const IntegrationIcon = integration.icon;

          return (
            <Card key={integration.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <IntegrationIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <Badge className={status.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-3">{integration.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  {integration.description}
                </p>

                {integration.todo && (
                  <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700 mb-4">
                    <strong>TODO:</strong> {integration.todo}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {integration.lastSync && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Última sync:</span>
                      <span>{formatDateTime(integration.lastSync)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Eventos:</span>
                    <span>{integration.eventsProcessed}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="w-4 h-4 mr-1" />
                    Configurar
                  </Button>
                  {integration.status === 'CONNECTED' && (
                    <Button variant="outline" size="sm">
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Event log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {eventLogs && eventLogs.length > 0 ? (
            <div className="space-y-3">
              {eventLogs.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        event.error
                          ? 'bg-red-100'
                          : event.processed_at
                          ? 'bg-green-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      {event.error ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : event.processed_at ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <RefreshCcw className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {event.event_type} - {event.entity_type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.source} · {formatDateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                  {event.error && (
                    <Badge variant="destructive" className="text-xs">
                      Erro
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum evento registrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Errors */}
      {errorLogs && errorLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">
              <AlertTriangle className="w-5 h-5 inline mr-2" />
              Erros Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {errorLogs.map((event) => (
                <div
                  key={event.id}
                  className="p-3 border border-red-200 bg-red-50 rounded-lg"
                >
                  <p className="font-medium text-sm text-red-700">
                    {event.event_type}
                  </p>
                  <p className="text-xs text-red-600 mt-1">{event.error}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(event.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adapter contracts (documentation) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contratos de Integração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <h4>Mercos (TODO)</h4>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`// packages/integrations/mercos/types.ts
interface MercosWebhookPayload {
  event: 'order.created' | 'order.updated' | 'customer.created';
  data: MercosOrder | MercosCustomer;
  timestamp: string;
}

// Endpoints necessários:
// POST /api/webhooks/mercos - receber eventos
// GET /api/integrations/mercos/sync - sincronização manual`}
            </pre>

            <h4 className="mt-4">Deskrio (TODO)</h4>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`// packages/integrations/deskrio/types.ts
interface DeskrConversation {
  id: string;
  customer_phone: string;
  messages: DeskrMessage[];
  status: 'open' | 'closed';
}

// Endpoints necessários:
// POST /api/webhooks/deskrio - receber mensagens
// POST /api/integrations/deskrio/send - enviar mensagem`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
