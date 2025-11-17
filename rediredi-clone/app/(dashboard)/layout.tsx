export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      {/* Adicione aqui sua navegação/sidebar do dashboard */}
      {children}
    </div>
  )
}
