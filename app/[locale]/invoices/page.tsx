'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Download, FileText, Calendar, Euro, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { LanguageSelector } from '@/components/LanguageSelector'
import { OdooInvoice, translatePaymentState, translateInvoiceState, getPaymentStateColor, isInvoiceOverdue } from '@/lib/odoo-invoices'

export default function InvoicesPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<OdooInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      // Vérifier l'authentification
      const clientResponse = await fetch('/api/auth/me')
      const clientData = await clientResponse.json()
      
      if (!clientData.success || !clientData.client) {
        router.push(`/${locale}/login`)
        return
      }

      // Charger les factures
      const invoicesResponse = await fetch('/api/invoices')
      const invoicesData = await invoicesResponse.json()

      if (invoicesData.success) {
        setInvoices(invoicesData.invoices || [])
      } else {
        toast({
          title: t('common.error'),
          description: invoicesData.error || 'Erreur lors du chargement des factures',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erreur chargement factures:', error)
      toast({
        title: t('common.error'),
        description: 'Erreur lors du chargement des factures',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast, t, locale])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const handleDownloadInvoice = async (invoiceId: number) => {
    try {
      setDownloadingInvoiceId(invoiceId)
      
      // Télécharger le PDF depuis notre API
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors du téléchargement')
      }

      // Récupérer le PDF en tant que blob
      const blob = await response.blob()
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Récupérer le nom du fichier depuis les headers
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || `facture_${invoiceId}.pdf`
        : `facture_${invoiceId}.pdf`
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Succès',
        description: 'Facture téléchargée avec succès',
      })
    } catch (error) {
      console.error('Erreur téléchargement facture:', error)
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors du téléchargement de la facture',
        variant: 'destructive',
      })
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  // Filtrer les factures par statut
  const paidInvoices = invoices.filter(inv => inv.payment_state === 'paid')
  const unpaidInvoices = invoices.filter(inv => inv.payment_state === 'not_paid')
  const overdueInvoices = invoices.filter(inv => isInvoiceOverdue(inv))
  const partialInvoices = invoices.filter(inv => inv.payment_state === 'partial')

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-semibold text-foreground mb-2">Mes factures</h1>
                <p className="text-muted-foreground">Consultez toutes vos factures et leur statut de paiement</p>
              </div>
              <div className="flex items-center gap-4">
                <LanguageSelector />
                <Button variant="outline" onClick={loadData}>
                  <Loader2 className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
              </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total factures</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{invoices.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Payées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-green-600">{paidInvoices.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-yellow-600">{unpaidInvoices.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Échues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-red-600">{overdueInvoices.length}</div>
                </CardContent>
              </Card>
        </div>

        {/* Invoices List */}
        {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">Aucune facture trouvée</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Vos factures apparaîtront ici une fois créées dans Odoo.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => {
                  const overdue = isInvoiceOverdue(invoice)
                  
                  return (
                    <Card key={invoice.id} className={overdue ? 'border-red-200 bg-red-50/50' : ''}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              {invoice.name}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {invoice.ref && `Réf: ${invoice.ref}`}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getPaymentStateColor(invoice.payment_state)}>
                              {translatePaymentState(invoice.payment_state)}
                            </Badge>
                            {overdue && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Échue
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Date de facturation</p>
                            <p className="font-medium flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(invoice.invoice_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Date d'échéance</p>
                            <p className={`font-medium flex items-center gap-2 ${overdue ? 'text-red-600' : ''}`}>
                              <Calendar className="h-4 w-4" />
                              {formatDate(invoice.invoice_date_due)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Montant HT</p>
                            <p className="font-medium flex items-center gap-2">
                              <Euro className="h-4 w-4" />
                              {formatCurrency(invoice.amount_untaxed)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Montant TTC</p>
                            <p className="font-semibold text-lg flex items-center gap-2">
                              <Euro className="h-4 w-4" />
                              {formatCurrency(invoice.amount_total)}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                          <Button
                            variant="outline"
                            onClick={() => handleDownloadInvoice(invoice.id)}
                            disabled={downloadingInvoiceId === invoice.id}
                          >
                            {downloadingInvoiceId === invoice.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Téléchargement...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Télécharger
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
        )}
      </div>
    </div>
  )
}

