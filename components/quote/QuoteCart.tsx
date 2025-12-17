'use client'

import { QuoteItem } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface QuoteCartProps {
  items: QuoteItem[]
  onRemoveItem: (id: string) => void
  onEditItem?: (id: string) => void
}

export function QuoteCart({ items, onRemoveItem, onEditItem }: QuoteCartProps) {
  const getTotalQuantity = (item: QuoteItem) => {
    return item.colorQuantities.reduce((total, cq) => {
      return total + cq.quantities.reduce((sum, q) => sum + q.quantity, 0)
    }, 0)
  }

  const formatTechniqueOptions = (technique: string, options: any) => {
    if (technique === 'serigraphie') {
      const textileType = options.textileType === 'clair' ? 'textile clair' : 'textile foncé'
      return `${textileType}, ${options.nombreCouleurs} couleur(s), ${options.dimension || 'N/A'}, ${options.nombreEmplacements} emplacement(s)`
    } else if (technique === 'broderie') {
      return `${options.nombrePoints.toLocaleString()} points, ${options.nombreEmplacements} emplacement(s)`
    } else if (technique === 'dtf') {
      return `${options.dimension || 'N/A'}, ${options.nombreEmplacements} emplacement(s)`
    }
    return ''
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Votre devis</CardTitle>
          <CardDescription>Votre panier est vide</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Votre devis ({items.length} article(s))</CardTitle>
        <CardDescription>Articles ajoutés à votre devis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold">
                  {item.product.name}
                  {item.clientProvided && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Fourni par le client
                    </span>
                  )}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {item.colorQuantities.map(cq => (
                    <span key={cq.color} className="mr-2">
                      {cq.color}: {cq.quantities
                        .filter(q => q.quantity > 0)
                        .map(q => `${q.size} (${q.quantity})`)
                        .join(', ')}
                    </span>
                  ))}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Technique: {item.technique} - {formatTechniqueOptions(item.technique, item.techniqueOptions)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Position: {item.position ? (item.position.type === 'custom' ? item.position.customDescription : item.position.type) : 'N/A'}
                </p>
                <p className="text-sm font-medium mt-2">
                  Quantité totale: {getTotalQuantity(item)} pièce(s)
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

