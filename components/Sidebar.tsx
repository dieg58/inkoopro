'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  FileText, 
  Package, 
  Settings, 
  LogOut, 
  HelpCircle,
  Receipt,
  FolderKanban
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  client?: any
  onLogout?: () => void
}

export function Sidebar({ client, onLogout }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const [helpOpen, setHelpOpen] = useState(false)

  const menuItems = [
    {
      id: 'quote',
      label: 'Créer un devis',
      icon: FileText,
      path: `/${locale}/quote`,
    },
    {
      id: 'quotes',
      label: 'Mes devis',
      icon: FolderKanban,
      path: `/${locale}/quotes`,
    },
    {
      id: 'orders',
      label: 'Mes commandes',
      icon: Package,
      path: `/${locale}/orders`,
    },
    {
      id: 'invoices',
      label: 'Mes factures',
      icon: Receipt,
      path: `/${locale}/invoices`,
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      path: `/${locale}/settings`,
    },
  ]

  const handleHelp = () => {
    setHelpOpen(true)
  }

  return (
    <div className="flex flex-col h-screen w-64 bg-card border-r border-border">
      {/* Logo / Header */}
      <div className="p-6 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">INKOO PRO</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Sustainable Custom Merch</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path || pathname?.startsWith(item.path)
          
          return (
            <Button
              key={item.id}
              variant={isActive ? 'default' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3',
                isActive && 'bg-primary text-primary-foreground'
              )}
              onClick={() => router.push(item.path)}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Button>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      {client && (
        <div className="p-4 border-t border-border space-y-2">
          <div className="px-3 py-2 text-sm">
            <p className="font-medium text-foreground">{client.name}</p>
            <p className="text-xs text-muted-foreground truncate">{client.email}</p>
          </div>
          {onLogout && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </Button>
          )}
        </div>
      )}

      {/* Help Button - Fixed at bottom */}
      <div className="p-4 border-t border-border bg-background-subtle">
        <Button
          variant="default"
          className="w-full gap-3 bg-primary hover:bg-[#5A6658] shadow-sm"
          onClick={handleHelp}
        >
          <HelpCircle className="h-5 w-5" />
          <span>Aide</span>
        </Button>
      </div>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Besoin d'aide ?</DialogTitle>
            <DialogDescription>
              Nous sommes là pour vous accompagner dans la création de votre devis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-semibold mb-2">Contactez-nous</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Pour toute question ou assistance, n'hésitez pas à nous contacter :
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('mailto:hello@inkoo.eu', '_blank')}
                >
                  📧 hello@inkoo.eu
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('https://inkoo.eu/contact', '_blank')}
                >
                  🌐 Visiter inkoo.eu
                </Button>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <h4 className="font-semibold mb-2">Guide rapide</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Sélectionnez vos produits et quantités</li>
                <li>Configurez les personnalisations (technique, position, fichiers)</li>
                <li>Choisissez la livraison et les options</li>
                <li>Validez votre devis pour l'envoyer</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

