import { AdminLayout } from '@/components/admin/AdminLayout'
import { PricingConfigManager } from '@/components/admin/PricingConfigManager'

export default function PricingConfigPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Configuration des facteurs de prix</h2>
          <p className="text-muted-foreground">Gérez les facteurs de prix appliqués aux produits et services</p>
        </div>
        <PricingConfigManager />
      </div>
    </AdminLayout>
  )
}

