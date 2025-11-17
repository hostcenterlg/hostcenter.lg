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
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Eye, Phone, Mail } from "lucide-react"

export default function ClientesPage() {
  // Mock data - será substituído por dados reais do banco
  const clientes = [
    {
      id: "1",
      nome: "João Silva",
      email: "joao@email.com",
      telefone: "(11) 98765-4321",
      cidade: "São Paulo",
      pedidos: 8,
      totalGasto: 1249.20,
      ultimoPedido: "17/11/2024",
    },
    {
      id: "2",
      nome: "Maria Santos",
      email: "maria@email.com",
      telefone: "(21) 97654-3210",
      cidade: "Rio de Janeiro",
      pedidos: 5,
      totalGasto: 879.50,
      ultimoPedido: "17/11/2024",
    },
    {
      id: "3",
      nome: "Pedro Costa",
      email: "pedro@email.com",
      telefone: "(31) 96543-2109",
      cidade: "Belo Horizonte",
      pedidos: 12,
      totalGasto: 2340.80,
      ultimoPedido: "17/11/2024",
    },
    {
      id: "4",
      nome: "Ana Paula",
      email: "ana@email.com",
      telefone: "(41) 95432-1098",
      cidade: "Curitiba",
      pedidos: 3,
      totalGasto: 567.90,
      ultimoPedido: "17/11/2024",
    },
    {
      id: "5",
      nome: "Carlos Mendes",
      email: "carlos@email.com",
      telefone: "(51) 94321-0987",
      cidade: "Porto Alegre",
      pedidos: 15,
      totalGasto: 3890.40,
      ultimoPedido: "16/11/2024",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e histórico de compras
          </p>
        </div>
        <Button className="bg-brand-pink hover:bg-brand-pink/90">
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Novos este Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">18</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">156</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 185,50</div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total Gasto</TableHead>
                <TableHead>Último Pedido</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {cliente.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {cliente.telefone}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{cliente.cidade}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{cliente.pedidos}</span>
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    R$ {cliente.totalGasto.toFixed(2).replace(".", ",")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cliente.ultimoPedido}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Enviar WhatsApp"
                        className="text-green-600 hover:text-green-700"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
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
