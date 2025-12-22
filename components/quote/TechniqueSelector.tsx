'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { TechniqueType, TechniqueOptions, SerigraphieOptions, BroderieOptions, DTFOptions, TextileType, Position, PositionType, ProductCategory } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { techniques, techniqueConfig, availableDimensions, positionConfig, positionLabels } from '@/lib/data'
import { Plus, Trash2, Upload, X } from 'lucide-react'

interface TechniqueSelectorProps {
  selectedTechnique: TechniqueType | null
  onTechniqueChange: (technique: TechniqueType) => void
  options: TechniqueOptions | null
  onOptionsChange: (options: TechniqueOptions) => void
  position: Position | null
  onPositionChange: (position: Position | null) => void
  files: Array<{ id: string; name: string; url: string; size: number; type: string }>
  onFilesChange: (files: Array<{ id: string; name: string; url: string; size: number; type: string }>) => void
  notes: string
  onNotesChange: (notes: string) => void
  productCategory?: ProductCategory
  servicePricing?: any[] // Prix des services pour afficher les options disponibles
  vectorization?: boolean // Vectorisation du logo
  onVectorizationChange?: (vectorization: boolean) => void // Callback pour la vectorisation
}

export function TechniqueSelector({
  selectedTechnique,
  onTechniqueChange,
  options,
  onOptionsChange,
  position,
  onPositionChange,
  files,
  onFilesChange,
  notes,
  onNotesChange,
  productCategory = 'autre',
  servicePricing = [],
  vectorization,
  onVectorizationChange,
}: TechniqueSelectorProps) {
  const t = useTranslations('technique')
  const [localOptions, setLocalOptions] = useState<TechniqueOptions | null>(options)
  const [customDimension, setCustomDimension] = useState('')

  // Synchroniser localOptions avec options venant de l'extérieur
  useEffect(() => {
    if (options && options !== localOptions) {
      setLocalOptions(options)
    }
  }, [options])

  useEffect(() => {
    if (selectedTechnique && !localOptions) {
      // Initialiser les options par défaut selon la technique
      if (selectedTechnique === 'serigraphie') {
        setLocalOptions({
          textileType: 'clair',
          nombreCouleurs: 1,
          nombreEmplacements: 1,
          selectedOptions: [],
        } as SerigraphieOptions)
      } else if (selectedTechnique === 'broderie') {
        setLocalOptions({
          nombrePoints: 5000,
          nombreEmplacements: 1,
          embroiderySize: 'petite', // Par défaut : petite broderie
          isPersonalization: false,
        } as BroderieOptions)
      } else if (selectedTechnique === 'dtf') {
        setLocalOptions({
          dimension: '10x10 cm',
          nombreEmplacements: 1,
          isPersonalization: false,
        } as DTFOptions)
      }
      
      // Initialiser la position si nécessaire
      if (!position) {
        onPositionChange({ type: getDefaultPosition() })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTechnique])

  // Initialiser la position si nécessaire
  useEffect(() => {
    if (selectedTechnique && !position) {
      onPositionChange({ type: getDefaultPosition() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTechnique])

  const getDefaultPosition = (): PositionType => {
    const availablePositions = positionConfig[productCategory] || positionConfig.autre
    return availablePositions[0] || 'custom'
  }

  const getAvailablePositions = (): PositionType[] => {
    return positionConfig[productCategory] || positionConfig.autre
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = event.target.files
    if (!filesList) return

    const newFiles = Array.from(filesList).map(file => {
      const id = Math.random().toString(36).substring(7)
      const url = URL.createObjectURL(file)
      return {
        id,
        name: file.name,
        url,
        size: file.size,
        type: file.type,
      }
    })

    onFilesChange([...files, ...newFiles])
  }

  const removeFile = (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId)
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.url)
    }
    onFilesChange(files.filter(f => f.id !== fileId))
  }

  // Synchroniser localOptions avec onOptionsChange (sans positions pour éviter les boucles)
  useEffect(() => {
    if (localOptions) {
      onOptionsChange(localOptions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localOptions])

  // Synchroniser le nombre d'emplacements (toujours 1 maintenant)
  useEffect(() => {
    if (localOptions && 'nombreEmplacements' in localOptions && localOptions.nombreEmplacements !== 1) {
      const updatedOptions = {
        ...localOptions,
        nombreEmplacements: 1,
      }
      setLocalOptions(updatedOptions as TechniqueOptions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateOptions = (updates: Partial<TechniqueOptions>) => {
    if (localOptions) {
      setLocalOptions({ ...localOptions, ...updates })
    }
  }

  const handleDimensionChange = (dimension: string) => {
    if (dimension === 'Personnalisé') {
      setCustomDimension('')
      // Ne pas mettre à jour les options pour l'instant, attendre la saisie
    } else {
      setCustomDimension('')
      if (selectedTechnique === 'dtf') {
        updateOptions({ dimension } as Partial<DTFOptions>)
      }
    }
  }

  const handleCustomDimensionChange = (value: string) => {
    setCustomDimension(value)
    if (selectedTechnique === 'dtf') {
      updateOptions({ dimension: value } as Partial<DTFOptions>)
    }
  }

  const getDimensionDisplayValue = () => {
    if (!localOptions) return ''
    if (selectedTechnique === 'dtf') {
      const dim = (localOptions as DTFOptions).dimension
      return availableDimensions.includes(dim) ? dim : 'Personnalisé'
    }
    return ''
  }

  const isCustomDimension = () => {
    if (!localOptions) return false
    if (selectedTechnique === 'dtf') {
      const dim = (localOptions as DTFOptions).dimension
      return dim && !availableDimensions.includes(dim)
    }
    return false
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('selectTechnique')}</CardTitle>
        <CardDescription>{t('selectTechnique')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('selectTechnique')}</Label>
          <Select
            value={selectedTechnique || ''}
            onValueChange={(value) => {
              onTechniqueChange(value as TechniqueType)
              setLocalOptions(null)
              setCustomDimension('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectTechnique')} />
            </SelectTrigger>
            <SelectContent>
              {techniques.map(technique => (
                <SelectItem key={technique.id} value={technique.id}>
                  {technique.name} - {technique.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Options pour la Sérigraphie */}
        {selectedTechnique === 'serigraphie' && localOptions && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>{t('textileType')}</Label>
              <Select
                value={(localOptions as SerigraphieOptions).textileType}
                onValueChange={(value) =>
                  updateOptions({
                    textileType: value as TextileType,
                  } as Partial<SerigraphieOptions>)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clair">{t('light')}</SelectItem>
                  <SelectItem value="fonce">{t('dark')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {t('colorCount')} ({t('minColors', { min: techniqueConfig.serigraphie.minCouleurs })}, {t('maxColors', { max: techniqueConfig.serigraphie.maxCouleurs })})
              </Label>
              <Input
                type="number"
                min={techniqueConfig.serigraphie.minCouleurs}
                max={techniqueConfig.serigraphie.maxCouleurs}
                value={(localOptions as SerigraphieOptions).nombreCouleurs}
                onChange={(e) =>
                  updateOptions({
                    nombreCouleurs: parseInt(e.target.value) || 1,
                  } as Partial<SerigraphieOptions>)
                }
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            {/* Options de sérigraphie (Discharge, Gold, etc.) */}
            {(() => {
              const serigraphiePricing = servicePricing.find((p: any) => p.technique === 'serigraphie')
              const availableOptions = serigraphiePricing?.options || []
              
              if (availableOptions.length > 0) {
                const currentOptions = (localOptions as SerigraphieOptions).selectedOptions || []
                
                return (
                  <div className="space-y-2">
                    <Label>{t('options')}</Label>
                    <div className="space-y-2">
                      {availableOptions.map((option: any) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`serigraphie-option-${option.id}`}
                            checked={currentOptions.includes(option.id)}
                            onCheckedChange={(checked) => {
                              const newOptions = checked
                                ? [...currentOptions, option.id]
                                : currentOptions.filter((id: string) => id !== option.id)
                              updateOptions({
                                selectedOptions: newOptions,
                              } as Partial<SerigraphieOptions>)
                            }}
                          />
                          <Label
                            htmlFor={`serigraphie-option-${option.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {option.name} (+{option.surchargePercentage}%)
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('optionsDescription')}
                    </p>
                  </div>
                )
              }
              return null
            })()}

          </div>
        )}

        {/* Options pour la Broderie */}
        {selectedTechnique === 'broderie' && localOptions && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>{t('embroiderySize')}</Label>
              <Select
                value={(localOptions as BroderieOptions).embroiderySize || 'petite'}
                onValueChange={(value) =>
                  updateOptions({
                    embroiderySize: value as 'petite' | 'grande',
                  } as Partial<BroderieOptions>)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petite">{t('small')}</SelectItem>
                  <SelectItem value="grande">{t('large')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('pointsDescription')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                {t('points')} ({t('minPoints', { min: techniqueConfig.broderie.minPoints.toLocaleString() })}, {t('maxPoints', { max: techniqueConfig.broderie.maxPoints.toLocaleString() })})
              </Label>
              <Input
                type="number"
                min={techniqueConfig.broderie.minPoints}
                max={techniqueConfig.broderie.maxPoints}
                value={(localOptions as BroderieOptions).nombrePoints}
                onChange={(e) =>
                  updateOptions({
                    nombrePoints: parseInt(e.target.value) || 1000,
                  } as Partial<BroderieOptions>)
                }
                onWheel={(e) => e.currentTarget.blur()}
              />
              <p className="text-xs text-muted-foreground">
                Le nombre de points détermine la complexité de la broderie
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="broderie-personalization"
                checked={(localOptions as BroderieOptions).isPersonalization || false}
                onCheckedChange={(checked) =>
                  updateOptions({
                    isPersonalization: checked === true,
                  } as Partial<BroderieOptions>)
                }
              />
              <Label
                htmlFor="broderie-personalization"
                className="text-sm font-normal cursor-pointer"
              >
                {t('personalization')}
              </Label>
            </div>
          </div>
        )}

        {/* Options pour le DTF */}
        {selectedTechnique === 'dtf' && localOptions && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Dimension du marquage</Label>
              <Select
                value={getDimensionDisplayValue()}
                onValueChange={handleDimensionChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableDimensions.map(dim => (
                    <SelectItem key={dim} value={dim}>
                      {dim}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(getDimensionDisplayValue() === 'Personnalisé' || isCustomDimension()) && (
                <Input
                  placeholder="Ex: 12x18 cm"
                  value={isCustomDimension() ? (localOptions as DTFOptions).dimension : customDimension}
                  onChange={(e) => handleCustomDimensionChange(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="dtf-personalization"
                checked={(localOptions as DTFOptions).isPersonalization || false}
                onCheckedChange={(checked) =>
                  updateOptions({
                    isPersonalization: checked === true,
                  } as Partial<DTFOptions>)
                }
              />
              <Label
                htmlFor="dtf-personalization"
                className="text-sm font-normal cursor-pointer"
              >
                {t('personalization')}
              </Label>
            </div>
          </div>
        )}

        {/* Position du marquage - affiché après les options */}
        {selectedTechnique && localOptions && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>{t('position')}</Label>
              <Select
                value={position?.type || ''}
                onValueChange={(value) =>
                  onPositionChange({ type: value as PositionType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailablePositions().map(posType => (
                    <SelectItem key={posType} value={posType}>
                      {positionLabels[posType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {position?.type === 'custom' && (
                <Input
                  placeholder={t('customPositionPlaceholder')}
                  value={position.customDescription || ''}
                  onChange={(e) =>
                    onPositionChange({ ...position, customDescription: e.target.value })
                  }
                  className="mt-2"
                />
              )}
            </div>

            {/* Fichiers */}
            <div className="space-y-2">
              <Label>{t('files')}</Label>
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                      className="h-6 w-6 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <label className="flex items-center justify-center w-full p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="text-sm">{t('uploadFiles')}</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.ai,.eps,.svg"
                  />
                </label>
              </div>
              
              {/* Option vectorisation - affichée uniquement si des fichiers sont ajoutés */}
              {files.length > 0 && onVectorizationChange && (
                <div className="pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="vectorization"
                      checked={vectorization || false}
                      onCheckedChange={(checked) => {
                        onVectorizationChange(checked === true)
                      }}
                    />
                    <Label
                      htmlFor="vectorization"
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {t('vectorization')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6 mt-1">
                    {t('vectorizationDescription')}
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('notes')}</Label>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
