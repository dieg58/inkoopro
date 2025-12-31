import { AdminLayout } from '@/components/admin/AdminLayout'
import { ProductManager } from '@/components/admin/ProductManager'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Gestion des produits</h2>
          <p className="text-muted-foreground">Gérez les produits disponibles pour les devis</p>
        </div>
        <ProductManager />
      </div>
    </AdminLayout>
  )
}

