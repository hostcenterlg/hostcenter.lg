"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ShoppingCart, MessageCircle } from "lucide-react"
import { useState } from "react"

export default function CatalogoPage() {
  const [carrinho, setCarrinho] = useState<any[]>([])

  // Mock data - será substituído por dados reais do banco
  const produtos = [
    {
      id: "1",
      nome: "Camiseta Básica",
      descricao: "Camiseta 100% algodão",
      preco: 49.90,
      precoAntigo: 69.90,
      imagem: "/placeholder-produto.jpg",
      categoria: "Roupas",
    },
    {
      id: "2",
      nome: "Calça Jeans",
      descricao: "Calça jeans slim fit",
      preco: 129.90,
      imagem: "/placeholder-produto.jpg",
      categoria: "Roupas",
    },
    {
      id: "3",
      nome: "Tênis Esportivo",
      descricao: "Tênis para corrida e caminhada",
      preco: 199.90,
      precoAntigo: 249.90,
      imagem: "/placeholder-produto.jpg",
      categoria: "Calçados",
    },
    {
      id: "4",
      nome: "Relógio Digital",
      descricao: "Relógio digital esportivo",
      preco: 89.90,
      imagem: "/placeholder-produto.jpg",
      categoria: "Acessórios",
    },
    {
      id: "5",
      nome: "Mochila Executiva",
      descricao: "Mochila para notebook até 15.6",
      preco: 159.90,
      imagem: "/placeholder-produto.jpg",
      categoria: "Acessórios",
    },
    {
      id: "6",
      nome: "Óculos de Sol",
      descricao: "Óculos com proteção UV",
      preco: 79.90,
      precoAntigo: 99.90,
      imagem: "/placeholder-produto.jpg",
      categoria: "Acessórios",
    },
  ]

  const adicionarAoCarrinho = (produto: any) => {
    setCarrinho([...carrinho, produto])
  }

  const enviarPedidoWhatsApp = () => {
    if (carrinho.length === 0) {
      alert("Adicione produtos ao carrinho antes de enviar o pedido!")
      return
    }

    let mensagem = "Olá! Gostaria de fazer um pedido:\\n\\n"

    carrinho.forEach((item, index) => {
      mensagem += `${index + 1}. ${item.nome} - R$ ${item.preco.toFixed(2).replace(".", ",")}\\n`
    })

    const total = carrinho.reduce((sum, item) => sum + item.preco, 0)
    mensagem += `\\n*Total: R$ ${total.toFixed(2).replace(".", ",")}*`

    const telefone = "5511999999999" // Número da loja
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`

    window.open(url, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-navy text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              <span className="text-brand-pink">Portal</span>
              <span className="text-brand-teal">360</span>
            </h1>
            <div className="flex items-center gap-4">
              <Button
                onClick={enviarPedidoWhatsApp}
                className="bg-green-600 hover:bg-green-700 relative"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Fazer Pedido via WhatsApp
                {carrinho.length > 0 && (
                  <Badge className="ml-2 bg-brand-pink">{carrinho.length}</Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-brand-pink/10 to-brand-teal/10 py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Bem-vindo à Nossa Loja!</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Confira nossos produtos e faça seu pedido pelo WhatsApp
          </p>
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>
      </section>

      {/* Carrinho Flutuante */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-8 right-8 z-50">
          <Card className="shadow-2xl border-brand-pink">
            <CardContent className="p-4 max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-brand-pink" />
                  Carrinho ({carrinho.length})
                </h3>
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                Total: R${" "}
                {carrinho
                  .reduce((sum, item) => sum + item.preco, 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </div>
              <Button
                onClick={enviarPedidoWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Enviar Pedido
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Produtos */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Nossos Produtos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {produtos.map((produto) => (
            <Card
              key={produto.id}
              className="overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="aspect-square bg-gray-200 relative">
                {produto.precoAntigo && (
                  <Badge className="absolute top-4 left-4 bg-brand-pink">
                    OFERTA
                  </Badge>
                )}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Package className="h-24 w-24" />
                </div>
              </div>
              <CardContent className="p-6">
                <div className="mb-2">
                  <Badge variant="outline" className="text-xs">
                    {produto.categoria}
                  </Badge>
                </div>
                <h3 className="font-bold text-lg mb-2">{produto.nome}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {produto.descricao}
                </p>
                <div className="flex items-center gap-2 mb-4">
                  {produto.precoAntigo && (
                    <span className="text-sm text-muted-foreground line-through">
                      R$ {produto.precoAntigo.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                  <span className="text-2xl font-bold text-brand-pink">
                    R$ {produto.preco.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <Button
                  onClick={() => adicionarAoCarrinho(produto)}
                  className="w-full bg-brand-teal hover:bg-brand-teal/90"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Adicionar ao Carrinho
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-navy text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg mb-2">
            <span className="text-brand-pink font-bold">Portal</span>
            <span className="text-brand-teal font-bold">360</span>
          </p>
          <p className="text-sm text-gray-400">
            Plataforma de catálogo de produtos e e-commerce
          </p>
        </div>
      </footer>
    </div>
  )
}

function Package(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}
