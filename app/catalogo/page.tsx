"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ShoppingCart, Package, MessageCircle, Store } from "lucide-react"

// Mock data
const mockProducts = [
  {
    id: "1",
    name: "Produto Exemplo 1",
    description: "Descrição completa do produto exemplo 1",
    price: 99.90,
    stock: 10,
    category: "Eletrônicos",
  },
  {
    id: "2",
    name: "Produto Exemplo 2",
    description: "Descrição completa do produto exemplo 2",
    price: 149.90,
    stock: 5,
    category: "Acessórios",
  },
  {
    id: "3",
    name: "Produto Exemplo 3",
    description: "Descrição completa do produto exemplo 3",
    price: 79.90,
    stock: 15,
    category: "Eletrônicos",
  },
  {
    id: "4",
    name: "Produto Exemplo 4",
    description: "Descrição completa do produto exemplo 4",
    price: 199.90,
    stock: 8,
    category: "Casa",
  },
]

const categories = Array.from(new Set(mockProducts.map(p => p.category)))

export default function CatalogoPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleWhatsAppOrder = (productName: string, productPrice: number) => {
    const message = `Olá! Gostaria de fazer um pedido do produto: *${productName}* (R$ ${productPrice.toFixed(2)})`
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-portal-pink p-2">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-portal-navy">Minha Loja</h1>
                <p className="text-sm text-gray-600">Catálogo de Produtos</p>
              </div>
            </div>
            <Button variant="secondary" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Contato
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Categories */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-600">
                Tente buscar com outros termos ou selecione outra categoria
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden flex flex-col">
                {/* Product Image Placeholder */}
                <div className="aspect-square bg-gradient-to-br from-portal-pink/20 via-portal-teal/20 to-portal-navy/20 flex items-center justify-center">
                  <Package className="h-16 w-16 text-gray-400" />
                </div>

                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                  <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Categoria</p>
                      <p className="text-sm font-medium text-portal-navy">{product.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Disponibilidade</p>
                      <p className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stock > 0 ? `${product.stock} em estoque` : 'Indisponível'}
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 border-t pt-4">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-sm text-gray-600">Preço:</span>
                    <span className="text-2xl font-bold text-portal-pink">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    className="w-full gap-2"
                    disabled={product.stock === 0}
                    onClick={() => handleWhatsAppOrder(product.name, product.price)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Pedir pelo WhatsApp
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-portal-navy text-white mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Store className="h-5 w-5 text-portal-pink" />
            <p className="font-semibold">Minha Loja</p>
          </div>
          <p className="text-sm text-gray-400">
            Catálogo digital criado com PORTAL360
          </p>
          <p className="text-xs text-gray-500 mt-4">
            minhaloja.portal360.com.br
          </p>
        </div>
      </footer>
    </div>
  )
}
