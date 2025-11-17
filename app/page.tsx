import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <h1 className="text-2xl font-bold">Rediredi</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">Entrar</Button>
              <Button>Criar Conta</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Posts Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bem-vindo ao Rediredi!</CardTitle>
                <CardDescription>
                  Um clone moderno do Reddit criado com Next.js, TypeScript, Tailwind CSS e Prisma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center space-y-1">
                      <Button variant="ghost" size="sm">↑</Button>
                      <span className="text-sm font-bold">42</span>
                      <Button variant="ghost" size="sm">↓</Button>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        Primeiro post de exemplo
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Postado por u/admin em r/geral
                      </p>
                      <p className="text-sm">
                        Este é um exemplo de post no Rediredi. Você pode criar posts, comentar e votar!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center space-y-1">
                      <Button variant="ghost" size="sm">↑</Button>
                      <span className="text-sm font-bold">28</span>
                      <Button variant="ghost" size="sm">↓</Button>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        Como usar o Rediredi
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Postado por u/admin em r/ajuda
                      </p>
                      <p className="text-sm">
                        Crie uma conta, participe de comunidades e comece a postar!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sobre o Rediredi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Uma plataforma de comunidades onde você pode participar de discussões,
                  compartilhar conteúdo e se conectar com pessoas.
                </p>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Membros</span>
                    <span className="font-semibold">1.2M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Online</span>
                    <span className="font-semibold">42K</span>
                  </div>
                </div>
                <Separator />
                <Button className="w-full">Criar Post</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comunidades Populares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer">
                  <div className="w-8 h-8 bg-primary rounded-full"></div>
                  <div>
                    <p className="text-sm font-semibold">r/nextjs</p>
                    <p className="text-xs text-muted-foreground">250K membros</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer">
                  <div className="w-8 h-8 bg-secondary rounded-full"></div>
                  <div>
                    <p className="text-sm font-semibold">r/typescript</p>
                    <p className="text-xs text-muted-foreground">180K membros</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer">
                  <div className="w-8 h-8 bg-accent rounded-full"></div>
                  <div>
                    <p className="text-sm font-semibold">r/webdev</p>
                    <p className="text-xs text-muted-foreground">500K membros</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
