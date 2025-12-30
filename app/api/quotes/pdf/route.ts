import { NextRequest, NextResponse } from 'next/server'
import { Quote } from '@/types'
import { jsPDF } from 'jspdf'
import { calculateQuoteTotal } from '@/lib/quote-pricing'
import { positionLabels } from '@/lib/data'
import { loadServicePricing } from '@/lib/service-pricing-db'
import { getIndicationDate, getDeliveryDate, formatDate } from '@/lib/delivery-dates'

/**
 * POST - Générer un PDF du devis
 */
export async function POST(request: NextRequest) {
  try {
    const quote: Quote = await request.json()

    // Calculer les totaux
    const quoteTotal = await calculateQuoteTotal(quote.items, quote.delivery, quote.delay)

    // Charger les prix des services pour obtenir les noms des options
    const servicePricing = await loadServicePricing()

    // Créer un nouveau document PDF
    const doc = new jsPDF()
    let yPosition = 20

    // Fonction helper pour ajouter une ligne avec gestion de la pagination
    const addLine = (text: string, fontSize: number = 10, isBold: boolean = false, x: number = 20) => {
      if (yPosition > 280) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', isBold ? 'bold' : 'normal')
      doc.text(text, x, yPosition)
      yPosition += fontSize + 5
    }

    // En-tête
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('INKOO PRO', 20, yPosition)
    yPosition += 10

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('DEVIS', 20, yPosition)
    yPosition += 10

    // Titre du devis
    if (quote.title) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`Titre: ${quote.title}`, 20, yPosition)
      yPosition += 10
    }

    // Date
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const date = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')
    doc.text(`Date: ${date}`, 20, yPosition)
    yPosition += 15

    // Informations client
    if (quote.clientInfo) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Informations client', 20, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      if (quote.clientInfo.name) {
        doc.text(`Nom: ${quote.clientInfo.name}`, 20, yPosition)
        yPosition += 7
      }
      if (quote.clientInfo.company) {
        doc.text(`Entreprise: ${quote.clientInfo.company}`, 20, yPosition)
        yPosition += 7
      }
      if (quote.clientInfo.email) {
        doc.text(`Email: ${quote.clientInfo.email}`, 20, yPosition)
        yPosition += 7
      }
      if (quote.clientInfo.phone) {
        doc.text(`Téléphone: ${quote.clientInfo.phone}`, 20, yPosition)
        yPosition += 7
      }
      yPosition += 5
    }

    // Adresse de livraison
    if (quote.delivery) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      const deliveryTypeLabels: Record<string, string> = {
        pickup: 'Livraison: Pick-UP (Retrait sur place)',
        dpd: 'Livraison: DPD',
        client_carrier: 'Livraison: Transporteur du client',
        courier: 'Livraison: Coursier en direct',
      }
      doc.text(deliveryTypeLabels[quote.delivery.type] || 'Livraison', 20, yPosition)
      yPosition += 8

      if ((quote.delivery.type === 'dpd' || quote.delivery.type === 'courier') && quote.delivery.address) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      if (quote.delivery.address.street) {
        doc.text(quote.delivery.address.street, 20, yPosition)
        yPosition += 7
      }
      const addressLine = [
        quote.delivery.address.postalCode,
        quote.delivery.address.city,
        quote.delivery.address.country,
      ].filter(Boolean).join(' ')
      if (addressLine) {
        doc.text(addressLine, 20, yPosition)
        yPosition += 7
        }
      }

      // Options de livraison
      if (quote.delivery.individualPackaging || quote.delivery.newCarton) {
        yPosition += 3
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        if (quote.delivery.individualPackaging) {
          doc.text('• Emballage individuel', 20, yPosition)
          yPosition += 6
        }
        if (quote.delivery.newCarton) {
          doc.text('• Carton neuf', 20, yPosition)
          yPosition += 6
        }
      }
      yPosition += 5
    }

    // Adresse de facturation si différente
    if (quote.delivery?.billingAddress) {
      const hasBillingAddress = quote.delivery.billingAddress.street || quote.delivery.billingAddress.city
      const hasDeliveryAddress = quote.delivery.address?.street || quote.delivery.address?.city
      const isDifferent = hasBillingAddress && hasDeliveryAddress && (
        quote.delivery.billingAddress.street !== quote.delivery.address?.street ||
        quote.delivery.billingAddress.city !== quote.delivery.address?.city
      )
      if (isDifferent || (hasBillingAddress && !hasDeliveryAddress)) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Adresse de facturation', 20, yPosition)
        yPosition += 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
        if (quote.delivery.billingAddress.street) {
          doc.text(quote.delivery.billingAddress.street, 20, yPosition)
          yPosition += 7
        }
        const billingAddressLine = [
          quote.delivery.billingAddress.postalCode,
          quote.delivery.billingAddress.city,
          quote.delivery.billingAddress.country,
        ].filter(Boolean).join(' ')
        if (billingAddressLine) {
          doc.text(billingAddressLine, 20, yPosition)
          yPosition += 7
        }
        yPosition += 5
      }
    }

    // Délai
    if (quote.delay) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      let delayText = ''
      if (quote.delay.isExpress && quote.delay.expressDays) {
        delayText = `Délai express: ${quote.delay.expressDays} jour(s) ouvrable(s)`
      } else {
        delayText = `Délai: ${quote.delay.workingDays} jour(s) ouvrable(s)`
      }
      doc.text(delayText, 20, yPosition)
      yPosition += 7

      // Dates
      try {
        const indicationDate = getIndicationDate()
        const deliveryDate = getDeliveryDate(quote.delay)
        doc.text(`Date d'indication: ${formatDate(indicationDate)}`, 20, yPosition)
        yPosition += 7
        doc.text(`Date de livraison estimée: ${formatDate(deliveryDate)}`, 20, yPosition)
      } catch (error) {
        // Ignorer les erreurs de calcul de date
      }
      yPosition += 10
    }

    // Ligne de séparation
    doc.setLineWidth(0.5)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 10

    // Articles du devis avec prix
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Détail des articles et services', 20, yPosition)
    yPosition += 10

    // Parcourir les articles
    quote.items?.forEach((item, index) => {
      if (yPosition > 280) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      
      // Nom du produit
      const productName = item.product.name || 'Produit'
      doc.text(`${index + 1}. ${productName}`, 20, yPosition)
      yPosition += 7

      doc.setFont('helvetica', 'normal')
      
      // Détails du produit
      if (item.clientProvided) {
        doc.text('  (Produit fourni par le client)', 25, yPosition)
        yPosition += 6
      }

      // Quantités par couleur et taille
      if (item.colorQuantities && item.colorQuantities.length > 0) {
        item.colorQuantities.forEach(cq => {
          const quantities = cq.quantities.filter(q => q.quantity > 0)
          if (quantities.length > 0) {
            const qtyText = quantities.map(q => `${q.quantity}x ${q.size}`).join(', ')
            doc.text(`  ${cq.color}: ${qtyText}`, 25, yPosition)
            yPosition += 6
          }
        })
      }

      // Technique et options détaillées
      if (item.technique) {
        const techniqueNames: Record<string, string> = {
          serigraphie: 'Sérigraphie',
          broderie: 'Broderie',
          dtf: 'DTF',
        }
        const techniqueName = techniqueNames[item.technique] || item.technique
        doc.setFont('helvetica', 'bold')
        doc.text(`  Technique: ${techniqueName}`, 25, yPosition)
        yPosition += 6
        doc.setFont('helvetica', 'normal')

        if (item.techniqueOptions) {
          const opts = item.techniqueOptions as any
          if (item.technique === 'serigraphie') {
            const textileLabel = opts.textileType === 'fonce' ? 'Textile foncé' : 'Textile clair'
            doc.text(`    Type: ${textileLabel}`, 25, yPosition)
            yPosition += 6
            doc.text(`    Couleurs: ${opts.nombreCouleurs || 1}`, 25, yPosition)
            yPosition += 6
            if (opts.dimension) {
              doc.text(`    Dimension: ${opts.dimension}`, 25, yPosition)
              yPosition += 6
            }
            // Options supplémentaires
            if (opts.selectedOptions && opts.selectedOptions.length > 0) {
              const serigraphiePricing = servicePricing.find((p: any) => p.technique === 'serigraphie') as any
              const optionsLabels = opts.selectedOptions.map((optId: string) => {
                const option = serigraphiePricing?.options?.find((opt: any) => opt.id === optId)
                return option ? option.name : optId
              })
              doc.text(`    Options: ${optionsLabels.join(', ')}`, 25, yPosition)
              yPosition += 6
            }
          } else if (item.technique === 'broderie') {
            const sizeLabel = opts.embroiderySize === 'grande' ? 'Grande (max 20x25cm)' : 'Petite (max 10x10cm)'
            doc.text(`    Taille: ${sizeLabel}`, 25, yPosition)
            yPosition += 6
            doc.text(`    Points: ${(opts.nombrePoints || 0).toLocaleString()}`, 25, yPosition)
            yPosition += 6
          } else if (item.technique === 'dtf') {
            doc.text(`    Dimension: ${opts.dimension || 'N/A'}`, 25, yPosition)
            yPosition += 6
          }
        }
      }

      // Position
      if (item.position) {
        const positionText = item.position.type === 'custom' 
          ? `Position: ${item.position.customDescription || 'Personnalisée'}`
          : `Position: ${positionLabels[item.position.type as keyof typeof positionLabels] || item.position.type}`
        doc.text(`  ${positionText}`, 25, yPosition)
        yPosition += 6
      }

      // Vectorisation
      if (item.files && item.files.length > 0) {
        doc.text(`  Vectorisation du logo: Oui`, 25, yPosition)
        yPosition += 6
        doc.text(`  Fichiers: ${item.files.map(f => f.name).join(', ')}`, 25, yPosition)
        yPosition += 6
      }

      // Notes
      if (item.notes) {
        doc.text(`  Notes: ${item.notes}`, 25, yPosition)
        yPosition += 6
      }

      // Quantité totale
      if (item.totalQuantity) {
        doc.text(`  Quantité totale: ${item.totalQuantity} pièce(s)`, 25, yPosition)
        yPosition += 6
      }

      // Prix détaillés du service
      const priceDetails = quoteTotal.itemDetails.find(d => d.item.id === item.id)?.priceDetails
      if (priceDetails) {
        yPosition += 3
        doc.setFont('helvetica', 'bold')
        doc.text(`  Prix du service:`, 25, yPosition)
        yPosition += 6
        doc.setFont('helvetica', 'normal')
        doc.text(`    Prix unitaire: ${priceDetails.unitPrice.toFixed(2)} € HT`, 25, yPosition)
        yPosition += 6
        doc.text(`    Quantité: ${priceDetails.quantity}`, 25, yPosition)
        yPosition += 6
        if (priceDetails.fixedFees > 0) {
          doc.text(`    Frais fixes: ${priceDetails.fixedFees.toFixed(2)} € HT`, 25, yPosition)
          yPosition += 6
        }
        if (priceDetails.optionsSurcharge > 0) {
          doc.text(`    Surcoût options: ${priceDetails.optionsSurcharge.toFixed(2)} € HT`, 25, yPosition)
          yPosition += 6
        }
        if (priceDetails.expressSurcharge > 0) {
          doc.setFont('helvetica', 'bold')
          doc.text(`    Supplément express: ${priceDetails.expressSurcharge.toFixed(2)} € HT`, 25, yPosition)
          yPosition += 6
          doc.setFont('helvetica', 'normal')
        }
        doc.setFont('helvetica', 'bold')
        doc.text(`    Sous-total: ${priceDetails.total.toFixed(2)} € HT`, 25, yPosition)
        yPosition += 6
        doc.setFont('helvetica', 'normal')
      }

      yPosition += 5
    })

    // Ligne de séparation avant les totaux
    if (yPosition > 280) {
      doc.addPage()
      yPosition = 20
    } else {
      yPosition += 5
    }

    doc.setLineWidth(0.5)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 10

    // Récapitulatif des frais
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Récapitulatif', 20, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Total des services
    doc.text('Total des services:', 20, yPosition)
    doc.text(`${quoteTotal.servicesTotal.toFixed(2)} € HT`, 170, yPosition)
    yPosition += 7

    // Frais de port
    if (quoteTotal.shippingCost > 0) {
      const deliveryTypeLabels: Record<string, string> = {
        dpd: 'Frais de port (DPD)',
        courier: 'Frais de port (Coursier)',
      }
      doc.text(deliveryTypeLabels[quote.delivery.type] || 'Frais de port:', 20, yPosition)
      doc.text(`${quoteTotal.shippingCost.toFixed(2)} € HT`, 170, yPosition)
      yPosition += 7
    }

    // Emballage individuel
    if (quoteTotal.packagingCost > 0) {
      doc.text('Emballage individuel:', 20, yPosition)
      doc.text(`${quoteTotal.packagingCost.toFixed(2)} € HT`, 170, yPosition)
      yPosition += 7
    }

    // Cartons neufs
    if (quoteTotal.cartonCost > 0) {
      doc.text('Cartons neufs:', 20, yPosition)
      doc.text(`${quoteTotal.cartonCost.toFixed(2)} € HT`, 170, yPosition)
      yPosition += 7
    }

    // Vectorisation
    if (quoteTotal.vectorizationCost > 0) {
      doc.text('Vectorisation des logos:', 20, yPosition)
      doc.text(`${quoteTotal.vectorizationCost.toFixed(2)} € HT`, 170, yPosition)
      yPosition += 7
    }

    // Supplément express total
    if (quoteTotal.expressSurchargeTotal > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('Supplément express:', 20, yPosition)
      doc.text(`+${quoteTotal.expressSurchargeTotal.toFixed(2)} € HT`, 170, yPosition)
      yPosition += 7
      doc.setFont('helvetica', 'normal')
    }

    // Ligne de séparation avant le total
    yPosition += 3
    doc.setLineWidth(0.5)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 10

    // Total HT
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL HT', 20, yPosition)
    doc.text(`${quoteTotal.grandTotal.toFixed(2)} € HT`, 170, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Tous les prix sont hors taxes', 20, yPosition)
    yPosition += 7

    // Générer le PDF côté serveur (utiliser un Buffer Node)
    const pdfArrayBuffer = doc.output('arraybuffer')
    const pdfBuffer = Buffer.from(pdfArrayBuffer)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="devis_${quote.title?.replace(/[^a-z0-9]/gi, '_') || 'sans_titre'}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
