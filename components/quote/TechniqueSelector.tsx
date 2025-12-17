'use client'

import { useState, useEffect } from 'react'
import { TechniqueType, TechniqueOptions, SerigraphieOptions, BroderieOptions, DTFOptions, TextileType, Position, PositionType, ProductCategory } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
}: TechniqueSelectorProps) {
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
          dimension: '10x10 cm',
          nombreEmplacements: 1,
        } as SerigraphieOptions)
      } else if (selectedTechnique === 'broderie') {
        setLocalOptions({
          nombrePoints: 5000,
          nombreEmplacements: 1,
        } as BroderieOptions)
      } else if (selectedTechnique === 'dtf') {
        setLocalOptions({
          dimension: '10x10 cm',
          nombreEmplacements: 1,
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
      if (selectedTechnique === 'serigraphie') {
        updateOptions({ dimension } as Partial<SerigraphieOptions>)
      } else if (selectedTechnique === 'dtf') {
        updateOptions({ dimension } as Partial<DTFOptions>)
      }
    }
  }

  const handleCustomDimensionChange = (value: string) => {
    setCustomDimension(value)
    if (selectedTechnique === 'serigraphie') {
      updateOptions({ dimension: value } as Partial<SerigraphieOptions>)
    } else if (selectedTechnique === 'dtf') {
      updateOptions({ dimension: value } as Partial<DTFOptions>)
    }
  }

  const getDimensionDisplayValue = () => {
    if (!localOptions) return ''
    if (selectedTechnique === 'serigraphie') {
      const dim = (localOptions as SerigraphieOptions).dimension
      return availableDimensions.includes(dim) ? dim : 'Personnalisé'
    } else if (selectedTechnique === 'dtf') {
      const dim = (localOptions as DTFOptions).dimension
      return availableDimensions.includes(dim) ? dim : 'Personnalisé'
    }
    return ''
  }

  const isCustomDimension = () => {
    if (!localOptions) return false
    if (selectedTechnique === 'serigraphie') {
      const dim = (localOptions as SerigraphieOptions).dimension
      return dim && !availableDimensions.includes(dim)
    } else if (selectedTechnique === 'dtf') {
      const dim = (localOptions as DTFOptions).dimension
      return dim && !availableDimensions.includes(dim)
    }
    return false
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Choisissez la technique de marquage</CardTitle>
        <CardDescription>Sélectionnez la technique d'impression ou de broderie</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Technique</Label>
          <Select
            value={selectedTechnique || ''}
            onValueChange={(value) => {
              onTechniqueChange(value as TechniqueType)
              setLocalOptions(null)
              setCustomDimension('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez une technique" />
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
              <Label>Type de textile</Label>
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
                  <SelectItem value="clair">Textile clair</SelectItem>
                  <SelectItem value="fonce">Textile foncé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Nombre de couleurs (min: {techniqueConfig.serigraphie.minCouleurs}, max: {techniqueConfig.serigraphie.maxCouleurs})
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
              />
            </div>

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
                  value={isCustomDimension() ? (localOptions as SerigraphieOptions).dimension : customDimension}
                  onChange={(e) => handleCustomDimensionChange(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

          </div>
        )}

        {/* Options pour la Broderie */}
        {selectedTechnique === 'broderie' && localOptions && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>
                Nombre de points (min: {techniqueConfig.broderie.minPoints.toLocaleString()}, max: {techniqueConfig.broderie.maxPoints.toLocaleString()})
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
              />
              <p className="text-xs text-muted-foreground">
                Le nombre de points détermine la complexité et la taille de la broderie
              </p>
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

          </div>
        )}

        {/* Position du marquage - affiché après les options */}
        {selectedTechnique && localOptions && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Position du marquage</Label>
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
                  placeholder="Description de la position personnalisée"
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
              <Label>Fichiers</Label>
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
                  <span className="text-sm">Ajouter un fichier</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.ai,.eps,.svg"
                  />
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Ajoutez des notes pour ce marquage..."
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
