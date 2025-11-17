import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bem-vindo ao PORTAL360</h1>
        <p className="text-gray-600 mt-2">Gerencie seu catálogo digital de produtos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-portal-pink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Cadastre seus produtos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-portal-teal" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Pedidos recebidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-portal-navy" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">
              Total em vendas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Link do Catálogo */}
      <Card className="border-portal-pink">
        <CardHeader>
          <CardTitle className="text-portal-pink">Seu Catálogo Online</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Compartilhe o link abaixo com seus clientes para que eles possam visualizar seus produtos:
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg bg-gray-100 p-3">
                <p className="font-mono text-sm text-portal-teal">
                  https://minhaloja.portal360.com.br
                </p>
              </div>
              <button className="rounded-lg bg-portal-pink px-6 py-3 text-sm font-medium text-white hover:bg-portal-pink/90 transition-colors">
                Copiar Link
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:border-portal-pink transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-portal-pink/10 p-3">
                  <Package className="h-6 w-6 text-portal-pink" />
                </div>
                <div>
                  <h3 className="font-semibold">Adicionar Produto</h3>
                  <p className="text-sm text-gray-600">Cadastrar novo produto</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-portal-teal transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-portal-teal/10 p-3">
                  <ShoppingCart className="h-6 w-6 text-portal-teal" />
                </div>
                <div>
                  <h3 className="font-semibold">Ver Pedidos</h3>
                  <p className="text-sm text-gray-600">Gerenciar pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-portal-navy transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-portal-navy/10 p-3">
                  <Users className="h-6 w-6 text-portal-navy" />
                </div>
                <div>
                  <h3 className="font-semibold">Cadastrar Cliente</h3>
                  <p className="text-sm text-gray-600">Adicionar novo cliente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
