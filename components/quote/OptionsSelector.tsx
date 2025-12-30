'use client'

import { useTranslations } from 'next-intl'
import { Delivery, Delay } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { delayOptions } from '@/lib/data'
import { AlertCircle } from 'lucide-react'
import { getIndicationDate, getDeliveryDate, formatDate, formatDateShort, calculateExpressSurcharge } from '@/lib/delivery-dates'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface OptionsSelectorProps {
  delivery: Delivery
  onDeliveryChange: (delivery: Delivery) => void
  delay: Delay
  onDelayChange: (delay: Delay) => void
}

export function OptionsSelector({
  delivery,
  onDeliveryChange,
  delay,
  onDelayChange,
}: OptionsSelectorProps) {
  const t = useTranslations('delivery')

  return (
    <div className="space-y-4">
      {/* Délai */}
      <Card>
        <CardHeader>
          <CardTitle>Délai de livraison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('delay')}</Label>
            <Select
              value={delay.isExpress ? 'express' : `${delay.workingDays}`}
              onValueChange={(value) => {
                if (value === 'express') {
                  const expressDelay = delayOptions.find(d => d.isExpress)
                  if (expressDelay) {
                    onDelayChange(expressDelay)
                  }
                } else {
                  const workingDays = parseInt(value)
                  const selectedDelay = delayOptions.find(d => d.type === 'standard' && d.workingDays === workingDays)
                  if (selectedDelay) {
                    onDelayChange(selectedDelay)
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {delayOptions.map((option, index) => {
                  if (option.isExpress) {
                    return (
                      <SelectItem key={`express-${index}`} value="express">
                        Express (jusqu'à 24h - soumis à approbation)
                      </SelectItem>
                    )
                  } else {
                    return (
                      <SelectItem key={`standard-${option.workingDays}-${index}`} value={`${option.workingDays}`}>
                        {option.workingDays} {t('workingDays')}
                      </SelectItem>
                    )
                  }
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Dates d'indication et de livraison */}
          <div className="space-y-2 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Date d'indication</Label>
                <p className="font-medium">{formatDateShort(getIndicationDate())}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t('estimatedDeliveryDate')}</Label>
                <p className="font-medium">{formatDateShort(getDeliveryDate(delay))}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(getDeliveryDate(delay))}
                </p>
              </div>
            </div>
          </div>

          {/* Avertissement pour l'express */}
          {delay.isExpress && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('express')} :</strong> {t('expressWarning', { surcharge: calculateExpressSurcharge(10, delay.expressDays || 1).toFixed(0) })}
              </AlertDescription>
            </Alert>
          )}

          {/* Avertissement pour les délais courts (moins de 10 jours) */}
          {!delay.isExpress && delay.workingDays < 10 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('reducedDelay')} :</strong> {t('reducedDelayWarning', { surcharge: calculateExpressSurcharge(10, delay.workingDays).toFixed(0), days: delay.workingDays })}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Options d'emballage */}
      <Card>
        <CardHeader>
          <CardTitle>Options d'emballage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="individualPackaging"
              checked={delivery.individualPackaging || false}
              onCheckedChange={(checked) => {
                onDeliveryChange({
                  ...delivery,
                  individualPackaging: checked === true,
                })
              }}
            />
            <Label
              htmlFor="individualPackaging"
              className="text-sm font-normal cursor-pointer flex-1"
            >
              {t('individualPackaging')}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            {t('individualPackagingDescription')}
          </p>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="newCarton"
              checked={delivery.newCarton || false}
              onCheckedChange={(checked) => {
                onDeliveryChange({
                  ...delivery,
                  newCarton: checked === true,
                })
              }}
            />
            <Label
              htmlFor="newCarton"
              className="text-sm font-normal cursor-pointer flex-1"
            >
              {t('newCarton')}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            {t('newCartonDescription')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

