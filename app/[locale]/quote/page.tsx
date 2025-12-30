'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { LanguageSelector } from '@/components/LanguageSelector'
import { Quote, QuoteItem, SelectedProduct, TechniqueType, TechniqueOptions, Position, Delivery, Delay } from '@/types'
import { ProductSelector } from '@/components/quote/ProductSelector'
import { CustomizationManager } from '@/components/quote/CustomizationManager'
import { OrderSummary } from '@/components/quote/OrderSummary'
import { DeliverySelector } from '@/components/quote/DeliverySelector'
import { OptionsSelector } from '@/components/quote/OptionsSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { delayOptions } from '@/lib/data'
import { Loader2, CheckCircle2, ArrowLeft, LogOut, User, Package, Save, Download, Check, Settings } from 'lucide-react'

type CurrentStep = 'title' | 'products' | 'customization' | 'delivery' | 'options' | 'review'

interface ProductCustomization {
  selectedProductIds: string[] // Produits concernés par cette personnalisation
  technique: TechniqueType | null
  techniqueOptions: TechniqueOptions | null
  position: Position | null
  files?: Array<{ id: string; name: string; url: string; size: number; type: string }>
  notes?: string
}

export default function QuotePage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('quote')
  const commonT = useTranslations('common')
  const authT = useTranslations('auth')
  const ordersT = useTranslations('orders')
  const settingsT = useTranslations('settings')
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
    vectorization?: boolean
  }>>([])
  const [currentStep, setCurrentStep] = useState<CurrentStep>('title')
  const [quoteTitle, setQuoteTitle] = useState<string>('')
  const [delivery, setDelivery] = useState<Delivery>({ type: 'pickup' })
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
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null)

  // Sauvegarder l'état dans la base de données
  const saveToDatabase = useCallback(async () => {
    try {
      console.log('📤 Envoi de la sauvegarde du devis:', {
        quoteId: currentQuoteId,
        title: quoteTitle,
        productsCount: selectedProducts.length,
        markingsCount: currentMarkings.length,
        step: currentStep
      })
      
      const response = await fetch('/api/quotes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: currentQuoteId, // Envoyer l'ID si on en a un
          title: quoteTitle,
          selectedProducts,
          quoteItems,
          currentMarkings,
          currentStep,
          delivery,
          delay,
          clientInfo,
        }),
      })
      
      // Mettre à jour l'ID du devis si on reçoit une réponse avec un ID
      const data = await response.json()
      if (data.success) {
        if (data.quote && data.quote.id) {
          console.log('✅ Devis sauvegardé avec succès:', data.quote.id, '- Titre:', data.quote.title)
          setCurrentQuoteId(data.quote.id)
        } else {
          console.warn('⚠️ Sauvegarde réussie mais pas d\'ID retourné:', data)
        }
      } else {
        console.error('❌ Erreur lors de la sauvegarde:', data.error)
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde base de données:', error)
      // Fallback vers localStorage en cas d'erreur
      try {
        const data = {
          title: quoteTitle,
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
  }, [currentQuoteId, quoteTitle, selectedProducts, quoteItems, currentMarkings, currentStep, delivery, delay, clientInfo])

  // Charger l'état depuis la base de données
  useEffect(() => {
    const loadFromDatabase = async () => {
      try {
        // Vérifier d'abord si on doit charger un devis spécifique depuis localStorage (venant de la page des commandes)
        const quoteToLoad = localStorage.getItem('inkoo_pro_quote_to_load')
        if (quoteToLoad) {
          try {
            const loadData = JSON.parse(quoteToLoad)
            if (loadData.quote) {
              const quote = loadData.quote
              console.log('📋 Chargement du devis depuis localStorage (quote_to_load):', loadData.quoteId)
              setQuoteTitle(quote.title || '')
              setSelectedProducts(quote.selectedProducts || [])
              setQuoteItems(quote.quoteItems || [])
              // L'API retourne currentMarkings au lieu de markings
              setCurrentMarkings(quote.currentMarkings || quote.markings || [])
              setCurrentStep(quote.step || 'title')
              
              // Mapper la structure delivery correctement
              const deliveryData = quote.delivery || {}
              setDelivery({
                type: deliveryData.type || 'pickup',
                address: deliveryData.address || undefined,
                billingAddress: deliveryData.billingAddress || undefined,
                individualPackaging: deliveryData.individualPackaging || false,
                newCarton: deliveryData.newCarton || false,
              })
              
              // Mapper la structure delay correctement
              const delayData = quote.delay || {}
              if (delayData.isExpress && delayData.expressDays) {
                const expressDelay = delayOptions.find(d => d.isExpress && d.expressDays === delayData.expressDays)
                setDelay(expressDelay || delayOptions[0])
              } else if (delayData.workingDays) {
                const standardDelay = delayOptions.find(d => !d.isExpress && d.workingDays === delayData.workingDays)
                setDelay(standardDelay || delayOptions[0])
              } else {
                setDelay(delayOptions[0])
              }
              
              // Mapper clientInfo
              const clientInfoData = quote.clientInfo || {}
              setClientInfo({
                name: clientInfoData.name || quote.clientName || '',
                email: clientInfoData.email || quote.clientEmail || '',
                company: clientInfoData.company || quote.clientCompany || '',
                phone: clientInfoData.phone || quote.clientPhone || '',
              })
              // Stocker l'ID du devis pour les futures sauvegardes
              setCurrentQuoteId(loadData.quoteId || quote.id || null)
              // Nettoyer localStorage après chargement
              localStorage.removeItem('inkoo_pro_quote_to_load')
              return
            }
          } catch (loadError) {
            console.error('Erreur chargement devis depuis localStorage (quote_to_load):', loadError)
            localStorage.removeItem('inkoo_pro_quote_to_load')
          }
        }

        // Sinon, charger depuis l'API current
        const response = await fetch('/api/quotes/current')
        const data = await response.json()
        
        if (data.success && data.quote) {
          const quote = data.quote
          setCurrentQuoteId(quote.id || null)
          setQuoteTitle(quote.title || '')
          setSelectedProducts(quote.selectedProducts || [])
          setQuoteItems(quote.quoteItems || [])
          setCurrentMarkings(quote.currentMarkings || quote.markings || [])
          setCurrentStep(quote.step || 'title')
          
          // Mapper la structure delivery correctement
          const deliveryData = quote.delivery || {}
          setDelivery({
            type: deliveryData.type || 'pickup',
            address: deliveryData.address || undefined,
            billingAddress: deliveryData.billingAddress || undefined,
            individualPackaging: deliveryData.individualPackaging || false,
            newCarton: deliveryData.newCarton || false,
          })
          
          // Mapper la structure delay correctement
          const delayData = quote.delay || {}
          if (delayData.isExpress && delayData.expressDays) {
            const expressDelay = delayOptions.find(d => d.isExpress && d.expressDays === delayData.expressDays)
            setDelay(expressDelay || delayOptions[0])
          } else if (delayData.workingDays) {
            const standardDelay = delayOptions.find(d => !d.isExpress && d.workingDays === delayData.workingDays)
            setDelay(standardDelay || delayOptions[0])
          } else {
            setDelay(delayOptions[0])
          }
          
          // Mapper clientInfo
          const clientInfoData = quote.clientInfo || {}
          setClientInfo({
            name: clientInfoData.name || quote.clientName || '',
            email: clientInfoData.email || quote.clientEmail || '',
            company: clientInfoData.company || quote.clientCompany || '',
            phone: clientInfoData.phone || quote.clientPhone || '',
          })
        }
      } catch (error) {
        console.error('Erreur chargement depuis base de données:', error)
        // Fallback vers localStorage draft
        try {
          const stored = localStorage.getItem('inkoo_pro_quote_draft')
          if (stored) {
            const data = JSON.parse(stored)
            setQuoteTitle(data.title || '')
            setSelectedProducts(data.selectedProducts || [])
            setQuoteItems(data.quoteItems || [])
            setCurrentMarkings(data.currentMarkings || [])
            setCurrentStep(data.currentStep || 'title')
            setDelivery(data.delivery || { type: 'pickup' })
            setDelay(data.delay || delayOptions[0])
            setClientInfo(data.clientInfo || { name: '', email: '', company: '', phone: '' })
          }
        } catch (localError) {
          console.error('Erreur chargement localStorage fallback:', localError)
        }
      }
    }

    loadFromDatabase()
  }, [])

  // Charger les informations du client
  useEffect(() => {
    const loadClient = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (data.success && data.client) {
          setClient(data.client)
          setClientInfo({
            name: data.client.name || '',
            email: data.client.email || '',
            company: data.client.company || '',
            phone: data.client.phone || '',
          })
          
          // Charger la méthode de livraison par défaut du client
          if (data.client.defaultDeliveryMethod) {
            // Mapper l'ancienne méthode vers le nouveau type si nécessaire
            const deliveryType = data.client.defaultDeliveryMethod === 'pickup' 
              ? 'pickup' 
              : data.client.defaultDeliveryMethod === 'client_carrier'
              ? 'client_carrier'
              : 'pickup' // Par défaut
            setDelivery({
              type: deliveryType as Delivery['type'],
            })
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

  // Sauvegarder automatiquement à chaque changement
  useEffect(() => {
    // Sauvegarder seulement si on a au moins un titre (les produits peuvent être ajoutés plus tard)
    if (quoteTitle) {
      console.log('💾 Sauvegarde automatique déclenchée:', { 
        quoteId: currentQuoteId, 
        title: quoteTitle, 
        productsCount: selectedProducts.length,
        step: currentStep 
      })
      saveToDatabase()
    } else {
      console.log('⏸️  Sauvegarde automatique ignorée (pas de titre):', { 
        quoteTitle, 
        productsCount: selectedProducts.length 
      })
    }
  }, [quoteTitle, selectedProducts, quoteItems, currentMarkings, currentStep, delivery, delay, clientInfo, saveToDatabase, currentQuoteId])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push(`/${locale}`)
      router.refresh()
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    }
  }

  const handleSaveDraft = async () => {
    try {
      // Sauvegarder en forçant la création d'un nouveau devis (en passant null comme quoteId)
      console.log('💾 Sauvegarde explicite du devis:', {
        quoteId: null,
        title: quoteTitle,
        productsCount: selectedProducts.length,
        markingsCount: currentMarkings.length,
        step: currentStep
      })
      
      const response = await fetch('/api/quotes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: null, // Forcer la création d'un nouveau devis
          title: quoteTitle,
          selectedProducts,
          quoteItems,
          currentMarkings,
          currentStep,
          delivery,
          delay,
          clientInfo,
        }),
      })
      
      // Vérifier le statut HTTP avant de parser le JSON
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `Erreur HTTP ${response.status}` }
        }
        console.error('❌ Erreur HTTP lors de la sauvegarde:', response.status, errorData)
        throw new Error(errorData.error || errorData.details || `Erreur HTTP ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        console.log('✅ Devis sauvegardé avec succès:', data.quote?.id)
      toast({
        title: t('draftSaved'),
        description: t('draftSavedDescription'),
      })
        // Réinitialiser l'état local pour permettre la création d'un nouveau devis
        setCurrentQuoteId(null)
        // Rediriger vers la page des devis sauvegardés et forcer le rafraîchissement
        router.push(`/${locale}/orders`)
        router.refresh()
      } else {
        console.error('❌ Erreur dans la réponse:', data.error)
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde devis:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      toast({
        title: commonT('error'),
        description: errorMessage || t('draftSaveError'),
        variant: 'destructive',
      })
    }
  }

  const handleDownloadPDF = async () => {
    try {
      // Construire les items du devis dans le bon format
      const items = buildQuoteItems()
      
      if (items.length === 0) {
        toast({
          title: commonT('error'),
          description: 'Aucun article dans le devis. Veuillez ajouter des produits et des marquages.',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/quotes/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quoteTitle,
          items, // Utiliser les items construits
          delivery,
          delay,
          clientInfo,
          createdAt: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `devis-${quoteTitle || 'sans-titre'}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: t('pdfDownloaded'),
          description: t('pdfDownloadedDescription'),
        })
      } else {
        throw new Error('Erreur génération PDF')
      }
    } catch (error) {
      toast({
        title: commonT('error'),
        description: t('pdfError'),
        variant: 'destructive',
      })
    }
  }

  // Construire les items du devis à partir des produits sélectionnés et des marquages
  const buildQuoteItems = (): QuoteItem[] => {
    const items: QuoteItem[] = []
    
    // Pour chaque marquage, créer un item pour chaque produit associé
    currentMarkings.forEach((marking) => {
      marking.selectedProductIds.forEach((productId) => {
        const selectedProduct = selectedProducts.find(p => p.id === productId)
        if (!selectedProduct || !marking.technique || !marking.techniqueOptions) {
          return
        }
        
        // Calculer la quantité totale pour ce produit
        const totalQuantity = selectedProduct.colorQuantities.reduce((sum, cq) => {
          return sum + cq.quantities.reduce((qSum, sq) => qSum + sq.quantity, 0)
        }, 0)
        
        items.push({
          id: `${marking.id || Date.now()}-${productId}-${items.length}`,
          product: selectedProduct.product,
          clientProvided: selectedProduct.clientProvided,
          colorQuantities: selectedProduct.colorQuantities,
          technique: marking.technique,
          techniqueOptions: marking.techniqueOptions,
          position: marking.position,
          files: marking.files,
          notes: marking.notes,
          totalQuantity,
        })
      })
    })
    
    return items
  }

  const handleValidate = async () => {
    if (!quoteTitle) {
      toast({
        title: commonT('error'),
        description: t('titleRequired'),
        variant: 'destructive',
      })
      return
    }

    if (selectedProducts.length === 0) {
      toast({
        title: commonT('error'),
        description: t('selectAtLeastOneProduct'),
        variant: 'destructive',
      })
      return
    }

    if (currentMarkings.length === 0) {
      toast({
        title: commonT('error'),
        description: t('addAtLeastOneMarking'),
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Construire les items du devis
      const items = buildQuoteItems()
      
      if (items.length === 0) {
        toast({
          title: commonT('error'),
          description: 'Aucun article valide dans le devis',
          variant: 'destructive',
        })
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quoteTitle,
          items, // Utiliser les items construits
          delivery,
          delay,
          clientInfo,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsSubmitted(true)
        toast({
          title: t('quoteSubmitted'),
          description: t('quoteSubmittedDescription'),
        })
        
        // Rediriger vers les commandes après 2 secondes
        setTimeout(() => {
          router.push(`/${locale}/orders`)
        }, 2000)
      } else {
        toast({
          title: commonT('error'),
          description: data.error || t('quoteError'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erreur soumission devis:', error)
      toast({
        title: commonT('error'),
        description: t('quoteError'),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { id: 'title', label: '1', title: t('stepTitle') },
    { id: 'products', label: '2', title: t('stepProducts') },
    { id: 'customization', label: '3', title: t('stepCustomization') },
    { id: 'delivery', label: '4', title: 'Livraison' },
    { id: 'options', label: '5', title: 'Options' },
    { id: 'review', label: '6', title: t('stepReview') },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  if (isLoadingClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-bold">{t('quoteSubmitted')}</h2>
              <p className="text-muted-foreground">{t('quoteSubmittedDescription')}</p>
              <Button onClick={() => router.push(`/${locale}/orders`)}>
                {ordersT('viewOrders')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">INKOO PRO</h1>
            <LanguageSelector />
          </div>
          <div className="flex items-center gap-2">
            {client && (
              <>
                <Button variant="ghost" onClick={() => router.push(`/${locale}/orders`)}>
                  <Package className="h-4 w-4 mr-2" />
                  {ordersT('myOrders')}
                </Button>
                <Button variant="ghost" onClick={() => router.push(`/${locale}/settings`)}>
                  <Settings className="h-4 w-4 mr-2" />
                  {settingsT('title')}
                </Button>
                <Button variant="ghost" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {authT('logout')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      index <= currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </div>
                  <span className="mt-2 text-sm text-center">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {currentStep === 'title' && (
              <Card>
                <CardHeader>
                  <CardTitle>1. {t('stepTitle')}</CardTitle>
                  <CardDescription>{t('stepTitleDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('quoteTitle')}</Label>
                    <Input
                      id="title"
                      value={quoteTitle}
                      onChange={(e) => setQuoteTitle(e.target.value)}
                      placeholder={t('quoteTitlePlaceholder')}
                    />
                  </div>
                  <Button onClick={() => setCurrentStep('products')} className="w-full">
                    {t('continue')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {currentStep === 'products' && (
              <Card>
                <CardHeader>
                  <CardTitle>2. {t('stepProducts')}</CardTitle>
                  <CardDescription>{t('stepProductsDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductSelector
                    selectedProducts={selectedProducts}
                    onProductsChange={setSelectedProducts}
                  />
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setCurrentStep('title')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('back')}
                    </Button>
                    <Button
                      onClick={() => setCurrentStep('customization')}
                      disabled={selectedProducts.length === 0}
                      className="flex-1"
                    >
                      {t('continue')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'customization' && (
              <Card>
                <CardHeader>
                  <CardTitle>3. {t('stepCustomization')}</CardTitle>
                  <CardDescription>{t('stepCustomizationDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomizationManager
                    key={`customization-${currentStep}`}
                    selectedProducts={selectedProducts}
                    initialMarkings={currentMarkings}
                    onComplete={(markings) => {
                      setCurrentMarkings(markings)
                      setCurrentStep('delivery')
                    }}
                    onMarkingsChange={setCurrentMarkings}
                  />
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setCurrentStep('products')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('back')}
                    </Button>
                    <Button 
                      onClick={() => {
                        if (currentMarkings.length > 0) {
                          setCurrentStep('delivery')
                        }
                      }}
                      disabled={currentMarkings.length === 0}
                      className="flex-1"
                    >
                      {t('continue')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'delivery' && (
              <Card>
                <CardHeader>
                  <CardTitle>4. Livraison</CardTitle>
                  <CardDescription>Configurez la méthode de livraison</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <DeliverySelector
                    delivery={delivery}
                    onDeliveryChange={setDelivery}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentStep('customization')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('back')}
                    </Button>
                    <Button onClick={() => setCurrentStep('options')} className="flex-1">
                      {t('continue')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'options' && (
              <Card>
                <CardHeader>
                  <CardTitle>5. Options</CardTitle>
                  <CardDescription>Configurez les options de délai et d'emballage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <OptionsSelector
                    delivery={delivery}
                    onDeliveryChange={setDelivery}
                    delay={delay}
                    onDelayChange={setDelay}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentStep('delivery')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('back')}
                    </Button>
                    <Button onClick={() => setCurrentStep('review')} className="flex-1">
                      {t('continue')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'review' && (
              <Card>
                <CardHeader>
                  <CardTitle>6. {t('stepReview')}</CardTitle>
                  <CardDescription>{t('stepReviewDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentStep('options')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('back')}
                    </Button>
                    <Button onClick={handleSaveDraft} variant="outline" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {t('saveDraft')}
                    </Button>
                    <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      {t('downloadPDF')}
                    </Button>
                    <Button onClick={handleValidate} disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('submitting')}
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {t('validate')}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <OrderSummary
              selectedProducts={selectedProducts}
              markings={currentMarkings}
              delivery={delivery}
              delay={delay}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

