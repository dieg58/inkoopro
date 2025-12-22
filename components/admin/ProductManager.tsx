'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('admin.products')
  const commonT = useTranslations('common')
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

  const handleSync = async (limit?: number) => {
    try {
      setLoading(true)
      console.log('🔄 Début de la synchronisation...', { limit })
      
      const response = await fetch('/api/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: true, limit }),
      })
      
      const data = await response.json()
      console.log('📦 Réponse synchronisation:', data)
      
      if (data.success) {
        toast({
          title: t('syncSuccess'),
          description: data.message || `${data.count} produit(s) synchronisé(s)`,
        })
        // Recharger les produits après la synchronisation
        await fetchProducts()
      } else {
        toast({
          title: 'Erreur de synchronisation',
          description: data.error || 'Impossible de synchroniser les produits',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erreur synchronisation produits:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la synchronisation',
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
          <Button variant="outline" onClick={fetchProducts} disabled={loading}>
            Actualiser
          </Button>
          <Button 
            variant="default" 
            onClick={() => handleSync()}
            disabled={loading}
          >
            {loading ? 'Synchronisation...' : 'Synchroniser tous les produits'}
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addProduct')}
          </Button>
        </div>
      </div>

      {editingId && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId === 'new' ? t('newProduct') : t('editProduct')}</CardTitle>
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
                {commonT('cancel')}
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {commonT('save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {products.map((product) => (
          <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">{product.name}</h4>
                {product.supplierReference && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {product.supplierReference}
                  </span>
                )}
                {product.defaultCode && !product.supplierReference && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {product.defaultCode}
                  </span>
                )}
                {product.category && (
                  <span className="text-xs text-muted-foreground">
                    {product.category}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {product.availableSizes.length} taille(s) • {product.availableColors.length} couleur(s)
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(product)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(product.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

