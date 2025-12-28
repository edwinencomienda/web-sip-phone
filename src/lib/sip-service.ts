interface SipAccount {
  domain: string
  username: string
  password: string
  wsServer: string
}

export class SipService {
  private ua: any = null
  private currentSession: any = null
  private eventHandlers: Map<string, Function[]> = new Map()
  private JsSIP: any = null
  private _isConnecting: boolean = false
  private remoteAudio: HTMLAudioElement | null = null

  constructor() {
    this.setupEventHandlers()
    this.setupRemoteAudio()
  }

  private setupRemoteAudio() {
    // Create a persistent audio element for remote audio
    this.remoteAudio = new Audio()
    this.remoteAudio.autoplay = true
    this.remoteAudio.volume = 1.0
    
    // Debug events
    this.remoteAudio.onplay = () => console.log('JsSIP: Remote audio playing')
    this.remoteAudio.onpause = () => console.log('JsSIP: Remote audio paused')
    this.remoteAudio.onerror = (e) => console.error('JsSIP: Remote audio error', e)
    this.remoteAudio.onloadedmetadata = () => console.log('JsSIP: Remote audio metadata loaded')
    
    // Some browsers require the element to be in the DOM
    this.remoteAudio.style.display = 'none'
    document.body.appendChild(this.remoteAudio)
  }

  private async loadJsSIP() {
    if (!this.JsSIP) {
      const module = await import('jssip')
      this.JsSIP = module.default || module
    }
    return this.JsSIP
  }

  private setupEventHandlers() {
    this.eventHandlers.set('registration', [])
    this.eventHandlers.set('incomingCall', [])
    this.eventHandlers.set('callState', [])
    this.eventHandlers.set('callEnded', [])
  }

  public addEventListener(event: string, callback: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(callback)
  }

