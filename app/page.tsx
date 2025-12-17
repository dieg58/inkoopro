'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Quote, QuoteItem, SelectedProduct, TechniqueType, TechniqueOptions, Position, Delivery, Delay } from '@/types'
import { ProductSelector } from '@/components/quote/ProductSelector'
import { CustomizationManager } from '@/components/quote/CustomizationManager'
import { OrderSummary } from '@/components/quote/OrderSummary'
import { DeliverySelector } from '@/components/quote/DeliverySelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { delayOptions } from '@/lib/data'
import { Loader2, CheckCircle2, ArrowLeft, LogOut, User, Package } from 'lucide-react'

type CurrentStep = 'products' | 'customization' | 'review'

interface ProductCustomization {
  selectedProductIds: string[] // Produits concernés par cette personnalisation
  technique: TechniqueType | null
  techniqueOptions: TechniqueOptions | null
  position: Position | null
  files?: Array<{ id: string; name: string; url: string; size: number; type: string }>
  notes?: string
}

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [currentMarkings, setCurrentMarkings] = useState<Array<{
    id: string
    selectedProductIds: string[]
    technique: TechniqueType | null
    techniqueOptions: TechniqueOptions | null
    position: Position | null
    files?: Array<{ id: string; name: string; url: string; size: number; type: string }>
    notes?: string
  }>>([])
  const [currentStep, setCurrentStep] = useState<CurrentStep>('products')
  const [delivery, setDelivery] = useState<Delivery>({ type: 'livraison' })
  const [delay, setDelay] = useState<Delay>(delayOptions[0]) // Par défaut : 10 jours ouvrables
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [client, setClient] = useState<any>(null)
  const [isLoadingClient, setIsLoadingClient] = useState(true)

  // Sauvegarder l'état dans la base de données
  const saveToDatabase = async () => {
    try {
      await fetch('/api/quotes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedProducts,
          quoteItems,
          currentMarkings,
          currentStep,
          delivery,
          delay,
          clientInfo,
        }),
      })
    } catch (error) {
      console.error('Erreur sauvegarde base de données:', error)
      // Fallback vers localStorage en cas d'erreur
      try {
        const data = {
          selectedProducts,
          quoteItems,
          currentMarkings,
          currentStep,
          delivery,
          delay,
          clientInfo,
        }
        localStorage.setItem('inkoo_pro_quote_draft', JSON.stringify(data))
      } catch (localError) {
        console.error('Erreur sauvegarde localStorage fallback:', localError)
      }
    }
  }

  // Charger l'état depuis la base de données
  const loadFromDatabase = async () => {
    try {
      const response = await fetch('/api/quotes/current')
      const data = await response.json()
      if (data.success && data.quote) {
        return data.quote
      }
    } catch (error) {
      console.error('Erreur chargement base de données:', error)
      // Fallback vers localStorage
      try {
        const saved = localStorage.getItem('inkoo_pro_quote_draft')
        if (saved) {
          return JSON.parse(saved)
        }
      } catch (localError) {
        console.error('Erreur chargement localStorage fallback:', localError)
      }
    }
    return null
  }

  // Nettoyer les données sauvegardées
  const clearSavedData = async () => {
    try {
      // TODO: Implémenter la suppression du devis dans la DB
      localStorage.removeItem('inkoo_pro_quote_draft')
    } catch (error) {
      console.error('Erreur nettoyage données:', error)
    }
  }

  // Charger les informations du client connecté et restaurer l'état
  useEffect(() => {
    const loadClient = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        if (data.success && data.client) {
          setClient(data.client)
          
          // Charger les données sauvegardées depuis la base de données
          const savedData = await loadFromDatabase()
          
          // Pré-remplir les informations client (priorité aux données Odoo)
          setClientInfo({
            name: data.client.name || savedData?.clientInfo?.name || '',
            email: data.client.email || savedData?.clientInfo?.email || '',
            company: data.client.company || savedData?.clientInfo?.company || '',
            phone: data.client.phone || savedData?.clientInfo?.phone || '',
          })
          
          // Pré-remplir l'adresse de livraison (priorité aux données Odoo)
          if (data.client.street || data.client.city || data.client.zip) {
            const clientAddress = {
              street: data.client.street || '',
              city: data.client.city || '',
              postalCode: data.client.zip || '',
              country: data.client.country || 'France',
            }
            setDelivery({
              type: 'livraison',
              address: clientAddress,
              // Pré-remplir aussi l'adresse de facturation avec les mêmes données
              billingAddress: clientAddress,
              billingAddressDifferent: savedData?.delivery?.billingAddressDifferent || false,
            })
          } else if (savedData?.delivery) {
            setDelivery(savedData.delivery)
          }
          
          // Restaurer les autres données sauvegardées
          if (savedData) {
            if (savedData.selectedProducts && savedData.selectedProducts.length > 0) {
              setSelectedProducts(savedData.selectedProducts)
            }
            if (savedData.quoteItems && savedData.quoteItems.length > 0) {
              setQuoteItems(savedData.quoteItems)
            }
            if (savedData.currentMarkings && savedData.currentMarkings.length > 0) {
              setCurrentMarkings(savedData.currentMarkings)
            }
            if (savedData.step) {
              // Valider que l'étape existe toujours (en cas de changement de structure)
              const validSteps: CurrentStep[] = ['products', 'customization', 'review']
              if (validSteps.includes(savedData.step)) {
                setCurrentStep(savedData.step)
              } else {
                // Si l'étape n'est plus valide, réinitialiser à 'products'
                setCurrentStep('products')
              }
            }
            if (savedData.delay) {
              setDelay(savedData.delay)
            }
          }
        }
      } catch (error) {
        console.error('Erreur chargement client:', error)
      } finally {
        setIsLoadingClient(false)
      }
    }
    loadClient()
  }, [])

  // S'assurer que currentStep est toujours valide
  useEffect(() => {
    const validSteps: CurrentStep[] = ['products', 'customization', 'review']
    if (!validSteps.includes(currentStep)) {
      console.warn('État invalide détecté, réinitialisation à "products"', currentStep)
      setCurrentStep('products')
    }
  }, [currentStep])

  // Sauvegarder automatiquement à chaque modification importante (avec debounce)
  useEffect(() => {
    if (isLoadingClient || isSubmitted) return
    
    // Debounce pour éviter trop de sauvegardes
    const timeoutId = setTimeout(() => {
      saveToDatabase()
    }, 500) // Sauvegarde après 500ms d'inactivité
    
    return () => clearTimeout(timeoutId)
  }, [selectedProducts, quoteItems, currentMarkings, currentStep, delivery, delay, clientInfo, isLoadingClient, isSubmitted])

  const handleProductsContinue = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un produit',
        variant: 'destructive',
      })
      return
    }
    
    // Passer à l'étape de personnalisation
    setCurrentStep('customization')
  }

  // Gérer la complétion de la personnalisation (appelé par CustomizationManager)
  const handleCustomizationComplete = (markings: Array<{
    id: string
    selectedProductIds: string[]
    technique: TechniqueType | null
    techniqueOptions: TechniqueOptions | null
    position: Position | null
    files?: Array<{ id: string; name: string; url: string; size: number; type: string }>
    notes?: string
  }>) => {
    // Convertir les marquages en QuoteItems
    const items: QuoteItem[] = []
    
    markings.forEach(marking => {
      // Vérifier que le marquage est complet
      if (!marking.technique || !marking.techniqueOptions) {
        return
      }
      
      const technique = marking.technique
      const techniqueOptions = marking.techniqueOptions
      
      marking.selectedProductIds.forEach(productId => {
        const product = selectedProducts.find(p => p.id === productId)
        if (product) {
          const totalQuantity = product.colorQuantities.reduce((total, cq) => {
            return total + cq.quantities.reduce((sum, q) => sum + q.quantity, 0)
          }, 0)

          items.push({
            id: `${product.id}-${technique}-${Date.now()}-${Math.random()}`,
            product: product.product,
            clientProvided: product.clientProvided,
            colorQuantities: product.colorQuantities,
            technique: technique,
            techniqueOptions: techniqueOptions,
            position: marking.position,
            files: marking.files,
            notes: marking.notes,
            totalQuantity,
          })
        }
      })
    })

    setQuoteItems(items)
    setCurrentStep('review')
  }

  const handleRemoveItem = (id: string) => {
    setQuoteItems(quoteItems.filter(item => item.id !== id))
  }

  const handleSubmit = async () => {
    if (quoteItems.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez ajouter au moins un article au devis',
        variant: 'destructive',
      })
      return
    }

    if (!clientInfo.name || !clientInfo.email) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir les informations client (nom et email)',
        variant: 'destructive',
      })
      return
    }

    // Vérifier l'adresse seulement si livraison et qu'elle n'est pas complète
    if (delivery.type === 'livraison') {
      if (!delivery.address?.street || !delivery.address?.city || !delivery.address?.postalCode) {
        toast({
          title: 'Erreur',
          description: 'Veuillez compléter l\'adresse de livraison',
          variant: 'destructive',
        })
        return
      }
    }

    // Vérifier l'adresse de facturation si elle est différente
    if (delivery.billingAddressDifferent) {
      if (!delivery.billingAddress?.street || !delivery.billingAddress?.city || !delivery.billingAddress?.postalCode) {
        toast({
          title: 'Erreur',
          description: 'Veuillez compléter l\'adresse de facturation',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSubmitting(true)

    try {
      const quote: Quote = {
        items: quoteItems,
        delivery,
        delay,
        clientInfo,
        createdAt: new Date(),
        status: 'draft',
      }

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quote),
      })

      const data = await response.json()

      if (data.success) {
        setIsSubmitted(true)
        // Nettoyer localStorage après soumission réussie
        clearSavedData()
        toast({
          title: 'Succès',
          description: 'Votre devis a été envoyé avec succès dans Odoo',
        })
      } else {
        toast({
          title: 'Erreur',
          description: data.error || 'Erreur lors de l\'envoi du devis',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'envoi du devis',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    }
  }

  if (isSubmitted) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Devis envoyé avec succès !</CardTitle>
            <CardDescription>
              Votre devis a été transmis à notre équipe et sera traité dans les plus brefs délais.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => {
              setIsSubmitted(false)
              setSelectedProducts([])
              setCurrentMarkings([])
              setQuoteItems([])
              setCurrentStep('products')
              setClientInfo({ name: '', email: '', company: '', phone: '' })
              setDelivery({ type: 'livraison' })
              setDelay(delayOptions[0])
              // Nettoyer localStorage pour un nouveau devis
              clearSavedData()
            }}>
              Créer un nouveau devis
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      {/* En-tête avec informations client */}
      {client && (
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span className="text-sm text-gray-600">
                Connecté en tant que <strong>{client.name}</strong>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/orders')}
            >
              <Package className="h-4 w-4 mr-2" />
              Mes commandes
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      )}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold mb-2">INKOO PRO</h1>
            <p className="text-muted-foreground">Créez votre devis personnalisé</p>
          </div>
          <div className="flex-1 flex justify-end">
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/admin/login'}
              className="text-sm"
            >
              Admin
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 'products' && (
            <ProductSelector
              selectedProducts={selectedProducts}
              onProductsChange={setSelectedProducts}
              onContinue={handleProductsContinue}
            />
          )}

          {currentStep === 'customization' && (
            <div className="space-y-6">
              <CustomizationManager
                selectedProducts={selectedProducts}
                onComplete={handleCustomizationComplete}
                onMarkingsChange={setCurrentMarkings}
              />
              <div className="flex justify-start">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('products')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="flex justify-start">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('customization')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>6. Informations client</CardTitle>
                  <CardDescription>Remplissez vos informations pour finaliser le devis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input
                      value={clientInfo.name}
                      onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                      placeholder="Votre nom"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={clientInfo.email}
                      onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Entreprise</Label>
                    <Input
                      value={clientInfo.company}
                      onChange={(e) => setClientInfo({ ...clientInfo, company: e.target.value })}
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input
                      type="tel"
                      value={clientInfo.phone}
                      onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </CardContent>
              </Card>

              <DeliverySelector
                delivery={delivery}
                onDeliveryChange={setDelivery}
                delay={delay}
                onDelayChange={setDelay}
              />
            </div>
          )}

          {currentStep !== 'products' && currentStep !== 'customization' && currentStep !== 'review' && (
            <Card>
              <CardHeader>
                <CardTitle>Erreur</CardTitle>
                <CardDescription>État invalide détecté. Réinitialisation...</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCurrentStep('products')}>
                  Retour à la sélection des produits
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          {currentStep === 'customization' ? (
            <OrderSummary 
              selectedProducts={selectedProducts} 
              markings={currentMarkings}
              delay={delay}
            />
          ) : currentStep === 'review' ? (
            <OrderSummary 
              selectedProducts={selectedProducts} 
              markings={currentMarkings}
              delay={delay}
              showValidationButton={true}
              onValidate={handleSubmit}
              isSubmitting={isSubmitting}
              canValidate={canValidateOrder()}
            />
          ) : (
            <OrderSummary 
              selectedProducts={selectedProducts} 
              markings={[]}
              delay={delay}
            />
          )}
        </div>
      </div>
    </div>
  )
}
