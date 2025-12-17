'use client'

import { useState, useEffect } from 'react'
import { Product, ProductCategory } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'

export function ProductManager() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    category: 'autre',
    availableSizes: [],
    availableColors: [],
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.products || [])
        if (data.source === 'odoo') {
          toast({
            title: 'Produits synchronisés',
            description: `${data.count} produit(s) récupéré(s) depuis Odoo`,
          })
        } else if (data.source === 'fallback') {
          toast({
            title: 'Attention',
            description: 'Aucun produit trouvé dans Odoo, affichage des produits d\'exemple',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les produits',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingId('new')
    setFormData({
      name: '',
      description: '',
      category: 'autre',
      availableSizes: [],
      availableColors: [],
    })
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setFormData(product)
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({
      name: '',
      description: '',
      category: 'autre',
      availableSizes: [],
      availableColors: [],
    })
  }

  const handleSave = async () => {
    // Ici vous pouvez ajouter l'appel API pour sauvegarder
    toast({
      title: 'Info',
      description: 'La sauvegarde sera implémentée avec votre backend',
    })
    handleCancel()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return
    
    // Ici vous pouvez ajouter l'appel API pour supprimer
    toast({
      title: 'Info',
      description: 'La suppression sera implémentée avec votre backend',
    })
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Liste des produits ({products.length})</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Produits synchronisés depuis Odoo
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchProducts}>
            Actualiser (Cache)
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                setLoading(true)
                const response = await fetch('/api/products?refresh=true')
                const data = await response.json()
                if (data.success) {
                  setProducts(data.products || [])
                  toast({
                    title: 'Produits mis à jour',
                    description: `${data.count} produit(s) récupéré(s) depuis Odoo (refresh forcé)`,
                  })
                }
              } catch (error) {
                console.error('Erreur refresh produits:', error)
                toast({
                  title: 'Erreur',
                  description: 'Impossible de rafraîchir les produits',
                  variant: 'destructive',
                })
              } finally {
                setLoading(false)
              }
            }}
          >
            Forcer la mise à jour
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                const response = await fetch('/api/admin/test-odoo')
                const data = await response.json()
                toast({
                  title: data.success ? 'Test Odoo' : 'Erreur',
                  description: data.message || data.error,
                  variant: data.success ? 'default' : 'destructive',
                })
              } catch (error) {
                toast({
                  title: 'Erreur',
                  description: 'Erreur lors du test de connexion Odoo',
                  variant: 'destructive',
                })
              }
            }}
          >
            Tester Odoo
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un produit
          </Button>
        </div>
      </div>

      {editingId && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId === 'new' ? 'Nouveau produit' : 'Modifier le produit'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom du produit"
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={formData.category || 'autre'}
                  onValueChange={(value) => setFormData({ ...formData, category: value as ProductCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tshirt">T-shirt</SelectItem>
                    <SelectItem value="polo">Polo</SelectItem>
                    <SelectItem value="sweat">Sweat-shirt</SelectItem>
                    <SelectItem value="casquette">Casquette</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du produit"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{product.name}</h4>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                  )}
                  {product.category && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                      {product.category}
                    </span>
                  )}
                  <div className="mt-2 text-sm">
                    <p><strong>Tailles:</strong> {product.availableSizes.join(', ')}</p>
                    <p><strong>Couleurs:</strong> {product.availableColors.join(', ')}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

