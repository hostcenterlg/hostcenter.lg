"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-bg-light">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-primary-pink">
            Design System RediRedi
          </h1>
          <p className="text-xl text-text-medium">
            HostCenter.lg - Sistema completo de componentes
          </p>
        </div>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Paleta de Cores</CardTitle>
            <CardDescription>Cores primárias do design system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="h-24 bg-primary-pink rounded-lg"></div>
                <p className="text-sm font-medium text-center">Primary Pink</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-primary-teal rounded-lg"></div>
                <p className="text-sm font-medium text-center">Primary Teal</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-primary-purple rounded-lg"></div>
                <p className="text-sm font-medium text-center">Primary Purple</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Botões</CardTitle>
            <CardDescription>Variações de botões disponíveis</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button>Default Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </CardContent>
        </Card>

        {/* Form Components */}
        <Card>
          <CardHeader>
            <CardTitle>Formulário</CardTitle>
            <CardDescription>Componentes de formulário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Digite seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Serviço</Label>
              <Select>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Hospedagem Compartilhada</SelectItem>
                  <SelectItem value="vps">VPS</SelectItem>
                  <SelectItem value="dedicated">Servidor Dedicado</SelectItem>
                  <SelectItem value="cloud">Cloud</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Enviar Formulário</Button>
          </CardFooter>
        </Card>

        {/* Dialog & Dropdown */}
        <Card>
          <CardHeader>
            <CardTitle>Modais e Menus</CardTitle>
            <CardDescription>Componentes interativos</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            {/* Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Abrir Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmação</DialogTitle>
                  <DialogDescription>
                    Este é um exemplo de dialog usando o design system RediRedi.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialog-input">Exemplo de Input</Label>
                    <Input id="dialog-input" placeholder="Digite algo..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancelar</Button>
                  <Button>Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Abrir Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Configurações</DropdownMenuItem>
                <DropdownMenuItem>Faturamento</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>

        {/* Status Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Cores de Status</CardTitle>
            <CardDescription>Estados e feedbacks visuais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-16 bg-[rgb(var(--success))] rounded-lg"></div>
                <p className="text-sm font-medium text-center">Success</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-[rgb(var(--warning))] rounded-lg"></div>
                <p className="text-sm font-medium text-center">Warning</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-[rgb(var(--error))] rounded-lg"></div>
                <p className="text-sm font-medium text-center">Error</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-[rgb(var(--info))] rounded-lg"></div>
                <p className="text-sm font-medium text-center">Info</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
