'use client'

import { SelectedProduct } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ProductMultiSelectorProps {
  selectedProducts: SelectedProduct[]
  selectedProductIds: string[]
  onSelectionChange: (productIds: string[]) => void
}

export function ProductMultiSelector({
  selectedProducts,
  selectedProductIds,
  onSelectionChange,
}: ProductMultiSelectorProps) {
  const toggleProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      onSelectionChange(selectedProductIds.filter(id => id !== productId))
    } else {
      onSelectionChange([...selectedProductIds, productId])
    }
  }

  const selectAll = () => {
    onSelectionChange(selectedProducts.map(p => p.id))
  }

  const deselectAll = () => {
    onSelectionChange([])
  }

  const getTotalQuantity = (product: SelectedProduct) => {
    return product.colorQuantities.reduce((total, cq) => {
      return total + cq.quantities.reduce((sum, q) => sum + q.quantity, 0)
    }, 0)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>2. Sélectionnez les produits à personnaliser</CardTitle>
            <CardDescription>
              Choisissez un ou plusieurs produits pour leur appliquer la même technique
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Tout sélectionner
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Tout désélectionner
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedProducts.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Aucun produit sélectionné. Veuillez d'abord ajouter des produits.
          </p>
        ) : (
          selectedProducts.map(product => {
            const isSelected = selectedProductIds.includes(product.id)
            return (
              <div
                key={product.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
                onClick={() => toggleProduct(product.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProduct(product.id)}
                      className="h-4 w-4 rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{product.product.name}</h4>
                    {product.clientProvided && (
                      <p className="text-sm text-muted-foreground mb-1">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          Fourni par le client
                        </span>
                      </p>
                    )}
                    <div className="text-sm text-muted-foreground mt-1">
                      {product.colorQuantities.map(cq => (
                        <span key={cq.color} className="mr-2">
                          {cq.color}: {cq.quantities
                            .filter(q => q.quantity > 0)
                            .map(q => `${q.size} (${q.quantity})`)
                            .join(', ')}
                        </span>
                      ))}
                      <p className="mt-1 font-medium">
                        Total: {getTotalQuantity(product)} pièce(s)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        {selectedProductIds.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium">
              {selectedProductIds.length} produit{selectedProductIds.length > 1 ? 's' : ''} sélectionné{selectedProductIds.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

