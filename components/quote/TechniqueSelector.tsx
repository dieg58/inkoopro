'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { TechniqueType, TechniqueOptions, SerigraphieOptions, BroderieOptions, DTFOptions, TextileType, Position, PositionType, ProductCategory, PantoneColor } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { techniques, techniqueConfig, positionConfig, positionLabels, embroideryTypographies, dtfTypographies, basePantoneColors, pantoneColorMap } from '@/lib/data'
import { ServicePricing } from '@/types'
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
  servicePricing?: ServicePricing[] // Prix des services pour afficher les options disponibles
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
  const commonT = useTranslations('common')
  const [localOptions, setLocalOptions] = useState<TechniqueOptions | null>(options)
  const [customDimension, setCustomDimension] = useState('')
  const [customPantoneCodes, setCustomPantoneCodes] = useState<Record<number, string>>({}) // Index -> code personnalisé
  const isInternalUpdate = useRef(false) // Flag pour éviter les boucles lors des mises à jour internes
  const lastSerigraphieNombreCouleurs = useRef<number | null>(null) // Dernière valeur de nombreCouleurs pour la sérigraphie
  const lastBroderieNombreCouleurs = useRef<number | null>(null) // Dernière valeur de nombreCouleurs pour la broderie

  // Synchroniser localOptions avec options venant de l'extérieur
  // Utiliser une comparaison JSON pour éviter les boucles infinies
  const lastOptionsRef = useRef<string>('')
  useEffect(() => {
    if (options && !isInternalUpdate.current) {
      const optionsString = JSON.stringify(options)
      const localOptionsString = JSON.stringify(localOptions)
      // Ne synchroniser que si les options ont vraiment changé
      if (optionsString !== localOptionsString && optionsString !== lastOptionsRef.current) {
        lastOptionsRef.current = optionsString
        setLocalOptions(options)
      }
    }
    isInternalUpdate.current = false
  }, [options, localOptions])

  useEffect(() => {
    if (selectedTechnique && !localOptions) {
      // Initialiser les options par défaut selon la technique
      if (selectedTechnique === 'serigraphie') {
        setLocalOptions({
          textileType: 'clair',
          nombreCouleurs: 1,
          nombreEmplacements: 1,
          selectedOptions: [],
          pantoneColors: [],
        } as SerigraphieOptions)
      } else if (selectedTechnique === 'broderie') {
        setLocalOptions({
          nombrePoints: 5000,
          nombreEmplacements: 1,
          embroiderySize: 'petite', // Par défaut : petite broderie
          isPersonalization: false,
          nombreCouleurs: 1,
          pantoneColors: [],
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

  const handlePersonalizationFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = event.target.files
    if (!filesList || filesList.length === 0) return

    const file = filesList[0]
    const personalizationFile = {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type,
    }

    if (selectedTechnique === 'broderie') {
      updateOptions({ personalizationFile } as Partial<BroderieOptions>)
    } else if (selectedTechnique === 'dtf') {
      updateOptions({ personalizationFile } as Partial<DTFOptions>)
    }
  }

  const removePersonalizationFile = () => {
    if (selectedTechnique === 'broderie') {
      const options = localOptions as BroderieOptions
      if (options.personalizationFile) {
        URL.revokeObjectURL(options.personalizationFile.url)
      }
      updateOptions({ personalizationFile: undefined } as Partial<BroderieOptions>)
    } else if (selectedTechnique === 'dtf') {
      const options = localOptions as DTFOptions
      if (options.personalizationFile) {
        URL.revokeObjectURL(options.personalizationFile.url)
      }
      updateOptions({ personalizationFile: undefined } as Partial<DTFOptions>)
    }
  }

  // Gérer les couleurs Pantone pour la sérigraphie
  const handlePantoneColorChange = (index: number, colorCode: string, isCustom: boolean = false) => {
    if (!localOptions || selectedTechnique !== 'serigraphie') return
    
    const options = localOptions as SerigraphieOptions
    const currentColors = options.pantoneColors || []
    
    // Créer ou mettre à jour la couleur à l'index spécifié
    const newColors = [...currentColors]
    if (isCustom) {
      newColors[index] = {
        code: `Custom-${Date.now()}-${index}`,
        isCustom: true,
        customCode: colorCode,
      }
      setCustomPantoneCodes({ ...customPantoneCodes, [index]: colorCode })
    } else {
      newColors[index] = {
        code: colorCode,
        isCustom: false,
      }
      // Supprimer le code personnalisé si on passe à une couleur de base
      const newCustomCodes = { ...customPantoneCodes }
      delete newCustomCodes[index]
      setCustomPantoneCodes(newCustomCodes)
    }
    
    // S'assurer qu'on a le bon nombre de couleurs
    while (newColors.length < options.nombreCouleurs) {
      newColors.push({
        code: basePantoneColors[0],
        isCustom: false,
      })
    }
    newColors.splice(options.nombreCouleurs)
    
    updateOptions({ pantoneColors: newColors } as Partial<SerigraphieOptions>)
  }

  const handleCustomPantoneCodeChange = (index: number, customCode: string) => {
    setCustomPantoneCodes({ ...customPantoneCodes, [index]: customCode })
    if (customCode.trim()) {
      handlePantoneColorChange(index, customCode, true)
    }
  }

  // Gérer les couleurs Pantone pour la broderie (similaire à la sérigraphie)
  const handleBroderiePantoneColorChange = (index: number, colorCode: string, isCustom: boolean = false) => {
    if (!localOptions || selectedTechnique !== 'broderie') return
    
    const options = localOptions as BroderieOptions
    const currentColors = options.pantoneColors || []
    
    // Créer ou mettre à jour la couleur à l'index spécifié
    const newColors = [...currentColors]
    if (isCustom) {
      newColors[index] = {
        code: `Custom-${Date.now()}-${index}`,
        isCustom: true,
        customCode: colorCode,
      }
      setCustomPantoneCodes({ ...customPantoneCodes, [index]: colorCode })
    } else {
      newColors[index] = {
        code: colorCode,
        isCustom: false,
      }
      // Supprimer le code personnalisé si on passe à une couleur de base
      const newCustomCodes = { ...customPantoneCodes }
      delete newCustomCodes[index]
      setCustomPantoneCodes(newCustomCodes)
    }
    
    // S'assurer qu'on a le bon nombre de couleurs (max 6)
    const maxColors = 6
    const nombreCouleurs = options.nombreCouleurs || 1
    while (newColors.length < nombreCouleurs) {
      newColors.push({
        code: basePantoneColors[0],
        isCustom: false,
      })
    }
    newColors.splice(nombreCouleurs)
    
    updateOptions({ pantoneColors: newColors } as Partial<BroderieOptions>)
  }

  const handleBroderieCustomPantoneCodeChange = (index: number, customCode: string) => {
    setCustomPantoneCodes({ ...customPantoneCodes, [index]: customCode })
    if (customCode.trim()) {
      handleBroderiePantoneColorChange(index, customCode, true)
    }
  }

  // Extraire nombreCouleurs pour la sérigraphie de manière stable
  const serigraphieNombreCouleurs = selectedTechnique === 'serigraphie' && localOptions 
    ? (localOptions as SerigraphieOptions).nombreCouleurs || 1 
    : null

  // Extraire nombreCouleurs pour la broderie de manière stable
  const broderieNombreCouleurs = selectedTechnique === 'broderie' && localOptions 
    ? (localOptions as BroderieOptions).nombreCouleurs || 1 
    : null

  // Synchroniser le nombre de couleurs avec les couleurs Pantone (sérigraphie)
  useEffect(() => {
    if (selectedTechnique === 'serigraphie' && localOptions && serigraphieNombreCouleurs !== null) {
      const options = localOptions as SerigraphieOptions
      const currentColors = options.pantoneColors || []
      
      // Vérifier si nombreCouleurs a vraiment changé depuis la dernière fois
      if (serigraphieNombreCouleurs !== lastSerigraphieNombreCouleurs.current && serigraphieNombreCouleurs !== currentColors.length) {
        lastSerigraphieNombreCouleurs.current = serigraphieNombreCouleurs
        const newColors = [...currentColors]
        while (newColors.length < serigraphieNombreCouleurs) {
          newColors.push({
            code: basePantoneColors[0],
            isCustom: false,
          })
        }
        newColors.splice(serigraphieNombreCouleurs)
        // Utiliser setLocalOptions directement avec le flag pour éviter les boucles
        // Le useEffect de synchronisation appellera onOptionsChange si nécessaire
        isInternalUpdate.current = true
        setLocalOptions({
          ...localOptions,
          pantoneColors: newColors,
        } as TechniqueOptions)
      }
    } else if (selectedTechnique !== 'serigraphie') {
      lastSerigraphieNombreCouleurs.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTechnique, serigraphieNombreCouleurs])

  // Synchroniser le nombre de couleurs avec les couleurs Pantone (broderie)
  useEffect(() => {
    if (selectedTechnique === 'broderie' && localOptions && broderieNombreCouleurs !== null) {
      const options = localOptions as BroderieOptions
      const currentColors = options.pantoneColors || []
      
      // Vérifier si nombreCouleurs a vraiment changé depuis la dernière fois
      if (broderieNombreCouleurs !== lastBroderieNombreCouleurs.current && broderieNombreCouleurs !== currentColors.length) {
        lastBroderieNombreCouleurs.current = broderieNombreCouleurs
        const newColors = [...currentColors]
        while (newColors.length < broderieNombreCouleurs) {
          newColors.push({
            code: basePantoneColors[0],
            isCustom: false,
          })
        }
        newColors.splice(broderieNombreCouleurs)
        // Utiliser setLocalOptions directement avec le flag pour éviter les boucles
        isInternalUpdate.current = true
        setLocalOptions({
          ...localOptions,
          pantoneColors: newColors,
        } as TechniqueOptions)
      }
    } else if (selectedTechnique !== 'broderie') {
      lastBroderieNombreCouleurs.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTechnique, broderieNombreCouleurs])

  // DÉSACTIVÉ : Synchronisation automatique de localOptions vers onOptionsChange
  // Cette synchronisation causait des boucles infinies
  // onOptionsChange est maintenant appelé uniquement via updateOptions lors des actions explicites de l'utilisateur

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
      const updatedOptions = { ...localOptions, ...updates } as TechniqueOptions
      isInternalUpdate.current = true
      setLocalOptions(updatedOptions)
      // Appeler onOptionsChange directement pour éviter les boucles
      // Le flag isInternalUpdate empêchera la synchronisation inverse
      onOptionsChange(updatedOptions)
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

  // Récupérer les dimensions disponibles depuis servicePricing pour DTF
  const getAvailableDimensions = (): string[] => {
    const dtfPricing = servicePricing.find((p: ServicePricing) => p.technique === 'dtf')
    if (dtfPricing && 'dimensions' in dtfPricing && Array.isArray(dtfPricing.dimensions)) {
      return dtfPricing.dimensions
    }
    // Fallback vers les dimensions par défaut si servicePricing n'est pas encore chargé
    return ['5x5 cm', '10x10 cm', '15x15 cm', '20x20 cm', '25x25 cm', '10x15 cm', '15x20 cm', '20x30 cm', '30x40 cm', 'Personnalisé']
  }

  const getDimensionDisplayValue = () => {
    if (!localOptions) return ''
    if (selectedTechnique === 'dtf') {
      const dim = (localOptions as DTFOptions).dimension
      const availableDims = getAvailableDimensions()
      return availableDims.includes(dim) ? dim : 'Personnalisé'
    }
    return ''
  }

  const isCustomDimension = () => {
    if (!localOptions) return false
    if (selectedTechnique === 'dtf') {
      const dim = (localOptions as DTFOptions).dimension
      const availableDims = getAvailableDimensions()
      return dim && !availableDims.includes(dim)
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
              <Label>{t('colorCount')}</Label>
              {(() => {
                const serigraphiePricing = servicePricing.find((p: ServicePricing) => p.technique === 'serigraphie')
                const availableColorCounts = serigraphiePricing && 'colorCounts' in serigraphiePricing && Array.isArray(serigraphiePricing.colorCounts)
                  ? serigraphiePricing.colorCounts
                  : [1, 2, 3, 4, 5, 6] // Fallback vers les valeurs par défaut
                
                return (
                  <Select
                    value={String((localOptions as SerigraphieOptions).nombreCouleurs)}
                    onValueChange={(value) =>
                      updateOptions({
                        nombreCouleurs: parseInt(value) || 1,
                      } as Partial<SerigraphieOptions>)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColorCounts.map((count: number) => (
                        <SelectItem key={count} value={String(count)}>
                          {count} {count === 1 ? commonT('color') : commonT('colors')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              })()}
            </div>

            {/* Sélection des couleurs Pantone */}
            {(() => {
              const options = localOptions as SerigraphieOptions
              const pantoneColors = options.pantoneColors || []
              const customColorsCount = pantoneColors.filter(c => c.isCustom).length
              const surchargeAmount = customColorsCount * 25 // 25€ par couleur hors catalogue
              
              return (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>{t('pantoneColors')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('pantoneColorsDescription')}
                    </p>
                    
                    {Array.from({ length: options.nombreCouleurs }).map((_, index) => {
                      const currentColor = pantoneColors[index] || { code: basePantoneColors[0], isCustom: false }
                      const isCustom = currentColor.isCustom
                      const customCode = customPantoneCodes[index] || currentColor.customCode || ''
                      
                      return (
                        <div key={index} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">
                              {commonT('color')} {index + 1}
                            </Label>
                            {isCustom && (
                              <span className="text-xs text-orange-600 font-medium">
                                +25€ {t('surcharge')}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Select
                              value={isCustom ? 'custom' : currentColor.code}
                              onValueChange={(value) => {
                                if (value === 'custom') {
                                  // Passer en mode personnalisé
                                  handlePantoneColorChange(index, customCode || '', true)
                                } else {
                                  // Sélectionner une couleur de base
                                  handlePantoneColorChange(index, value, false)
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue>
                                  {isCustom ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400 flex-shrink-0" />
                                      <span>{customCode || t('customPantone')}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <div 
                                        className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                                        style={{ backgroundColor: pantoneColorMap[currentColor.code] || '#CCCCCC' }}
                                      />
                                      <span>{currentColor.code}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {basePantoneColors.map((color) => {
                                  const hexColor = pantoneColorMap[color] || '#CCCCCC'
                                  return (
                                    <SelectItem key={color} value={color}>
                                      <div className="flex items-center space-x-2">
                                        <div 
                                          className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                                          style={{ backgroundColor: hexColor }}
                                        />
                                        <span>{color}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                                <SelectItem value="custom">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400 flex-shrink-0" />
                                    <span>{t('customPantone')} (+25€)</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {isCustom && (
                              <Input
                                placeholder={t('enterPantoneCode')}
                                value={customCode}
                                onChange={(e) => handleCustomPantoneCodeChange(index, e.target.value)}
                                className="mt-2"
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                    
                    {customColorsCount > 0 && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800">
                          <strong>{t('customColorsSurcharge')}:</strong> {customColorsCount} {customColorsCount === 1 ? t('customColor') : t('customColors')} × 25€ = <strong>{surchargeAmount}€</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Options de sérigraphie (Discharge, Gold, etc.) */}
            {(() => {
              const serigraphiePricing = servicePricing.find((p: ServicePricing) => p.technique === 'serigraphie')
              const availableOptions = serigraphiePricing && 'options' in serigraphiePricing && serigraphiePricing.options
                ? serigraphiePricing.options
                : []
              
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
              <Label>{t('points')}</Label>
              {(() => {
                const options = localOptions as BroderieOptions
                const embroiderySize = options.embroiderySize || 'petite'
                const broderiePricing = servicePricing.find((p: ServicePricing) => p.technique === 'broderie')
                
                // Récupérer les pointRanges selon la taille de broderie
                let pointRanges: Array<{ min: number; max: number | null; label: string }> = []
                if (broderiePricing && 'pointRangesPetite' in broderiePricing && 'pointRangesGrande' in broderiePricing) {
                  pointRanges = embroiderySize === 'petite' 
                    ? broderiePricing.pointRangesPetite 
                    : broderiePricing.pointRangesGrande
                }
                
                // Si pas de pointRanges depuis l'admin, utiliser des valeurs par défaut
                if (pointRanges.length === 0) {
                  pointRanges = [
                    { min: 0, max: 5000, label: '0-5000' },
                    { min: 5001, max: 10000, label: '5001-10000' },
                    { min: 10001, max: 20000, label: '10001-20000' },
                    { min: 20001, max: 30000, label: '20001-30000' },
                    { min: 30001, max: null, label: '30001+' },
                  ]
                }
                
                // Trouver la fourchette correspondant au nombre de points actuel
                const currentPoints = options.nombrePoints || 5000
                const currentRange = pointRanges.find(range => 
                  currentPoints >= range.min && (range.max === null || currentPoints <= range.max)
                ) || pointRanges[0]
                
                return (
                  <Select
                    value={currentRange.label}
                    onValueChange={(value) => {
                      const selectedRange = pointRanges.find(r => r.label === value)
                      if (selectedRange) {
                        // Utiliser le min de la fourchette comme valeur
                        updateOptions({
                          nombrePoints: selectedRange.min,
                        } as Partial<BroderieOptions>)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pointRanges.map((range) => (
                        <SelectItem key={range.label} value={range.label}>
                          {range.label} {t('points')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              })()}
              <p className="text-xs text-muted-foreground">
                {t('pointsDescription')}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="broderie-personalization"
                checked={(localOptions as BroderieOptions).isPersonalization || false}
                onCheckedChange={(checked) =>
                  updateOptions({
                    isPersonalization: checked === true,
                    ...(checked === false && { personalizationFile: undefined, typography: undefined }),
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

            {/* Options de personnalisation pour la broderie */}
            {(localOptions as BroderieOptions).isPersonalization && (
              <div className="space-y-4 pt-4 border-t bg-muted/50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>{t('personalizationFile')}</Label>
                  {(localOptions as BroderieOptions).personalizationFile ? (
                    <div className="flex items-center justify-between p-3 bg-background border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{(localOptions as BroderieOptions).personalizationFile?.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removePersonalizationFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept=".pdf,.ai,.eps,.svg,.png,.jpg,.jpeg"
                        onChange={handlePersonalizationFileUpload}
                        className="flex-1"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('personalizationFileDescription')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('typography')}</Label>
                  <Select
                    value={(localOptions as BroderieOptions).typography || ''}
                    onValueChange={(value) =>
                      updateOptions({
                        typography: value,
                      } as Partial<BroderieOptions>)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectTypography')}>
                        {(localOptions as BroderieOptions).typography && (
                          <div className="flex items-center space-x-2">
                            <span 
                              style={{ fontFamily: (localOptions as BroderieOptions).typography }} 
                              className="text-lg"
                            >
                              Aa
                            </span>
                            <span>{(localOptions as BroderieOptions).typography}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {embroideryTypographies.map((typography) => (
                        <SelectItem key={typography} value={typography}>
                          <div className="flex items-center space-x-2">
                            <span style={{ fontFamily: typography }} className="text-lg">
                              Aa
                            </span>
                            <span>{typography}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('typographyDescription')}
                  </p>
                </div>
              </div>
            )}

            {/* Sélection du nombre de couleurs Pantone pour la broderie */}
            <div className="space-y-2 pt-4 border-t">
              <Label>{t('colorCount')} (max 6)</Label>
              <Select
                value={String((localOptions as BroderieOptions).nombreCouleurs || 1)}
                onValueChange={(value) => {
                  const nombreCouleurs = Math.min(parseInt(value) || 1, 6) // Max 6
                  updateOptions({
                    nombreCouleurs,
                  } as Partial<BroderieOptions>)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} {count === 1 ? commonT('color') : commonT('colors')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélection des couleurs Pantone pour la broderie */}
            {(() => {
              const options = localOptions as BroderieOptions
              const pantoneColors = options.pantoneColors || []
              const nombreCouleurs = options.nombreCouleurs || 1
              const customColorsCount = pantoneColors.filter(c => c.isCustom).length
              const surchargeAmount = customColorsCount * 25 // 25€ par couleur hors catalogue
              
              return (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>{t('pantoneColors')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('pantoneColorsDescription')}
                    </p>
                    
                    {Array.from({ length: nombreCouleurs }).map((_, index) => {
                      const currentColor = pantoneColors[index] || { code: basePantoneColors[0], isCustom: false }
                      const isCustom = currentColor.isCustom
                      const customCode = customPantoneCodes[index] || currentColor.customCode || ''
                      
                      return (
                        <div key={index} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">
                              {commonT('color')} {index + 1}
                            </Label>
                            {isCustom && (
                              <span className="text-xs text-orange-600 font-medium">
                                +25€ {t('surcharge')}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Select
                              value={isCustom ? 'custom' : currentColor.code}
                              onValueChange={(value) => {
                                if (value === 'custom') {
                                  // Passer en mode personnalisé
                                  handleBroderiePantoneColorChange(index, customCode || '', true)
                                } else {
                                  // Sélectionner une couleur de base
                                  handleBroderiePantoneColorChange(index, value, false)
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue>
                                  {isCustom ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400 flex-shrink-0" />
                                      <span>{customCode || t('customPantone')}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <div 
                                        className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                                        style={{ backgroundColor: pantoneColorMap[currentColor.code] || '#CCCCCC' }}
                                      />
                                      <span>{currentColor.code}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {basePantoneColors.map((color) => {
                                  const hexColor = pantoneColorMap[color] || '#CCCCCC'
                                  return (
                                    <SelectItem key={color} value={color}>
                                      <div className="flex items-center space-x-2">
                                        <div 
                                          className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                                          style={{ backgroundColor: hexColor }}
                                        />
                                        <span>{color}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                                <SelectItem value="custom">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400 flex-shrink-0" />
                                    <span>{t('customPantone')} (+25€)</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {isCustom && (
                              <Input
                                placeholder={t('enterPantoneCode')}
                                value={customCode}
                                onChange={(e) => handleBroderieCustomPantoneCodeChange(index, e.target.value)}
                                className="mt-2"
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                    
                    {customColorsCount > 0 && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800">
                          <strong>{t('customColorsSurcharge')}:</strong> {customColorsCount} {customColorsCount === 1 ? t('customColor') : t('customColors')} × 25€ = <strong>{surchargeAmount}€</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
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
                  {getAvailableDimensions().map(dim => (
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
                    ...(checked === false && { personalizationFile: undefined, typography: undefined }),
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

            {/* Options de personnalisation pour la DTF */}
            {(localOptions as DTFOptions).isPersonalization && (
              <div className="space-y-4 pt-4 border-t bg-muted/50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>{t('personalizationFile')}</Label>
                  {(localOptions as DTFOptions).personalizationFile ? (
                    <div className="flex items-center justify-between p-3 bg-background border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{(localOptions as DTFOptions).personalizationFile?.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removePersonalizationFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept=".pdf,.ai,.eps,.svg,.png,.jpg,.jpeg"
                        onChange={handlePersonalizationFileUpload}
                        className="flex-1"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('personalizationFileDescription')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('typography')}</Label>
                  <Select
                    value={(localOptions as DTFOptions).typography || ''}
                    onValueChange={(value) =>
                      updateOptions({
                        typography: value,
                      } as Partial<DTFOptions>)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectTypography')}>
                        {(localOptions as DTFOptions).typography && (
                          <div className="flex items-center space-x-2">
                            <span 
                              style={{ fontFamily: (localOptions as DTFOptions).typography }} 
                              className="text-lg"
                            >
                              Aa
                            </span>
                            <span>{(localOptions as DTFOptions).typography}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {dtfTypographies.map((typography) => (
                        <SelectItem key={typography} value={typography}>
                          <div className="flex items-center space-x-2">
                            <span style={{ fontFamily: typography }} className="text-lg">
                              Aa
                            </span>
                            <span>{typography}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('typographyDescription')}
                  </p>
                </div>
              </div>
            )}
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
