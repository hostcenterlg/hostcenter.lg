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
  Store
} from "lucide-react"

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Produtos",
    icon: Package,
    href: "/dashboard/produtos",
  },
  {
    label: "Pedidos",
    icon: ShoppingCart,
    href: "/dashboard/pedidos",
  },
  {
    label: "Clientes",
    icon: Users,
    href: "/dashboard/clientes",
  },
  {
    label: "Meu Catálogo",
    icon: Globe,
    href: "/catalogo",
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-portal-navy text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <Store className="h-8 w-8 text-portal-pink" />
        <div>
          <h1 className="text-xl font-bold">PORTAL360</h1>
          <p className="text-xs text-gray-400">Seu catálogo digital</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/10",
              pathname === route.href
                ? "bg-portal-pink text-white"
                : "text-gray-300"
            )}
          >
            <route.icon className="h-5 w-5" />
            {route.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs text-gray-400">Seu link:</p>
          <p className="text-sm font-medium text-portal-teal">
            minhaloja.portal360.com.br
          </p>
        </div>
      </div>
    </div>
  )
}
