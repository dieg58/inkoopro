'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { techniqueConfig } from '@/lib/data'

export function TechniqueManager() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sérigraphie</CardTitle>
          <CardDescription>Configuration des options pour la sérigraphie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre minimum de couleurs</Label>
              <Input
                type="number"
                value={techniqueConfig.serigraphie.minCouleurs}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre maximum de couleurs</Label>
              <Input
                type="number"
                value={techniqueConfig.serigraphie.maxCouleurs}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre minimum d'emplacements</Label>
              <Input
                type="number"
                value={techniqueConfig.serigraphie.minEmplacements}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre maximum d'emplacements</Label>
              <Input
                type="number"
                value={techniqueConfig.serigraphie.maxEmplacements}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Broderie</CardTitle>
          <CardDescription>Configuration des options pour la broderie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre minimum de points</Label>
              <Input
                type="number"
                value={techniqueConfig.broderie.minPoints.toLocaleString()}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre maximum de points</Label>
              <Input
                type="number"
                value={techniqueConfig.broderie.maxPoints.toLocaleString()}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre minimum d'emplacements</Label>
              <Input
                type="number"
                value={techniqueConfig.broderie.minEmplacements}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre maximum d'emplacements</Label>
              <Input
                type="number"
                value={techniqueConfig.broderie.maxEmplacements}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DTF</CardTitle>
          <CardDescription>Configuration des options pour le DTF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre minimum d'emplacements</Label>
              <Input
                type="number"
                value={techniqueConfig.dtf.minEmplacements}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre maximum d'emplacements</Label>
              <Input
                type="number"
                value={techniqueConfig.dtf.maxEmplacements}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

