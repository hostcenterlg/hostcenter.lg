import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Save } from "lucide-react"

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Configure sua loja e personalize sua experiência
        </p>
      </div>

      {/* Dados da Loja */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Loja</CardTitle>
          <CardDescription>
            Informações básicas sobre sua loja
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Loja</Label>
              <Input id="nome" placeholder="Minha Loja" defaultValue="Minha Loja" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input id="slug" placeholder="minhaloja" defaultValue="minhaloja" />
              <p className="text-xs text-muted-foreground">
                Sua loja estará em: minhaloja.portal360.com.br
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Descrição da sua loja"
              defaultValue="Os melhores produtos você encontra aqui!"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone/WhatsApp</Label>
              <Input
                id="telefone"
                placeholder="(11) 99999-9999"
                defaultValue="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@minhaloja.com"
                defaultValue="contato@minhaloja.com"
              />
            </div>
          </div>
          <Button className="bg-brand-pink hover:bg-brand-pink/90">
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      {/* Personalização */}
      <Card>
        <CardHeader>
          <CardTitle>Personalização</CardTitle>
          <CardDescription>
            Personalize a aparência do seu catálogo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Logo da Loja (URL)</Label>
            <Input
              id="logo"
              placeholder="https://exemplo.com/logo.png"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cor1">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="cor1"
                  type="color"
                  defaultValue="#EF4C7B"
                  className="w-20 h-10"
                />
                <Input value="#EF4C7B" readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor2">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="cor2"
                  type="color"
                  defaultValue="#5ECFC5"
                  className="w-20 h-10"
                />
                <Input value="#5ECFC5" readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor3">Cor de Fundo</Label>
              <div className="flex gap-2">
                <Input
                  id="cor3"
                  type="color"
                  defaultValue="#3A4558"
                  className="w-20 h-10"
                />
                <Input value="#3A4558" readOnly />
              </div>
            </div>
          </div>
          <Button className="bg-brand-pink hover:bg-brand-pink/90">
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      {/* Integrações */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
          <CardDescription>
            Configure suas integrações com serviços externos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">Número do WhatsApp (com código do país)</Label>
            <Input
              id="whatsapp"
              placeholder="5511999999999"
              defaultValue="5511999999999"
            />
            <p className="text-xs text-muted-foreground">
              Formato: Código do país + DDD + Número (sem espaços ou caracteres especiais)
            </p>
          </div>
          <Button className="bg-brand-pink hover:bg-brand-pink/90">
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
