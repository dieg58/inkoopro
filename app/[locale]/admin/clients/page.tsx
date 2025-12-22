'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
  street?: string
  city?: string
  zip?: string
  country?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  approvedAt?: string
}

export default function ClientsPage() {
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pending')

  const loadClients = async (status: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/clients/pending?status=${status}`)
      const data = await response.json()

      if (data.success) {
        setClients(data.clients)
      } else {
        toast({
          title: 'Erreur',
          description: data.error || 'Impossible de charger les clients',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors du chargement des clients',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients(activeTab)
  }, [activeTab])

  const handleApprove = async (clientId: string) => {
    try {
      setProcessing(clientId)
      const response = await fetch(`/api/admin/clients/${clientId}/approve`, {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Client approuvé avec succès',
        })
        loadClients(activeTab)
      } else {
        toast({
          title: 'Erreur',
          description: data.error || 'Impossible d\'approuver le client',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'approbation',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (clientId: string) => {
    try {
      setProcessing(clientId)
      const response = await fetch(`/api/admin/clients/${clientId}/reject`, {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Client rejeté',
        })
        loadClients(activeTab)
      } else {
        toast({
          title: 'Erreur',
          description: data.error || 'Impossible de rejeter le client',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors du rejet',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        )
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approuvé
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeté
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Gestion des clients</h2>
          <p className="text-muted-foreground">Approuvez ou rejetez les demandes d'inscription</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="approved">Approuvés</TabsTrigger>
            <TabsTrigger value="rejected">Rejetés</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : clients.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Aucun client {activeTab === 'pending' ? 'en attente' : activeTab === 'approved' ? 'approuvé' : 'rejeté'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {clients.map((client) => (
                  <Card key={client.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle>{client.name}</CardTitle>
                          <CardDescription>{client.email}</CardDescription>
                        </div>
                        {getStatusBadge(client.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {client.company && (
                          <div>
                            <p className="text-sm font-medium">Entreprise</p>
                            <p className="text-sm text-muted-foreground">{client.company}</p>
                          </div>
                        )}
                        {client.phone && (
                          <div>
                            <p className="text-sm font-medium">Téléphone</p>
                            <p className="text-sm text-muted-foreground">{client.phone}</p>
                          </div>
                        )}
                        {client.street && (
                          <div>
                            <p className="text-sm font-medium">Adresse</p>
                            <p className="text-sm text-muted-foreground">
                              {client.street}
                              {client.city && `, ${client.city}`}
                              {client.zip && ` ${client.zip}`}
                              {client.country && `, ${client.country}`}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">Date d'inscription</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(client.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      {client.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(client.id)}
                            disabled={processing === client.id}
                            size="sm"
                          >
                            {processing === client.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Traitement...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approuver
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleReject(client.id)}
                            disabled={processing === client.id}
                            variant="destructive"
                            size="sm"
                          >
                            {processing === client.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Traitement...
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Rejeter
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}

