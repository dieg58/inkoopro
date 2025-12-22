'use client'

import { useState } from 'react'
import { Position, PositionType } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface PositionSelectorProps {
  positions: Position[]
  onPositionsChange: (positions: Position[]) => void
  nombreEmplacements: number
}

const positionOptions: { value: PositionType; label: string }[] = [
  { value: 'poitrine-gauche', label: 'Poitrine gauche' },
  { value: 'poitrine-droite', label: 'Poitrine droite' },
  { value: 'poitrine-centre', label: 'Poitrine centre' },
  { value: 'dos-centre', label: 'Dos centre' },
  { value: 'dos-haut', label: 'Dos haut' },
  { value: 'manche-gauche', label: 'Manche gauche' },
  { value: 'manche-droite', label: 'Manche droite' },
  { value: 'epaule-gauche', label: 'Épaule gauche' },
  { value: 'epaule-droite', label: 'Épaule droite' },
  { value: 'custom', label: 'Personnalisé' },
]

export function PositionSelector({
  positions,
  onPositionsChange,
  nombreEmplacements,
}: PositionSelectorProps) {
  const addPosition = () => {
    if (positions.length < nombreEmplacements) {
      onPositionsChange([
        ...positions,
        { type: 'poitrine-centre' },
      ])
    }
  }

  const removePosition = (index: number) => {
    onPositionsChange(positions.filter((_, i) => i !== index))
  }

  const updatePosition = (index: number, updates: Partial<Position>) => {
    const updated = [...positions]
    updated[index] = { ...updated[index], ...updates }
    onPositionsChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Position du marquage</CardTitle>
        <CardDescription>
          Choisissez la position du marquage ({positions.length}/{nombreEmplacements} emplacements)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {positions.map((position, index) => (
          <div key={index} className="space-y-2 p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label>Position {index + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePosition(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={position.type}
                onChange={(e) =>
                  updatePosition(index, { type: e.target.value as PositionType })
                }
              >
                {positionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {position.type === 'custom' && (
                <Input
                  placeholder="Description de la position personnalisée"
                  value={position.customDescription || ''}
                  onChange={(e) =>
                    updatePosition(index, { customDescription: e.target.value })
                  }
                />
              )}
            </div>
          </div>
        ))}

        {positions.length < nombreEmplacements && (
          <Button type="button" variant="outline" onClick={addPosition}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une position
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

