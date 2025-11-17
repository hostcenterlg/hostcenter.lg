"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, Mail, Phone, MapPin, ShoppingCart } from "lucide-react"

// Mock data
const mockClientes = [
  {
    id: "1",
    name: "João Silva",
    email: "joao@email.com",
    phone: "(11) 98765-4321",
    address: "Rua das Flores, 123 - São Paulo/SP",
    totalOrders: 5,
    totalSpent: 1499.50,
    lastOrder: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Maria Santos",
    email: "maria@email.com",
    phone: "(11) 91234-5678",
    address: "Av. Paulista, 456 - São Paulo/SP",
    totalOrders: 3,
    totalSpent: 899.70,
    lastOrder: new Date("2024-01-14"),
  },
  {
    id: "3",
    name: "Pedro Costa",
    email: "pedro@email.com",
    phone: "(21) 98888-7777",
    address: "Rua do Comércio, 789 - Rio de Janeiro/RJ",
    totalOrders: 8,
    totalSpent: 2350.00,
    lastOrder: new Date("2024-01-13"),
  },
]

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredClientes = mockClientes.filter(cliente =>
    cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.phone.includes(searchTerm)
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes (CRM)</h1>
          <p className="text-gray-600 mt-2">Gerencie seus clientes e histórico de compras</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Clientes</p>
                <p className="text-2xl font-bold text-portal-navy">{mockClientes.length}</p>
              </div>
              <Users className="h-8 w-8 text-portal-navy" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pedidos Realizados</p>
                <p className="text-2xl font-bold text-portal-teal">
                  {mockClientes.reduce((acc, c) => acc + c.totalOrders, 0)}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-portal-teal" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total em Vendas</p>
                <p className="text-2xl font-bold text-portal-pink">
                  R$ {mockClientes.reduce((acc, c) => acc + c.totalSpent, 0).toFixed(2)}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-portal-pink" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {(mockClientes.reduce((acc, c) => acc + c.totalSpent, 0) / mockClientes.length).toFixed(2)}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar clientes por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clientes List */}
      {filteredClientes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Tente buscar com outros termos" : "Comece adicionando seu primeiro cliente"}
            </p>
            {!searchTerm && (
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Primeiro Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredClientes.map((cliente) => (
            <Card key={cliente.id} className="hover:border-portal-pink transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-portal-pink/10 p-3">
                      <Users className="h-6 w-6 text-portal-pink" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{cliente.name}</CardTitle>
                      <p className="text-sm text-gray-600">Cliente desde {cliente.lastOrder.getFullYear()}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Contact Info */}
                  <div className="space-y-2 border-b pb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{cliente.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{cliente.phone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-600 flex-1">{cliente.address}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-gray-600">Total de Pedidos</p>
                      <p className="text-xl font-bold text-portal-teal">{cliente.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Gasto</p>
                      <p className="text-xl font-bold text-portal-pink">R$ {cliente.totalSpent.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Last Order */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-600">Último pedido</p>
                    <p className="text-sm font-medium">{cliente.lastOrder.toLocaleDateString('pt-BR')}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Ver Histórico
                    </Button>
                    <Button size="sm" className="flex-1">
                      Contatar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
