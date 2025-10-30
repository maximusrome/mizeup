import Sidebar from './_components/sidebar'

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pt-16 lg:pt-0 lg:pl-64">
        {children}
      </div>
    </div>
  )
}

