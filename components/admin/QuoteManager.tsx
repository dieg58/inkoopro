'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

export function QuoteManager() {
  // Pour l'instant, affichage statique
  // À connecter avec votre backend Odoo pour récupérer les devis

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Devis récents</CardTitle>
          <CardDescription>Les devis sont synchronisés depuis Odoo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Les devis seront affichés ici une fois connectés à Odoo</p>
            <p className="text-sm mt-2">Configurez l'intégration Odoo pour voir les devis</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

