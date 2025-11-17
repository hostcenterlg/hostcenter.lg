import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Store, Package, ShoppingCart, Users, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-portal-pink/10 via-white to-portal-teal/10">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="rounded-full bg-portal-pink p-4">
              <Store className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-portal-navy mb-4">
            PORTAL360
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Plataforma completa de catálogo digital e e-commerce para seu negócio
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Acessar Dashboard
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/catalogo">
              <Button size="lg" variant="outline" className="gap-2">
                Ver Catálogo Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-portal-pink/10 p-4 mb-4">
              <Package className="h-8 w-8 text-portal-pink" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-portal-navy">Produtos</h3>
            <p className="text-sm text-gray-600">
              Gerencie seu catálogo completo de produtos com fotos, categorias e estoque
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-portal-teal/10 p-4 mb-4">
              <ShoppingCart className="h-8 w-8 text-portal-teal" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-portal-navy">Pedidos</h3>
            <p className="text-sm text-gray-600">
              Receba e gerencie pedidos com controle de status e histórico completo
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-portal-navy/10 p-4 mb-4">
              <Users className="h-8 w-8 text-portal-navy" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-portal-navy">CRM</h3>
            <p className="text-sm text-gray-600">
              Cadastro e gestão de clientes com histórico de compras
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-purple-100 p-4 mb-4">
              <Store className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-portal-navy">Catálogo Online</h3>
            <p className="text-sm text-gray-600">
              Seu próprio link personalizado para compartilhar com clientes
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-portal-navy rounded-2xl p-8 md:p-12 text-center text-white max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-lg text-gray-300 mb-6">
            Crie seu catálogo digital e comece a vender hoje mesmo
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="gap-2">
              Começar Agora
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
