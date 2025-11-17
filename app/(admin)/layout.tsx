import { Sidebar } from "@/components/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex">
      <div className="w-72 flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
