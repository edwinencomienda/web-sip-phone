import type { SipAccount } from '@/App'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Edit2, Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface AccountSidebarProps {
  accounts: SipAccount[]
  selectedAccountId: string | null
  onSelectAccount: (id: string) => void
  onAddAccount: () => void
  onEditAccount: (id: string) => void
  onDeleteAccount: (id: string) => void
}

export function AccountSidebar({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
}: AccountSidebarProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyConfig = (account: SipAccount, e: React.MouseEvent) => {
    e.stopPropagation()
    const { id, ...configWithoutId } = account
    const config = JSON.stringify(configWithoutId, null, 2)
    navigator.clipboard.writeText(config)
    setCopiedId(account.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 space-y-4">
        <h2 className="font-semibold text-sm">Accounts</h2>
        <Button 
          onClick={onAddAccount}
          size="sm"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      <Separator />

      {/* Accounts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {accounts.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            No accounts yet. Add one to get started.
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                'p-3 rounded-md border transition-colors cursor-pointer group',
                selectedAccountId === account.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-accent hover:text-accent-foreground'
              )}
              onClick={() => onSelectAccount(account.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {account.name}
                  </div>
                  <div className="text-xs truncate opacity-70">
                    {account.username}@{account.domain}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   {copiedId === account.id ? (
                     <div className="flex items-center gap-1 text-xs text-green-600">
                       <Check className="h-3 w-3" />
                       Copied
                     </div>
                   ) : (
                     <Button
                       size="sm"
                       variant="ghost"
                       className="h-7 w-7 p-0"
                       title="Copy config as JSON"
                       onClick={(e) => handleCopyConfig(account, e)}
                     >
                       <Copy className="h-3 w-3" />
                     </Button>
                   )}
                   <Button
                     size="sm"
                     variant="ghost"
                     className="h-7 w-7 p-0"
                     onClick={(e) => {
                       e.stopPropagation()
                       onEditAccount(account.id)
                     }}
                   >
                     <Edit2 className="h-3 w-3" />
                   </Button>
                   <Button
                     size="sm"
                     variant="ghost"
                     className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                     onClick={(e) => {
                       e.stopPropagation()
                       if (confirm(`Delete account ${account.username}?`)) {
                         onDeleteAccount(account.id)
                       }
                     }}
                   >
                     <Trash2 className="h-3 w-3" />
                   </Button>
                 </div>
              </div>
              {selectedAccountId === account.id && (
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <Check className="h-3 w-3" />
                  Active
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
