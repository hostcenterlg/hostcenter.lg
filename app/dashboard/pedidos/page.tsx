"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ShoppingCart, Eye, Package, Clock, CheckCircle, XCircle } from "lucide-react"

// Mock data
const mockOrders = [
  {
    id: "1",
    orderNumber: "PED-001",
    customer: "João Silva",
    status: "PENDING",
    total: 299.80,
    items: 3,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    orderNumber: "PED-002",
    customer: "Maria Santos",
    status: "CONFIRMED",
    total: 149.90,
    items: 1,
    createdAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    orderNumber: "PED-003",
    customer: "Pedro Costa",
    status: "DELIVERED",
    total: 599.70,
    items: 5,
    createdAt: new Date("2024-01-13"),
  },
]

const statusConfig = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  CONFIRMED: { label: "Confirmado", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  PROCESSING: { label: "Processando", color: "bg-purple-100 text-purple-800", icon: Package },
  SHIPPED: { label: "Enviado", color: "bg-indigo-100 text-indigo-800", icon: Package },
  DELIVERED: { label: "Entregue", color: "bg-green-100 text-green-800", icon: CheckCircle },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: XCircle },
}

export default function PedidosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.customer.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || order.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-gray-600 mt-2">Gerencie todos os pedidos recebidos</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card className="cursor-pointer hover:border-yellow-400 transition-colors" onClick={() => setFilterStatus(filterStatus === 'PENDING' ? null : 'PENDING')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {mockOrders.filter(o => o.status === 'PENDING').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setFilterStatus(filterStatus === 'CONFIRMED' ? null : 'CONFIRMED')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmados</p>
                <p className="text-2xl font-bold text-blue-600">
                  {mockOrders.filter(o => o.status === 'CONFIRMED').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-green-400 transition-colors" onClick={() => setFilterStatus(filterStatus === 'DELIVERED' ? null : 'DELIVERED')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Entregues</p>
                <p className="text-2xl font-bold text-green-600">
                  {mockOrders.filter(o => o.status === 'DELIVERED').length}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-portal-pink">
                  R$ {mockOrders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-portal-pink" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar pedidos por número ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {filterStatus && (
              <Button variant="outline" onClick={() => setFilterStatus(null)}>
                Limpar Filtro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus ? "Tente ajustar os filtros" : "Aguardando novos pedidos"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status as keyof typeof statusConfig].icon
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="rounded-full bg-portal-pink/10 p-3">
                        <ShoppingCart className="h-5 w-5 text-portal-pink" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{order.orderNumber}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[order.status as keyof typeof statusConfig].color}`}>
                            {statusConfig[order.status as keyof typeof statusConfig].label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{order.customer} · {order.items} itens</p>
                        <p className="text-xs text-gray-500">
                          {order.createdAt.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="text-lg font-bold text-portal-pink">
                          R$ {order.total.toFixed(2)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
