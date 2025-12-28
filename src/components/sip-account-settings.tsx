import { useState, useEffect } from 'react'
import type { SipAccount } from '@/App'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

interface SipAccountSettingsProps {
  onSave: (account: SipAccount) => void
  accountToEdit?: SipAccount
}

export function SipAccountSettings({ onSave, accountToEdit }: SipAccountSettingsProps) {
  const [account, setAccount] = useState<SipAccount>({
    id: '',
    name: '',
    domain: '',
    username: '',
    password: '',
    wsServer: 'wss://sip.example.com:8089/ws'
  })
  const [jsonInput, setJsonInput] = useState('')
  const [jsonError, setJsonError] = useState('')

  useEffect(() => {
    if (accountToEdit) {
      setAccount(accountToEdit)
    } else {
      setAccount({
        id: crypto.randomUUID(),
        name: '',
        domain: '',
        username: '',
        password: '',
        wsServer: 'wss://sip.example.com:8089/ws'
      })
    }
    setJsonInput('')
    setJsonError('')
  }, [accountToEdit])

  const handleSave = () => {
    if (!account.name || !account.domain || !account.username || !account.password) {
      alert('Please fill in all required fields')
      return
    }
    
    onSave(account)
  }

  const handlePasteJson = () => {
    try {
      setJsonError('')
      const parsed = JSON.parse(jsonInput)
      
      if (!parsed.name || !parsed.domain || !parsed.username || !parsed.password) {
        setJsonError('JSON must contain: name, domain, username, password')
        return
      }

      const newAccount: SipAccount = {
        id: parsed.id || crypto.randomUUID(),
        name: parsed.name,
        domain: parsed.domain,
        username: parsed.username,
        password: parsed.password,
        wsServer: parsed.wsServer || 'wss://sip.example.com:8089/ws'
      }

      setAccount(newAccount)
      setJsonInput('')
    } catch {
      setJsonError('Invalid JSON format')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{accountToEdit ? 'Edit Account' : 'Add SIP Account'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* JSON Import Section */}
        <div className="p-3 bg-muted rounded-md space-y-2">
          <Label htmlFor="jsonInput" className="text-xs font-semibold">Import from JSON</Label>
          <Textarea
            id="jsonInput"
            placeholder='Paste account JSON (e.g., {"name":"Office","domain":"sip.com","username":"user","password":"pass"})'
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value)
              setJsonError('')
            }}
            className="text-xs font-mono min-h-20"
          />
          {jsonError && (
            <p className="text-xs text-destructive">{jsonError}</p>
          )}
          {jsonInput && (
            <Button 
              onClick={handlePasteJson}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Load JSON
            </Button>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="name">Account Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Office, Personal, Support"
            value={account.name}
            onChange={(e) => setAccount(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain">Domain *</Label>
          <Input
            id="domain"
            placeholder="sip.example.com"
            value={account.domain}
            onChange={(e) => setAccount(prev => ({ ...prev, domain: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            placeholder="user@example.com"
            value={account.username}
            onChange={(e) => setAccount(prev => ({ ...prev, username: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            placeholder="Your SIP password"
            value={account.password}
            onChange={(e) => setAccount(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label htmlFor="wsServer">WebSocket Server</Label>
          <Input
            id="wsServer"
            placeholder="wss://sip.example.com:8089/ws"
            value={account.wsServer}
            onChange={(e) => setAccount(prev => ({ ...prev, wsServer: e.target.value }))}
          />
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            {accountToEdit ? 'Update Account' : 'Add Account'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
