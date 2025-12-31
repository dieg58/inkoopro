import { AdminLayout } from '@/components/admin/AdminLayout'
import { QuoteManager } from '@/components/admin/QuoteManager'

export const dynamic = 'force-dynamic'

export default function QuotesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Gestion des devis</h2>
          <p className="text-muted-foreground">Consultez et gérez les devis envoyés depuis l'interface client</p>
        </div>
        <QuoteManager />
      </div>
    </AdminLayout>
  )
}

