import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Eye, Check, X, Package } from "lucide-react"

export default function PedidosPage() {
  // Mock data - será substituído por dados reais do banco
  const pedidos = [
    {
      id: "1",
      numero: "#1234",
      cliente: "João Silva",
      data: "17/11/2024 14:30",
      total: 149.90,
      status: "PENDING",
      itens: 2,
    },
    {
      id: "2",
      numero: "#1233",
      cliente: "Maria Santos",
      data: "17/11/2024 13:15",
      total: 89.90,
      status: "CONFIRMED",
      itens: 1,
    },
    {
      id: "3",
      numero: "#1232",
      cliente: "Pedro Costa",
      data: "17/11/2024 12:00",
      total: 299.70,
      status: "PROCESSING",
      itens: 3,
    },
    {
      id: "4",
      numero: "#1231",
      cliente: "Ana Paula",
      data: "17/11/2024 10:45",
      total: 199.90,
      status: "SHIPPED",
      itens: 1,
    },
    {
      id: "5",
      numero: "#1230",
      cliente: "Carlos Mendes",
      data: "16/11/2024 16:20",
      total: 459.80,
      status: "DELIVERED",
      itens: 4,
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
      CONFIRMED: { label: "Confirmado", className: "bg-green-100 text-green-800" },
      PROCESSING: { label: "Processando", className: "bg-blue-100 text-blue-800" },
      SHIPPED: { label: "Enviado", className: "bg-purple-100 text-purple-800" },
      DELIVERED: { label: "Entregue", className: "bg-gray-100 text-gray-800" },
      CANCELLED: { label: "Cancelado", className: "bg-red-100 text-red-800" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os pedidos da sua loja
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">8</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Processamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">15</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entregues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">119</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do pedido ou cliente..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">Todos os Status</Button>
            <Button variant="outline">Data</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pedidos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">{pedido.numero}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {pedido.data}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {pedido.itens}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    R$ {pedido.total.toFixed(2).replace(".", ",")}
                  </TableCell>
                  <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {pedido.status === "PENDING" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Confirmar pedido"
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cancelar pedido"
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
