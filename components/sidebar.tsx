"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Globe,
  Settings,
} from "lucide-react"

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    color: "text-brand-pink",
  },
  {
    label: "Produtos",
    icon: Package,
    href: "/produtos",
    color: "text-brand-teal",
  },
  {
    label: "Pedidos",
    icon: ShoppingCart,
    href: "/pedidos",
    color: "text-brand-pink",
  },
  {
    label: "Clientes",
    icon: Users,
    href: "/clientes",
    color: "text-brand-teal",
  },
  {
    label: "Catálogo Público",
    icon: Globe,
    href: "/catalogo",
    color: "text-brand-pink",
  },
  {
    label: "Configurações",
    icon: Settings,
    href: "/configuracoes",
    color: "text-gray-400",
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-brand-navy text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/" className="flex items-center pl-3 mb-14">
          <h1 className="text-2xl font-bold">
            <span className="text-brand-pink">Portal</span>
            <span className="text-brand-teal">360</span>
          </h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-white/10 rounded-lg transition",
                pathname === route.href
                  ? "bg-white/10 text-white"
                  : "text-gray-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-6 py-4 border-t border-white/10">
        <div className="text-xs text-gray-400">
          <p className="font-semibold text-white mb-1">Sua loja:</p>
          <p className="text-brand-teal">minhaloja.portal360.com.br</p>
        </div>
      </div>
    </div>
  )
}
