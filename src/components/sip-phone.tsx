import { useState, useEffect, useRef } from 'react'
import type { SipAccount } from '@/App'
import { sipService } from '@/lib/sip-service'
import { playDTMFTone } from '@/lib/dtmf-audio'
import { playRingingSound, stopRingingSound } from '@/lib/ringing-audio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react'

interface CallLog {
  id: string
  type: 'incoming' | 'outgoing'
  number: string
  timestamp: Date
  duration: number // in seconds
}

interface SipPhoneProps {
  account: SipAccount | null
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function SipPhone({ account }: SipPhoneProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [isCallingOut, setIsCallingOut] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [targetNumber, setTargetNumber] = useState('')
  const [callStatus, setCallStatus] = useState('Not connected')
  const [registrationStatus, setRegistrationStatus] = useState('Not registered')
  const [incomingCall, setIncomingCall] = useState<{ session: any; caller: string } | null>(null)
  const [showCallConfirm, setShowCallConfirm] = useState(false)
  const [confirmCallNumber, setConfirmCallNumber] = useState('')
  const [callDuration, setCallDuration] = useState(0)
  const [callHistoryMap, setCallHistoryMap] = useState<Record<string, CallLog[]>>(() => {
    try {
      const saved = localStorage.getItem('sip-call-history')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert timestamp strings back to Date objects
        const converted: Record<string, CallLog[]> = {}
        for (const [key, logs] of Object.entries(parsed)) {
          converted[key] = (logs as any[]).map(log => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }))
        }
        return converted
      }
    } catch (e) {
      console.error('Failed to load call history:', e)
    }
    return {}
  })
  
  // Use refs to track current call state (not closures from event listeners)
  const currentCallStartRef = useRef<Date | null>(null)
  const currentCallNumberRef = useRef<string>('')
  const currentCallTypeRef = useRef<'incoming' | 'outgoing'>('outgoing')
  
  // Use ref to track if we've initiated connection for this account
  const connectedAccountRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)

  // Get a stable account identifier
  const accountKey = account ? `${account.username}@${account.domain}` : null

  // Save call history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('sip-call-history', JSON.stringify(callHistoryMap))
    } catch (e) {
      console.error('Failed to save call history:', e)
    }
  }, [callHistoryMap])

  // Timer for call duration
  useEffect(() => {
    if (!isInCall) {
      setCallDuration(0)
      return
    }

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isInCall])

  useEffect(() => {
    isMountedRef.current = true
    
    const onRegistration = (data: any) => {
      if (!isMountedRef.current) return
      setRegistrationStatus(data.message)
      setIsRegistered(data.status === 'registered')
    }

    const onCallState = (data: any) => {
      if (!isMountedRef.current) return
      setCallStatus(data.message)
      if (data.status === 'calling') {
        setIsCallingOut(true)
        // Set start time when dialing begins (for outgoing calls)
        if (!currentCallStartRef.current) {
          currentCallStartRef.current = new Date()
        }
      } else if (data.status === 'answered') {
        setIsInCall(true)
        setIsCallingOut(false)
        // If not already set (incoming call answered), set it now
        if (!currentCallStartRef.current) {
          currentCallStartRef.current = new Date()
        }
      }
    }

    const onCallEnded = (data: any) => {
      if (!isMountedRef.current) return
      stopRingingSound()
      setCallStatus(data.message)
      setIsInCall(false)
      setIsCallingOut(false)
      setIncomingCall(null)
      setIsMuted(false)
      
      // Log the call to history
      console.log('onCallEnded:', { 
        callStart: currentCallStartRef.current, 
        callNumber: currentCallNumberRef.current, 
        callType: currentCallTypeRef.current, 
        accountKey 
      })
      if (currentCallStartRef.current && currentCallNumberRef.current && accountKey) {
        const duration = Math.round((new Date().getTime() - currentCallStartRef.current.getTime()) / 1000)
        const newLog: CallLog = {
          id: Date.now().toString(),
          type: currentCallTypeRef.current,
          number: currentCallNumberRef.current,
          timestamp: currentCallStartRef.current,
          duration
        }
        console.log('Adding to history:', newLog)
        setCallHistoryMap(prev => {
          const updated = {
            ...prev,
            [accountKey]: [newLog, ...(prev[accountKey] || [])].slice(0, 10)
          }
          console.log('Updated history map:', updated)
          return updated
        })
      }
      currentCallStartRef.current = null
      currentCallNumberRef.current = ''
    }

    const onIncomingCall = (data: any) => {
      if (!isMountedRef.current) return
      setIncomingCall(data)
      setCallStatus(`Incoming call from ${data.caller}`)
      currentCallNumberRef.current = data.caller
      currentCallTypeRef.current = 'incoming'
      currentCallStartRef.current = new Date() // Log start time for incoming calls
      playRingingSound() // Play ringing sound effect
    }

    // Setup SIP service event listeners
    sipService.addEventListener('registration', onRegistration)
    sipService.addEventListener('callState', onCallState)
    sipService.addEventListener('callEnded', onCallEnded)
    sipService.addEventListener('incomingCall', onIncomingCall)

    console.log('SipPhone: Effect running', { 
      accountKey,
      connectedAccount: connectedAccountRef.current,
      isRegistered: sipService.isRegistered(), 
      isConnecting: sipService.isConnecting 
    })

    // Only connect if:
    // 1. We have an account
    // 2. We haven't already connected for this account
    // 3. The service isn't already registered or connecting
    if (account && accountKey && connectedAccountRef.current !== accountKey) {
      // If we had a different account before, disconnect first
      if (connectedAccountRef.current !== null) {
        console.log('SipPhone: Account changed, disconnecting previous')
        sipService.disconnect()
      }
      
      console.log('SipPhone: Initiating connection for', accountKey)
      connectedAccountRef.current = accountKey
      
      sipService.connect(account).catch((error: any) => {
        if (!isMountedRef.current) return
        console.error('Failed to connect to SIP server:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setRegistrationStatus(`Connection failed: ${errorMessage}`)
        // Reset so user can retry
        connectedAccountRef.current = null
      })
    }

    return () => {
      console.log('SipPhone: Cleaning up listeners')
      isMountedRef.current = false
      stopRingingSound()
      sipService.removeEventListener('registration', onRegistration)
      sipService.removeEventListener('callState', onCallState)
      sipService.removeEventListener('callEnded', onCallEnded)
      sipService.removeEventListener('incomingCall', onIncomingCall)
      // Don't disconnect or reset connectedAccountRef here
      // This allows the connection to persist through Strict Mode re-renders
    }
  }, [account, accountKey])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>SIP Phone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Registration Status */}
         <div className="flex items-center justify-between">
           <span className="text-sm font-medium">Registration:</span>
           <Badge 
             variant={isRegistered ? "default" : "secondary"}
             className={isRegistered ? "bg-green-600 hover:bg-green-700" : ""}
           >
             {registrationStatus}
           </Badge>
         </div>

        {/* Account Info */}
        {account && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">{account.name}</div>
            <div>Domain: {account.domain}</div>
            <div>Username: {account.username}</div>
            <div>Server: {account.wsServer}</div>
          </div>
        )}

        <Separator />

        {/* Call Controls */}
        <div className="space-y-4">
          {/* Number Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter phone number or SIP URI"
              value={targetNumber}
              onChange={(e) => setTargetNumber(e.target.value)}
              disabled={isInCall}
            />
          </div>



          {/* Call Actions */}
          <div className="flex gap-2 justify-center">
              {!isInCall && !isCallingOut ? (
                <Button 
                  size="lg" 
                  onClick={async () => {
                    try {
                      currentCallNumberRef.current = targetNumber
                      currentCallTypeRef.current = 'outgoing'
                      await sipService.makeCall(targetNumber)
                    } catch (error) {
                      console.error('Failed to make call:', error)
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                      setCallStatus(`Failed to call: ${errorMessage}`)
                    }
                  }}
                  disabled={!isRegistered || !targetNumber}
                  className="flex gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              ) : isCallingOut && !isInCall ? (
                <Button 
                  size="lg" 
                  variant="destructive"
                  onClick={() => sipService.endCall()}
                  className="flex gap-2"
                >
                  <PhoneOff className="h-4 w-4" />
                  Cancel
                </Button>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    variant="destructive"
                    onClick={() => sipService.endCall()}
                    className="flex gap-2"
                  >
                    <PhoneOff className="h-4 w-4" />
                    End Call
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      const newMuteState = !isMuted
                      sipService.muteCall(newMuteState)
                      setIsMuted(newMuteState)
                    }}
                    className="flex gap-2"
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>
        </div>

        {/* Call Status & Duration */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-sm">
            {callStatus}
          </Badge>
          {isInCall && (
            <div className="text-2xl font-mono font-semibold tabular-nums">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {/* Dial Pad (shown when in call) */}
        {isInCall && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Dial Pad</h3>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <Button
                  key={digit}
                  onClick={async () => {
                    await playDTMFTone(digit)
                    sipService.sendDTMF(digit)
                  }}
                  variant="outline"
                  className="h-12 text-lg font-semibold"
                >
                  {digit}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!account && (
          <div className="text-center text-sm text-muted-foreground">
            Configure your SIP account settings to get started
          </div>
        )}

        {/* Call History */}
        {accountKey && callHistoryMap[accountKey]?.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Call History</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {callHistoryMap[accountKey].map((log) => (
                  <button
                    key={log.id}
                    onClick={() => {
                      setConfirmCallNumber(log.number)
                      setShowCallConfirm(true)
                    }}
                    className="w-full text-left flex items-center justify-between text-xs p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant={log.type === 'incoming' ? 'secondary' : 'outline'} className="text-xs">
                        {log.type === 'incoming' ? '↓' : '↑'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{log.number}</div>
                        <div className="text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()} · {log.duration}s
                        </div>
                      </div>
                    </div>
                    <Phone className="h-4 w-4 ml-2 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Incoming Call Dialog */}
        <AlertDialog open={!!incomingCall} onOpenChange={(open) => {
          if (!open) {
            stopRingingSound()
            setIncomingCall(null)
            sipService.endCall()
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Incoming Call</AlertDialogTitle>
              <AlertDialogDescription className="text-lg font-semibold py-4">
                {incomingCall?.caller}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Decline</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    stopRingingSound()
                    await sipService.answerCall()
                    setIncomingCall(null)
                  } catch (error) {
                    console.error('Failed to answer call:', error)
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                    setCallStatus(`Failed to answer: ${errorMessage}`)
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Answer
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm Call Dialog */}
        <AlertDialog open={showCallConfirm} onOpenChange={setShowCallConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Call</AlertDialogTitle>
              <AlertDialogDescription>
                Call {confirmCallNumber}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    currentCallNumberRef.current = confirmCallNumber
                    currentCallTypeRef.current = 'outgoing'
                    setTargetNumber(confirmCallNumber)
                    await sipService.makeCall(confirmCallNumber)
                    setShowCallConfirm(false)
                  } catch (error) {
                    console.error('Failed to make call:', error)
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                    setCallStatus(`Failed to call: ${errorMessage}`)
                  }
                }}
              >
                Call
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
