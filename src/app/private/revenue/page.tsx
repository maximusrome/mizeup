'use client'

import Sidebar from '@/components/Sidebar'

export default function RevenuePage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pt-16 lg:pt-0 lg:pl-64">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground">Revenue</h1>
              <p className="text-muted-foreground mt-2">
                Track your revenue and billing analytics
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-8 text-center">
              <div className="text-muted-foreground">
                <p className="text-lg">Revenue content will be implemented here</p>
                <p className="text-sm mt-2">This is a placeholder page</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
