'use client'

import { useState, useEffect } from 'react'
import { Product, ColorQuantities, ProductSize, ProductColor, SelectedProduct } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, Search } from 'lucide-react'
import { TEXTILE_DISCOUNT_PERCENTAGE } from '@/lib/data'

interface ProductSelectorProps {
  selectedProducts: SelectedProduct[]
  onProductsChange: (products: SelectedProduct[]) => void
  onContinue: () => void
}

export function ProductSelector({ selectedProducts, onProductsChange, onContinue }: ProductSelectorProps) {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [clientProvided, setClientProvided] = useState(false)
  const [colorQuantities, setColorQuantities] = useState<ColorQuantities[]>([])
  const [loading, setLoading] = useState(true)
  const [productsSource, setProductsSource] = useState<'odoo' | 'fallback' | 'sample' | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedColorsFilter, setSelectedColorsFilter] = useState<string[]>([]) // Filtre des couleurs à afficher
  const [isColorFilterOpen, setIsColorFilterOpen] = useState(false) // État du menu déroulant des couleurs
  const [colorSearchQuery, setColorSearchQuery] = useState('') // Recherche dans le filtre de couleurs
  const [showBlankForm, setShowBlankForm] = useState(false) // Afficher le formulaire de blank personnalisé
  const [blankColors, setBlankColors] = useState<string[]>(['Blanc']) // Couleurs du blank
  const [blankSizes, setBlankSizes] = useState<ProductSize[]>(['S', 'M', 'L', 'XL']) // Tailles du blank
  const [blankColorQuantities, setBlankColorQuantities] = useState<ColorQuantities[]>([]) // Quantités du blank

  // Charger les produits depuis l'API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/products')
        const data = await response.json()
        if (data.success) {
          setProducts(data.products || [])
          setProductsSource(data.source || null)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Fermer le menu de filtre de couleurs quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isColorFilterOpen && !target.closest('.color-filter-menu')) {
        setIsColorFilterOpen(false)
      }
    }

    if (isColorFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isColorFilterOpen])

  // Fonction pour détecter si un produit est Stanley ou Toptex
  const isStanleyOrToptex = (product: Product): boolean => {
    const name = product.name.toLowerCase()
    return name.includes('stanley') || name.includes('toptex')
  }

  // Filtrer les produits selon la recherche (si vide, afficher tous les produits)
  const filteredProducts = searchQuery.trim() === ''
    ? products
    : products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setSelectedProduct(product)
      setClientProvided(false)
      setSearchQuery(product.name) // Afficher le nom du produit sélectionné
      setIsDropdownOpen(false) // Fermer le dropdown
      setShowBlankForm(false) // Réinitialiser le formulaire blank
      // Initialiser toutes les couleurs disponibles dans le tableau
      const initialColors: ColorQuantities[] = product.availableColors.map(color => ({
        color,
        quantities: product.availableSizes.map(size => ({
          size: size as ProductSize,
          quantity: 0,
        })),
      }))
      setColorQuantities(initialColors)
      // Initialiser le filtre avec toutes les couleurs sélectionnées par défaut
      setSelectedColorsFilter(product.availableColors)
      setColorSearchQuery('')
      setIsColorFilterOpen(false)
    }
  }

  // Initialiser le formulaire blank
  const initializeBlankForm = () => {
    setShowBlankForm(true)
    setSelectedProduct(null)
    setSearchQuery('')
    setIsDropdownOpen(false)
    // Initialiser avec des valeurs par défaut
    const defaultSizes: ProductSize[] = ['S', 'M', 'L', 'XL', '2XL']
    const defaultColors = ['Blanc']
    setBlankSizes(defaultSizes)
    setBlankColors(defaultColors)
    // Initialiser les quantités
    const initialBlankColors: ColorQuantities[] = defaultColors.map(color => ({
      color,
      quantities: defaultSizes.map(size => ({
        size,
        quantity: 0,
      })),
    }))
    setBlankColorQuantities(initialBlankColors)
  }

  // Ajouter une couleur au blank
  const addBlankColor = () => {
    const newColor = prompt('Entrez le nom de la couleur:')
    if (newColor && newColor.trim() && !blankColors.includes(newColor.trim())) {
      const updatedColors = [...blankColors, newColor.trim()]
      setBlankColors(updatedColors)
      // Ajouter les quantités pour cette nouvelle couleur
      const newColorQuantities: ColorQuantities = {
        color: newColor.trim(),
        quantities: blankSizes.map(size => ({
          size,
          quantity: 0,
        })),
      }
      setBlankColorQuantities([...blankColorQuantities, newColorQuantities])
    }
  }

  // Supprimer une couleur du blank
  const removeBlankColor = (color: string) => {
    if (blankColors.length > 1) {
      setBlankColors(blankColors.filter(c => c !== color))
      setBlankColorQuantities(blankColorQuantities.filter(cq => cq.color !== color))
    }
  }

  // Ajouter une taille au blank
  const addBlankSize = (size: ProductSize) => {
    if (!blankSizes.includes(size)) {
      const updatedSizes = [...blankSizes, size]
      setBlankSizes(updatedSizes)
      // Ajouter cette taille à toutes les couleurs
      const updatedQuantities = blankColorQuantities.map(cq => ({
        ...cq,
        quantities: [...cq.quantities, { size, quantity: 0 }],
      }))
      setBlankColorQuantities(updatedQuantities)
    }
  }

  // Supprimer une taille du blank
  const removeBlankSize = (size: ProductSize) => {
    if (blankSizes.length > 1) {
      setBlankSizes(blankSizes.filter(s => s !== size))
      const updatedQuantities = blankColorQuantities.map(cq => ({
        ...cq,
        quantities: cq.quantities.filter(q => q.size !== size),
      }))
      setBlankColorQuantities(updatedQuantities)
    }
  }

  // Mettre à jour la quantité du blank
  const updateBlankQuantity = (colorIndex: number, sizeIndex: number, quantity: number) => {
    const updated = [...blankColorQuantities]
    updated[colorIndex].quantities[sizeIndex].quantity = Math.max(0, quantity)
    setBlankColorQuantities(updated)
  }

  // Ajouter le blank personnalisé
  const handleAddBlank = () => {
    // Vérifier qu'il y a au moins une quantité > 0
    const hasQuantities = blankColorQuantities.some(cq =>
      cq.quantities.some(q => q.quantity > 0)
    )
    
    if (!hasQuantities) {
      toast({
        title: 'Erreur',
        description: 'Veuillez indiquer au moins une quantité',
        variant: 'destructive',
      })
      return
    }

    // Créer un produit virtuel "blank"
    const blankProduct: Product = {
      id: `blank-${Date.now()}`,
      name: 'Blank personnalisé (fourni par le client)',
      description: 'Textile personnalisé fourni par le client',
      availableSizes: blankSizes,
      availableColors: blankColors,
      basePrice: 0, // Toujours 0 car fourni par le client
    }

    const newProduct: SelectedProduct = {
      id: Date.now().toString(),
      product: blankProduct,
      clientProvided: true, // Toujours true pour les blanks
      colorQuantities: blankColorQuantities.filter(cq =>
        cq.quantities.some(q => q.quantity > 0)
      ),
    }
    onProductsChange([...selectedProducts, newProduct])

    // Reset
    setShowBlankForm(false)
    setBlankColors(['Blanc'])
    setBlankSizes(['S', 'M', 'L', 'XL'])
    setBlankColorQuantities([])
  }

  // Toggle une couleur dans le filtre
  const toggleColorFilter = (color: string) => {
    setSelectedColorsFilter(prev => {
      if (prev.includes(color)) {
        // Si la couleur est déjà sélectionnée, la retirer (mais garder au moins une couleur)
        const newFilter = prev.filter(c => c !== color)
        return newFilter.length > 0 ? newFilter : prev
      } else {
        // Ajouter la couleur
        return [...prev, color]
      }
    })
  }

  // Filtrer les colorQuantities selon les couleurs sélectionnées
  const filteredColorQuantities = selectedColorsFilter.length > 0
    ? colorQuantities.filter(cq => selectedColorsFilter.includes(cq.color))
    : colorQuantities

  // Filtrer les couleurs disponibles pour le menu déroulant selon la recherche
  const filteredColorsForMenu = selectedProduct
    ? selectedProduct.availableColors.filter(color =>
        color.toLowerCase().includes(colorSearchQuery.toLowerCase())
      )
    : []

  const updateQuantity = (colorIndex: number, sizeIndex: number, quantity: number) => {
    const updated = [...colorQuantities]
    updated[colorIndex].quantities[sizeIndex].quantity = Math.max(0, quantity)
    setColorQuantities(updated)
  }

  const handleAddProduct = () => {
    if (!selectedProduct) return
    
    // Vérifier qu'il y a au moins une quantité > 0 (même si le client fournit le produit)
    const hasQuantities = colorQuantities.some(cq =>
      cq.quantities.some(q => q.quantity > 0)
    )
    
    if (!hasQuantities) {
      toast({
        title: 'Erreur',
        description: 'Veuillez indiquer au moins une quantité',
        variant: 'destructive',
      })
      return
    }

    const newProduct: SelectedProduct = {
      id: Date.now().toString(),
      product: selectedProduct,
      clientProvided: clientProvided,
      colorQuantities: colorQuantities.filter(cq =>
        cq.quantities.some(q => q.quantity > 0)
      ),
    }
    onProductsChange([...selectedProducts, newProduct])

    // Reset
    setSelectedProduct(null)
    setColorQuantities([])
    setClientProvided(false)
    setSearchQuery('')
    setIsDropdownOpen(false)
    setSelectedColorsFilter([])
    setColorSearchQuery('')
    setIsColorFilterOpen(false)
  }

  const removeSelectedProduct = (id: string) => {
    onProductsChange(selectedProducts.filter(p => p.id !== id))
  }

  const getTotalQuantity = (colorQuantities: ColorQuantities[]) => {
    return colorQuantities.reduce((total, cq) => {
      return total + cq.quantities.reduce((sum, q) => sum + q.quantity, 0)
    }, 0)
  }

  const [pricingConfig, setPricingConfig] = useState<{ textileDiscountPercentage: number }>({
    textileDiscountPercentage: 30,
  })

  // Charger la configuration des prix
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/pricing-config')
        const data = await response.json()
        if (data.success && data.config) {
          setPricingConfig({
            textileDiscountPercentage: data.config.textileDiscountPercentage || 30,
          })
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration des prix:', error)
        // Utiliser les valeurs par défaut en cas d'erreur
        setPricingConfig({ textileDiscountPercentage: 30 })
      }
    }
    loadConfig()
  }, [])

  // Fonction pour obtenir le prix d'une variante (couleur + taille)
  const getVariantPrice = (color: string, size: ProductSize): number | null => {
    if (!selectedProduct) return null
    
    // Si le client fournit le produit, le prix affiché est toujours 0
    // (mais le prix réel indexé sera utilisé pour Odoo)
    if (clientProvided) {
      return 0
    }
    
    let basePrice: number | null = null
    
    // Si variantPrices existe, essayer de trouver le prix spécifique
    if (selectedProduct.variantPrices) {
      // Essayer différentes clés possibles
      const keys = [
        `${color}-${size}`,      // "Rouge-S"
        `${color} ${size}`,       // "Rouge S"
        `${size}-${color}`,      // "S-Rouge"
        `${size} ${color}`,       // "S Rouge"
        color,                    // Juste la couleur
        size,                     // Juste la taille
      ]
      
      for (const key of keys) {
        if (selectedProduct.variantPrices[key] !== undefined) {
          basePrice = selectedProduct.variantPrices[key]
          break
        }
      }
    }
    
    // Si aucun prix spécifique trouvé, utiliser le prix de base
    if (basePrice === null) {
      basePrice = selectedProduct.basePrice || null
    }
    
    // Appliquer la réduction sur le textile si configurée
    if (basePrice !== null && pricingConfig.textileDiscountPercentage > 0) {
      const discount = (basePrice * pricingConfig.textileDiscountPercentage) / 100
      return basePrice - discount
    }
    
    return basePrice
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>1. Sélectionnez vos produits</CardTitle>
              <CardDescription>Choisissez un ou plusieurs produits avec leurs tailles et quantités</CardDescription>
            </div>
            {productsSource === 'odoo' && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Synchronisé avec Odoo
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Option pour ajouter un blank personnalisé */}
          {!showBlankForm && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div>
                <Label className="font-semibold">Blank personnalisé</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajoutez un textile personnalisé (hors Stanley/Toptex) que vous fournissez
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={initializeBlankForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un blank
              </Button>
            </div>
          )}

          {/* Formulaire pour le blank personnalisé */}
          {showBlankForm && (
            <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Blank personnalisé</CardTitle>
                    <CardDescription>Textile fourni par le client (hors Stanley/Toptex)</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowBlankForm(false)
                      setBlankColorQuantities([])
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Gestion des couleurs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Couleurs</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addBlankColor}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter une couleur
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {blankColors.map(color => (
                      <div
                        key={color}
                        className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md"
                      >
                        <span className="text-sm">{color}</span>
                        {blankColors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBlankColor(color)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gestion des tailles */}
                <div className="space-y-2">
                  <Label>Tailles disponibles</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Taille unique'] as ProductSize[]).map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          if (blankSizes.includes(size)) {
                            removeBlankSize(size)
                          } else {
                            addBlankSize(size)
                          }
                        }}
                        className={`px-3 py-1 rounded-md border text-sm transition-colors ${
                          blankSizes.includes(size)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tableau des quantités */}
                {blankColorQuantities.length > 0 && blankSizes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Quantités par couleur et taille</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border p-2 text-left font-semibold sticky left-0 bg-muted z-10 min-w-[120px]">
                                Couleur
                              </th>
                              {blankSizes.map(size => (
                                <th key={size} className="border p-2 text-center font-semibold min-w-[80px]">
                                  {size}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {blankColorQuantities.map((cq, colorIndex) => (
                              <tr key={cq.color} className="hover:bg-muted/50">
                                <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                                  {cq.color}
                                </td>
                                {cq.quantities.map((qty, sizeIndex) => (
                                  <td key={sizeIndex} className="border p-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={qty.quantity || ''}
                                      onChange={(e) =>
                                        updateBlankQuantity(
                                          colorIndex,
                                          sizeIndex,
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      placeholder="0"
                                      className="w-full text-center h-9"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium">
                        Total: {getTotalQuantity(blankColorQuantities)} pièce(s)
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAddBlank}
                  disabled={getTotalQuantity(blankColorQuantities) === 0}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter ce blank
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Champ de recherche avec liste déroulante */}
          <div className="space-y-2">
            <Label>Produit</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                placeholder="Tapez pour rechercher ou cliquez pour voir tous les produits..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsDropdownOpen(true)
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => {
                  // Délai pour permettre le clic sur un élément
                  setTimeout(() => setIsDropdownOpen(false), 200)
                }}
                className="pl-10"
              />
              
              {/* Liste déroulante */}
              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Chargement des produits...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchQuery ? 'Aucun produit ne correspond à votre recherche' : 'Aucun produit disponible'}
                    </div>
                  ) : (
                    <div className="p-1">
                      {filteredProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => handleProductSelect(product.id)}
                          className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                            selectedProduct?.id === product.id
                              ? 'bg-accent text-accent-foreground font-medium'
                              : ''
                          }`}
                        >
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{product.description}</div>
                          )}
                          {product.basePrice && (
                            <div className="text-xs text-blue-600 mt-0.5">
                              À partir de {product.basePrice.toFixed(2)} €
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Checkbox "Fourni par le client" */}
          {selectedProduct && !showBlankForm && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="clientProvided"
                checked={clientProvided}
                onChange={(e) => setClientProvided(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="clientProvided" className="cursor-pointer">
                Je fournis ce produit
              </Label>
            </div>
          )}

          {/* Option pour ajouter un blank si le produit n'est pas Stanley/Toptex */}
          {selectedProduct && !isStanleyOrToptex(selectedProduct) && !showBlankForm && (
            <div className="p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Label className="font-semibold text-sm">Blank personnalisé disponible</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ce produit n'est pas Stanley ou Toptex. Vous pouvez ajouter un blank personnalisé que vous fournissez.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={initializeBlankForm}
                  className="ml-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un blank
                </Button>
              </div>
            </div>
          )}

          {/* Configuration des quantités (toujours demandée, même si le client fournit) */}
          {selectedProduct && colorQuantities.length > 0 && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Couleurs et quantités par taille</Label>
                </div>
                
                {/* Filtre des couleurs - Menu déroulant */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Filtrer par couleur :</Label>
                  <div className="relative color-filter-menu">
                    <button
                      type="button"
                      onClick={() => setIsColorFilterOpen(!isColorFilterOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background hover:bg-muted transition-colors text-sm"
                    >
                      <span>
                        {selectedColorsFilter.length === 0
                          ? 'Toutes les couleurs'
                          : selectedColorsFilter.length === selectedProduct.availableColors.length
                          ? 'Toutes les couleurs'
                          : `${selectedColorsFilter.length} couleur${selectedColorsFilter.length > 1 ? 's' : ''} sélectionnée${selectedColorsFilter.length > 1 ? 's' : ''}`
                        }
                      </span>
                      <svg
                        className={`h-4 w-4 transition-transform ${isColorFilterOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Menu déroulant */}
                    {isColorFilterOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-hidden flex flex-col color-filter-menu">
                        {/* Champ de recherche */}
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Rechercher une couleur..."
                              value={colorSearchQuery}
                              onChange={(e) => setColorSearchQuery(e.target.value)}
                              className="pl-8 h-8"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        
                        {/* Liste des couleurs avec checkboxes */}
                        <div className="overflow-y-auto max-h-[250px] p-1">
                          {filteredColorsForMenu.length === 0 ? (
                            <div className="p-3 text-center text-sm text-muted-foreground">
                              Aucune couleur trouvée
                            </div>
                          ) : (
                            <>
                              {filteredColorsForMenu.map(color => {
                                const isSelected = selectedColorsFilter.includes(color)
                                return (
                                  <label
                                    key={color}
                                    className="flex items-center px-3 py-2 rounded-sm hover:bg-accent cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleColorFilter(color)}
                                      className="h-4 w-4 rounded border-gray-300 mr-2"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-sm">{color}</span>
                                  </label>
                                )
                              })}
                            </>
                          )}
                        </div>
                        
                        {/* Boutons d'action */}
                        <div className="p-2 border-t flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedColorsFilter(selectedProduct.availableColors)
                              setColorSearchQuery('')
                            }}
                            className="flex-1 px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
                          >
                            Tout sélectionner
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedColorsFilter([])
                              setColorSearchQuery('')
                            }}
                            className="flex-1 px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
                          >
                            Tout désélectionner
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left font-semibold sticky left-0 bg-muted z-10 min-w-[120px]">
                            Couleur
                          </th>
                          {selectedProduct.availableSizes.map(size => (
                            <th key={size} className="border p-2 text-center font-semibold min-w-[80px]">
                              {size}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredColorQuantities.map((cq) => {
                          // Trouver l'index original dans colorQuantities pour updateQuantity
                          const colorIndex = colorQuantities.findIndex(c => c.color === cq.color)
                          return (
                            <tr key={cq.color} className="hover:bg-muted/50">
                              <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                                {cq.color}
                              </td>
                              {cq.quantities.map((qty, sizeIndex) => {
                                const price = getVariantPrice(cq.color, qty.size)
                                return (
                                  <td key={sizeIndex} className="border p-1">
                                    <div className="flex flex-col items-center gap-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        value={qty.quantity || ''}
                                        onChange={(e) =>
                                          updateQuantity(
                                            colorIndex,
                                            sizeIndex,
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        placeholder="0"
                                        className="w-full text-center h-9"
                                      />
                                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                        {price !== null ? `${price.toFixed(2)} €` : selectedProduct?.basePrice ? `${selectedProduct.basePrice.toFixed(2)} €` : '-'}
                                      </span>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium">
                  Total: {getTotalQuantity(colorQuantities)} pièce(s)
                </p>
              </div>
            </>
          )}

          {/* Bouton pour ajouter le produit */}
          {selectedProduct && (
            <Button
              onClick={handleAddProduct}
              disabled={getTotalQuantity(colorQuantities) === 0}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter ce produit
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Liste des produits sélectionnés */}
      {selectedProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produits sélectionnés ({selectedProducts.length})</CardTitle>
            <CardDescription>Vous pouvez ajouter plusieurs produits avant de passer à la personnalisation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProducts.map((selectedProduct) => (
              <div key={selectedProduct.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{selectedProduct.product.name}</h4>
                    {selectedProduct.clientProvided ? (
                      <p className="text-sm text-muted-foreground">Fourni par le client</p>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {selectedProduct.colorQuantities.map(cq => (
                          <span key={cq.color} className="mr-2">
                            {cq.color}: {cq.quantities
                              .filter(q => q.quantity > 0)
                              .map(q => `${q.size} (${q.quantity})`)
                              .join(', ')}
                          </span>
                        ))}
                        <p className="mt-1 font-medium">
                          Total: {getTotalQuantity(selectedProduct.colorQuantities)} pièce(s)
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSelectedProduct(selectedProduct.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button onClick={onContinue} className="w-full" size="lg">
              Continuer vers la personnalisation ({selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''})
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
