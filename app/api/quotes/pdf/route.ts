import { NextRequest, NextResponse } from 'next/server'
import { Quote } from '@/types'
import { jsPDF } from 'jspdf'

/**
 * POST - Générer un PDF du devis
 */
export async function POST(request: NextRequest) {
  try {
    const quote: Quote = await request.json()

    // Créer un nouveau document PDF
    const doc = new jsPDF()
    let yPosition = 20

    // Fonction helper pour ajouter une ligne avec gestion de la pagination
    const addLine = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      if (yPosition > 280) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', isBold ? 'bold' : 'normal')
      doc.text(text, 20, yPosition)
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
      if (quote.clientInfo.email) {
        doc.text(`Email: ${quote.clientInfo.email}`, 20, yPosition)
        yPosition += 7
      }
      if (quote.clientInfo.company) {
        doc.text(`Entreprise: ${quote.clientInfo.company}`, 20, yPosition)
        yPosition += 7
      }
      if (quote.clientInfo.phone) {
        doc.text(`Téléphone: ${quote.clientInfo.phone}`, 20, yPosition)
        yPosition += 7
      }
      yPosition += 5
    }

    // Adresse de livraison
    if (quote.delivery && quote.delivery.type === 'livraison' && quote.delivery.address) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Adresse de livraison', 20, yPosition)
      yPosition += 8

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
      yPosition += 5
    } else if (quote.delivery && quote.delivery.type === 'retrait') {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Retrait sur place', 20, yPosition)
      yPosition += 10
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
      yPosition += 10
    }

    // Ligne de séparation
    doc.setLineWidth(0.5)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 10

    // Articles du devis
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Articles', 20, yPosition)
    yPosition += 10

    let totalHT = 0

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
        doc.text('(Produit fourni par le client)', 25, yPosition)
        yPosition += 7
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

      // Technique et options
      if (item.technique) {
        const techniqueNames: Record<string, string> = {
          serigraphie: 'Sérigraphie',
          broderie: 'Broderie',
          dtf: 'DTF',
        }
        const techniqueName = techniqueNames[item.technique] || item.technique
        doc.text(`Technique: ${techniqueName}`, 25, yPosition)
        yPosition += 6

        if (item.techniqueOptions) {
          const opts = item.techniqueOptions as any
          if (item.technique === 'serigraphie') {
            doc.text(`  ${opts.nombreCouleurs || 1} couleur(s), ${opts.dimension || 'N/A'}`, 25, yPosition)
            yPosition += 6
          } else if (item.technique === 'broderie') {
            doc.text(`  ${(opts.nombrePoints || 0).toLocaleString()} points`, 25, yPosition)
            yPosition += 6
          } else if (item.technique === 'dtf') {
            doc.text(`  ${opts.dimension || 'N/A'}`, 25, yPosition)
            yPosition += 6
          }
        }
      }

      // Position
      if (item.position) {
        const positionText = item.position.type === 'custom' 
          ? `Position: ${item.position.customDescription || 'Personnalisée'}`
          : `Position: ${item.position.type}`
        doc.text(positionText, 25, yPosition)
        yPosition += 6
      }

      // Notes
      if (item.notes) {
        doc.text(`Notes: ${item.notes}`, 25, yPosition)
        yPosition += 6
      }

      // Quantité totale
      if (item.totalQuantity) {
        doc.text(`Quantité totale: ${item.totalQuantity}`, 25, yPosition)
        yPosition += 6
      }

      yPosition += 5
    })

    // Total
    yPosition += 5
    if (yPosition > 280) {
      doc.addPage()
      yPosition = 20
    }

    doc.setLineWidth(0.5)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 10

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL HT', 20, yPosition)
    
    // Note: Le calcul du total devrait être fait côté client ou via une API
    // Pour l'instant, on affiche juste "À calculer"
    doc.text('À calculer', 150, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Tous les prix sont hors taxes', 20, yPosition)

    // Générer le PDF
    const pdfBlob = doc.output('blob')

    return new NextResponse(pdfBlob, {
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

