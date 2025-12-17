import { AdminLayout } from '@/components/admin/AdminLayout'
import { TechniqueManager } from '@/components/admin/TechniqueManager'
import { ServicePricingManager } from '@/components/admin/ServicePricingManager'
import { ServiceOdooMappingManager } from '@/components/admin/ServiceOdooMappingManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function TechniquesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Gestion des techniques</h2>
          <p className="text-muted-foreground">Configurez les techniques de marquage et leurs prix</p>
        </div>
        <Tabs defaultValue="pricing" className="w-full">
          <TabsList>
            <TabsTrigger value="pricing">Prix des services</TabsTrigger>
            <TabsTrigger value="options">Options des techniques</TabsTrigger>
            <TabsTrigger value="odoo-mapping">Mapping Odoo</TabsTrigger>
          </TabsList>
          <TabsContent value="pricing">
            <ServicePricingManager />
          </TabsContent>
          <TabsContent value="options">
            <TechniqueManager />
          </TabsContent>
          <TabsContent value="odoo-mapping">
            <ServiceOdooMappingManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}

