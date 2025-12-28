// DTMF tone frequencies mapping
const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '0': [941, 1336],
  '*': [941, 1209],
  '#': [941, 1477]
}

export function playDTMFTone(digit: string, duration: number = 200): Promise<void> {
  return new Promise((resolve) => {
    try {
      const frequencies = DTMF_FREQUENCIES[digit]
      if (!frequencies) {
        resolve()
        return
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const now = audioContext.currentTime
      const endTime = now + duration / 1000

      // Create oscillators for the two frequencies
      const oscillator1 = audioContext.createOscillator()
      const oscillator2 = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator1.frequency.value = frequencies[0]
      oscillator2.frequency.value = frequencies[1]

      // Set volume to be quiet (don't overwhelm the user)
      gainNode.gain.setValueAtTime(0.1, now)
      gainNode.gain.setValueAtTime(0, endTime)

      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator1.start(now)
      oscillator2.start(now)
      oscillator1.stop(endTime)
      oscillator2.stop(endTime)

      // Resolve after the tone finishes playing
      setTimeout(() => resolve(), duration)
    } catch (error) {
      console.error('Failed to play DTMF tone:', error)
      resolve()
    }
  })
}
