import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  formatCurrency,
  formatDate,
  getLifecycleColor,
  getLifecycleLabel,
} from '@/lib/utils';
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default async function ClientesPage() {
  const supabase = createServerClient();

  // Fetch customers with seller info
  const { data: customers } = await supabase
    .from('customers')
    .select(`
      *,
      seller:profiles(id, full_name, avatar_url)
    `)
    .order('updated_at', { ascending: false })
    .limit(100);

  // Get counts by lifecycle status
  const { data: countData } = await supabase
    .from('customers')
    .select('lifecycle_status');

  const counts = {
    total: countData?.length || 0,
    ATIVO: countData?.filter((c) => c.lifecycle_status === 'ATIVO').length || 0,
    EM_RISCO:
      countData?.filter((c) => c.lifecycle_status === 'EM_RISCO').length || 0,
    INATIVO_RECENTE:
      countData?.filter((c) => c.lifecycle_status === 'INATIVO_RECENTE')
        .length || 0,
    INATIVO_ANTIGO:
      countData?.filter((c) => c.lifecycle_status === 'INATIVO_ANTIGO')
        .length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-gray-500">{counts.total} clientes cadastrados</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Ativos</span>
              <Badge variant="success">{counts.ATIVO}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Em Risco</span>
              <Badge variant="warning">{counts.EM_RISCO}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Inativo Recente</span>
              <Badge variant="outline">{counts.INATIVO_RECENTE}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Inativo Antigo</span>
              <Badge variant="destructive">{counts.INATIVO_ANTIGO}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar por nome, CNPJ, telefone..." className="pl-10" />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Customer list */}
      <div className="space-y-3">
        {(customers || []).map((customer) => {
          const seller = customer.seller;
          const initials = seller?.full_name
            ?.split(' ')
            .map((n: string) => n[0])
            .join('')
            .substring(0, 2) || '??';

          return (
            <Link key={customer.id} href={`/clientes/${customer.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Company icon */}
                    <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-gray-400" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {customer.company_name ||
                            customer.trade_name ||
                            customer.contact_name ||
                            'Sem nome'}
                        </h3>
                        <Badge
                          variant="outline"
                          className={getLifecycleColor(customer.lifecycle_status)}
                        >
                          {getLifecycleLabel(customer.lifecycle_status)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {customer.contact_name && customer.company_name && (
                          <span className="truncate">{customer.contact_name}</span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                        {customer.address_city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {customer.address_city}/{customer.address_state}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="text-right shrink-0 hidden md:block">
                      {customer.total_revenue > 0 && (
                        <p className="font-semibold text-green-600">
                          {formatCurrency(customer.total_revenue)}
                        </p>
                      )}
                      {customer.last_order_at && (
                        <p className="text-xs text-gray-500">
                          Último pedido: {formatDate(customer.last_order_at)}
                        </p>
                      )}
                      {customer.total_orders > 0 && (
                        <p className="text-xs text-gray-500">
                          {customer.total_orders} pedidos
                        </p>
                      )}
                    </div>

                    {/* Seller and chevron */}
                    <div className="flex items-center gap-3 shrink-0">
                      {seller && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={seller.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {(!customers || customers.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
            <p>Comece importando clientes via CSV ou crie manualmente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