  public removeEventListener(event: string, callback: Function) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)!
      this.eventHandlers.set(event, handlers.filter(h => h !== callback))
    }
  }

  private emit(event: string, data?: any) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => handler(data))
  }

  public async connect(account: SipAccount): Promise<void> {
    if (this._isConnecting) {
      console.log('JsSIP: Already connecting, skipping')
      return
    }

    if (this.ua && this.ua.isRegistered()) {
      console.log('JsSIP: Already registered, skipping')
      return
    }

    this._isConnecting = true

    if (this.ua) {
      console.log('JsSIP: Stopping existing UA before new connection')
      this.ua.stop()
      this.ua = null
    }

    try {
      const JsSIP = await this.loadJsSIP()
      
      return new Promise((resolve, reject) => {
        try {
          const socket = new JsSIP.WebSocketInterface(account.wsServer)
          const configuration = {
            sockets: [socket],
            uri: `sip:${account.username}@${account.domain}`,
            password: account.password,
            display_name: account.username,
            session_timers: false,
            use_preloaded_route: false
          }

          this.ua = new JsSIP.UA(configuration)

          this.ua.on('connecting', () => {
            console.log('JsSIP: Connecting...')
            this.emit('registration', { status: 'connecting', message: 'Connecting...' })
          })

          this.ua.on('connected', () => {
            console.log('JsSIP: Connected')
            this.emit('registration', { status: 'connected', message: 'Connected' })
          })

          this.ua.on('disconnected', () => {
            console.log('JsSIP: Disconnected')
            this._isConnecting = false
            this.emit('registration', { status: 'disconnected', message: 'Disconnected' })
          })

          this.ua.on('registered', () => {
            console.log('JsSIP: Registered')
            this._isConnecting = false
            this.emit('registration', { status: 'registered', message: 'Registered' })
            resolve()
          })

          this.ua.on('unregistered', () => {
            console.log('JsSIP: Unregistered')
            this._isConnecting = false
            this.emit('registration', { status: 'unregistered', message: 'Unregistered' })
          })

          this.ua.on('registrationFailed', (e: any) => {
            console.log('JsSIP: Registration Failed', e.cause)
            this._isConnecting = false
            this.emit('registration', { 
              status: 'failed', 
              message: `Registration failed: ${e.cause}` 
            })
            reject(new Error(`Registration failed: ${e.cause}`))
          })

          this.ua.on('newRTCSession', (e: any) => {
            this.handleNewSession(e)
          })

          this.ua.start()
        } catch (error) {
          this._isConnecting = false
          reject(error)
        }
      })
    } catch (error) {
      this._isConnecting = false
      throw error
    }
  }

  private handleNewSession(e: any) {
    const session = e.session
    this.currentSession = session

    if (e.originator === 'remote') {
      this.emit('incomingCall', { session, caller: e.request.from.display_name || e.request.from.uri.user })
    }

    // Handle remote stream - this is where we get the incoming audio
    session.on('peerconnection', (data: any) => {
      console.log('JsSIP: PeerConnection created')
      const peerconnection = data.peerconnection

      peerconnection.ontrack = (event: RTCTrackEvent) => {
        console.log('JsSIP: Remote track received', event.track.kind)
        if (event.track.kind === 'audio' && this.remoteAudio) {
          // Create a new MediaStream with the remote audio track
          const remoteStream = new MediaStream([event.track])
          this.remoteAudio.srcObject = remoteStream
          this.remoteAudio.play().catch((err: Error) => {
            console.error('Failed to play remote audio:', err)
          })
        }
      }

      // Also handle the older onaddstream for compatibility
      peerconnection.onaddstream = (event: any) => {
        console.log('JsSIP: Remote stream added (legacy)')
        if (this.remoteAudio) {
          this.remoteAudio.srcObject = event.stream
          this.remoteAudio.play().catch((err: Error) => {
            console.error('Failed to play remote audio:', err)
          })
        }
      }
    })

    session.on('accepted', () => {
      console.log('JsSIP: Call accepted')
      this.tryPlayRemoteAudio(session)
      this.emit('callState', { status: 'answered', message: 'Call answered' })
    })

    session.on('confirmed', () => {
      console.log('JsSIP: Call confirmed')
      this.tryPlayRemoteAudio(session)
      this.emit('callState', { status: 'in-call', message: 'In call' })
    })

    session.on('ended', () => {
      this.stopRemoteAudio()
      this.emit('callEnded', { status: 'ended', message: 'Call ended' })
      this.currentSession = null
    })

    session.on('failed', (data: any) => {
      console.log('JsSIP: Call failed', data.cause)
      this.stopRemoteAudio()
      this.emit('callEnded', { status: 'failed', message: `Call failed: ${data.cause}` })
      this.currentSession = null
    })

    session.on('progress', () => {
      this.emit('callState', { status: 'ringing', message: 'Ringing...' })
    })
  }

  private tryPlayRemoteAudio(session: any) {
    const peerconnection = session.connection
    if (!peerconnection || !this.remoteAudio) {
      console.log('JsSIP: No peerconnection or audio element')
      return
    }

    // Modern way: get receivers
    const receivers = peerconnection.getReceivers()
    console.log('JsSIP: Found receivers:', receivers.length)
    
    if (receivers.length > 0) {
      const audioTracks = receivers
        .filter((r: RTCRtpReceiver) => r.track && r.track.kind === 'audio')
        .map((r: RTCRtpReceiver) => r.track)
      
      console.log('JsSIP: Found audio tracks:', audioTracks.length)
      
      if (audioTracks.length > 0) {
        console.log('JsSIP: Playing remote audio from receivers')
        const remoteStream = new MediaStream(audioTracks)
        this.remoteAudio.srcObject = remoteStream
        this.remoteAudio.play().catch((err: Error) => {
          console.error('Failed to play remote audio:', err)
        })
        return
      }
    }
    
    // Fallback: try getRemoteStreams (deprecated but still works in some browsers)
    const remoteStreams = peerconnection.getRemoteStreams?.()
    if (remoteStreams && remoteStreams.length > 0) {
      console.log('JsSIP: Playing remote audio from getRemoteStreams')
      this.remoteAudio.srcObject = remoteStreams[0]
      this.remoteAudio.play().catch((err: Error) => {
        console.error('Failed to play remote audio:', err)
      })
    }
  }

  private stopRemoteAudio() {
    if (this.remoteAudio) {
      this.remoteAudio.pause()
      this.remoteAudio.srcObject = null
    }
  }

  public async makeCall(target: string): Promise<void> {
    if (!this.ua || !this.ua.isRegistered()) {
      throw new Error('SIP client not registered')
    }

    if (this.currentSession) {
      throw new Error('Already in a call')
    }

    const options = {
      mediaConstraints: { audio: true, video: false }
    }

    try {
      this.currentSession = this.ua.call(target, options)
      this.emit('callState', { status: 'calling', message: `Calling ${target}...` })
    } catch (error) {
      throw error
    }
  }

  public async answerCall(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session')
    }

    const options = {
      mediaConstraints: { audio: true, video: false }
    }

    this.currentSession.answer(options)
    this.emit('callState', { status: 'answered', message: 'Call answered' })
  }

  public endCall(): void {
    this.stopRemoteAudio()
    if (this.currentSession) {
      this.currentSession.terminate()
    }
  }

  public muteCall(mute: boolean): void {
    if (this.currentSession) {
      this.currentSession.mute({ audio: mute })
    }
  }

  public sendDTMF(tone: string): void {
    if (this.currentSession) {
      try {
        this.currentSession.sendDTMF(tone)
        console.log(`JsSIP: Sent DTMF tone: ${tone}`)
      } catch (error) {
        console.error(`Failed to send DTMF tone ${tone}:`, error)
      }
    }
  }

  public get isConnecting(): boolean {
    return this._isConnecting
  }

  public isInCall(): boolean {
    return this.currentSession !== null
  }

  public isRegistered(): boolean {
    return this.ua ? this.ua.isRegistered() : false
  }

  public disconnect(): void {
    this.stopRemoteAudio()
    if (this.ua) {
      this.ua.stop()
      this.ua = null
    }
    this.currentSession = null
    this._isConnecting = false
  }
}

export const sipService = new SipService()