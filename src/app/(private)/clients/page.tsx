'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getClients, createClient, updateClient, deleteClient } from '@/lib/api'
import type { Client } from '@/types'
import { Plus, Phone, Trash2 } from 'lucide-react'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'name' | 'phone' | null>(null)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [editingName, setEditingName] = useState<Record<string, string>>({})
  const [editingPhone, setEditingPhone] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setIsLoading(true)
      const data = await getClients()
      setClients(data)
      const nameMap: Record<string, string> = {}
      const phoneMap: Record<string, string> = {}
      data.forEach(client => {
        nameMap[client.id] = client.name
        phoneMap[client.id] = client.phone_number || ''
      })
      setEditingName(nameMap)
      setEditingPhone(phoneMap)
    } catch {
      setError('Failed to load clients')
      setTimeout(() => setError(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      setError('Client name is required')
      setTimeout(() => setError(''), 3000)
      return
    }

    try {
      setError('')
      setIsSaving(true)
      const client = await createClient({
        name: newClientName.trim(),
        ...(newClientPhone.trim() && { phone_number: newClientPhone.trim() })
      })
      setClients([...clients, client])
      setEditingName({ ...editingName, [client.id]: client.name })
      setEditingPhone({ ...editingPhone, [client.id]: client.phone_number || '' })
      setNewClientName('')
      setNewClientPhone('')
      setIsAdding(false)
      setSuccess('Client added successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client')
      setTimeout(() => setError(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (clientId: string, field: 'name' | 'phone') => {
    try {
      setError('')
      setIsSaving(true)
      const currentClient = clients.find(c => c.id === clientId)!
      
      if (field === 'name') {
        const trimmedName = editingName[clientId]?.trim() || currentClient.name
        if (trimmedName === '') {
          setError('Client name cannot be empty')
          setTimeout(() => setError(''), 3000)
          return
        }
      }

      const updateData: { name: string; phone_number?: string } = {
        name: field === 'name' 
          ? (editingName[clientId]?.trim() || currentClient.name)
          : currentClient.name,
        ...(field === 'phone' && {
          phone_number: editingPhone[clientId]?.trim() || ''
        })
      }

      const client = await updateClient(clientId, updateData)
      setClients(clients.map(c => c.id === clientId ? client : c))
      setEditingId(null)
      setEditingField(null)
      setEditingName({ ...editingName, [clientId]: client.name })
      setEditingPhone({ ...editingPhone, [clientId]: client.phone_number || '' })
      setSuccess(field === 'name' ? 'Name updated' : 'Phone number updated')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to update ${field}`)
      setTimeout(() => setError(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (clientId: string) => {
    try {
      setError('')
      setDeletingId(clientId)
      await deleteClient(clientId)
      setClients(clients.filter(c => c.id !== clientId))
      setSuccess('Client deleted')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client')
      setTimeout(() => setError(''), 3000)
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 max-w-6xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Clients</h1>
        {!isAdding && clients.length > 0 && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {isAdding && (
        <Card className="mb-4">
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input
                value={newClientName}
                onChange={(e) => {
                  setNewClientName(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    handleAddClient()
                  }
                }}
                placeholder="Enter client name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number (Optional)</Label>
              <Input
                type="tel"
                value={newClientPhone}
                onChange={(e) => {
                  setNewClientPhone(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    handleAddClient()
                  }
                }}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddClient} size="sm" disabled={isSaving}>
                {isSaving ? 'Adding...' : 'Add Client'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false)
                  setNewClientName('')
                  setNewClientPhone('')
                  setError('')
                  setSuccess('')
                }}
                size="sm"
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {clients.length === 0 && !isAdding ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No clients yet.</p>
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Client
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    {editingId === client.id && editingField === 'name' ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName[client.id] || ''}
                          onChange={(e) =>
                            setEditingName({
                              ...editingName,
                              [client.id]: e.target.value
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdate(client.id, 'name')
                            } else if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditingField(null)
                              setEditingName({
                                ...editingName,
                                [client.id]: client.name
                              })
                            }
                          }}
                          placeholder="Client name"
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(client.id, 'name')}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(null)
                            setEditingField(null)
                            setEditingName({
                              ...editingName,
                              [client.id]: client.name
                            })
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <p 
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingId(client.id)
                          setEditingField('name')
                        }}
                      >
                        {client.name}
                      </p>
                    )}
                    
                    {editingId === client.id && editingField === 'phone' ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="tel"
                          value={editingPhone[client.id] || ''}
                          onChange={(e) =>
                            setEditingPhone({
                              ...editingPhone,
                              [client.id]: e.target.value
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdate(client.id, 'phone')
                            } else if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditingField(null)
                              setEditingPhone({
                                ...editingPhone,
                                [client.id]: client.phone_number || ''
                              })
                            }
                          }}
                          placeholder="(555) 123-4567"
                          className="max-w-xs"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(client.id, 'phone')}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(null)
                            setEditingField(null)
                            setEditingPhone({
                              ...editingPhone,
                              [client.id]: client.phone_number || ''
                            })
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {client.phone_number ? (
                          <>
                            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span 
                              className="text-sm text-muted-foreground cursor-pointer hover:underline"
                              onClick={() => {
                                setEditingId(client.id)
                                setEditingField('phone')
                              }}
                            >
                              {client.phone_number}
                            </span>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(client.id)
                              setEditingField('phone')
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Add phone number
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {editingId !== client.id && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(client.id)
                          setEditingField('phone')
                        }}
                      >
                        {client.phone_number ? 'Edit' : 'Add'} Phone
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(client.id)}
                        disabled={deletingId === client.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingId === client.id ? (
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
        </div>
      )}
    </div>
  )
}

