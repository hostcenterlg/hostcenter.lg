import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, Users, TrendingUp, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao Portal360! Aqui está um resumo da sua loja.
          </p>
        </div>
        <Button asChild className="bg-brand-pink hover:bg-brand-pink/90">
          <Link href="/catalogo" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Ver Catálogo
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Vendas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-brand-pink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 12.345,67</div>
            <p className="text-xs text-muted-foreground">
              +20.1% em relação ao mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-brand-teal" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">
              +12% em relação ao mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-brand-pink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">
              3 produtos em estoque baixo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-brand-teal" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">
              +18 novos este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Link do Catálogo */}
      <Card className="border-brand-pink/20 bg-gradient-to-br from-brand-pink/5 to-brand-teal/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-brand-pink" />
            Link do seu Catálogo Público
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-muted-foreground mb-1">Seu catálogo está disponível em:</p>
              <p className="text-lg font-semibold text-brand-teal">
                minhaloja.portal360.com.br
              </p>
            </div>
            <Button variant="outline" className="border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white">
              Copiar Link
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Compartilhe este link com seus clientes para que eles possam visualizar seus produtos e fazer pedidos via WhatsApp!
          </p>
        </CardContent>
      </Card>

      {/* Pedidos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
              <div className="space-y-1">
                <p className="font-semibold">#1234 - João Silva</p>
                <p className="text-sm text-muted-foreground">2 itens • Há 5 minutos</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">R$ 149,90</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pendente
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
              <div className="space-y-1">
                <p className="font-semibold">#1233 - Maria Santos</p>
                <p className="text-sm text-muted-foreground">1 item • Há 1 hora</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">R$ 89,90</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Confirmado
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
              <div className="space-y-1">
                <p className="font-semibold">#1232 - Pedro Costa</p>
                <p className="text-sm text-muted-foreground">3 itens • Há 2 horas</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">R$ 299,70</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Processando
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
