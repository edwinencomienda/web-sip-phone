// Play a ringing sound effect from an external audio file

let ringingAudio: HTMLAudioElement | null = null;

const RINGTONE_URL =
  "https://cdn.freesound.org/previews/629/629201_13682949-lq.mp3";

export function playRingingSound(): void {
  try {
    // Create audio element if it doesn't exist
    if (!ringingAudio) {
      ringingAudio = new Audio(RINGTONE_URL);
      ringingAudio.loop = true;
      ringingAudio.volume = 0.5;
    }

    // Play the audio
    const playPromise = ringingAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.error("Failed to play ringing sound:", error);
      });
    }
  } catch (error) {
    console.error("Failed to play ringing sound:", error);
  }
}

export function stopRingingSound(): void {
  try {
    if (ringingAudio) {
      ringingAudio.pause();
      ringingAudio.currentTime = 0;
    }
  } catch (error) {
    console.error("Failed to stop ringing sound:", error);
  }
}
