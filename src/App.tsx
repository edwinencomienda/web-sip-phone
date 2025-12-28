import { useState, useEffect } from 'react'
import { SipAccountSettings } from '@/components/sip-account-settings'
import { SipPhone } from '@/components/sip-phone'
import { AccountSidebar } from '@/components/account-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeProvider } from '@/lib/theme-provider'

export interface SipAccount {
  id: string
  name: string
  domain: string
  username: string
  password: string
  wsServer: string
}

export function App() {
  const [accounts, setAccounts] = useState<SipAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)

  // Load accounts from localStorage on mount
  useEffect(() => {
    const loadAccounts = () => {
      try {
        const savedAccounts = localStorage.getItem('sipAccounts')
        if (savedAccounts) {
          const parsed = JSON.parse(savedAccounts)
          setAccounts(parsed)
          if (parsed.length > 0 && !selectedAccountId) {
            setSelectedAccountId(parsed[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to load accounts:', error)
      }
    }
    loadAccounts()
  }, [])

  const currentAccount = accounts.find(a => a.id === selectedAccountId) || null

  const handleSaveAccount = (account: SipAccount) => {
    const updatedAccounts = editingAccountId
      ? accounts.map(a => a.id === editingAccountId ? account : a)
      : [...accounts, account]
    
    setAccounts(updatedAccounts)
    localStorage.setItem('sipAccounts', JSON.stringify(updatedAccounts))
    setShowSettings(false)
    setEditingAccountId(null)
    
    if (!selectedAccountId && updatedAccounts.length > 0) {
      setSelectedAccountId(updatedAccounts[0].id)
    }
  }

  const handleDeleteAccount = (id: string) => {
    const updatedAccounts = accounts.filter(a => a.id !== id)
    setAccounts(updatedAccounts)
    localStorage.setItem('sipAccounts', JSON.stringify(updatedAccounts))
    
    if (selectedAccountId === id) {
      setSelectedAccountId(updatedAccounts.length > 0 ? updatedAccounts[0].id : null)
    }
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <AccountSidebar
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onAddAccount={() => {
            setEditingAccountId(null)
            setShowSettings(true)
          }}
          onEditAccount={(id) => {
            setEditingAccountId(id)
            setShowSettings(true)
          }}
          onDeleteAccount={handleDeleteAccount}
        />

        {/* Main Content */}
        <div className="flex-1 p-4">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Web SIP Phone</h1>
              <p className="text-muted-foreground">
                Make and receive SIP calls from your browser
              </p>
            </div>

            {/* Main Content */}
            <div className="space-y-4">
              {showSettings ? (
                <SipAccountSettings 
                  onSave={handleSaveAccount}
                  accountToEdit={editingAccountId ? accounts.find(a => a.id === editingAccountId) : undefined}
                />
              ) : currentAccount ? (
                <SipPhone 
                  account={currentAccount} 
                />
              ) : (
                <Card className="w-full max-w-md mx-auto">
                  <CardHeader>
                    <CardTitle>No Account Selected</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-sm text-muted-foreground">
                    <p>Add or select a SIP account from the sidebar to get started.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Info Card */}
            {!showSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">About</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    This Web SIP Phone allows you to make VoIP calls using SIP protocol 
                    directly from your browser.
                  </p>
                  <p>
                    Configure your SIP account settings to get started. Your credentials 
                    are stored locally in your browser.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
