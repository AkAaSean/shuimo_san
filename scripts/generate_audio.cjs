const fs = require('fs');
const path = require('path');

// Generate PCM WAV file for pentatonic Chinese tunes
function createWavBuffer(tuneType) {
  const sampleRate = 22050;
  const durationSec = 12; // 12 second loop
  const numSamples = sampleRate * durationSec;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Pentatonic scale frequencies: C4, D4, E4, G4, A4, C5, D5, E5
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
  
  // Patterns for different tunes
  let pattern = [0, 2, 3, 4, 3, 2, 0, 4];
  if (tuneType === 'spring') pattern = [0, 1, 2, 4, 5, 4, 2, 1];
  if (tuneType === 'summer') pattern = [2, 4, 5, 7, 5, 4, 2, 0];
  if (tuneType === 'autumn') pattern = [4, 3, 2, 0, 2, 3, 4, 2];
  if (tuneType === 'winter') pattern = [0, 3, 2, 0, 4, 2, 0, 1];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = pattern[Math.floor((t * 2) % pattern.length)];
    const freq = scale[noteIdx];
    
    // Envelope
    const noteTime = (t * 2) % 1;
    const envelope = Math.exp(-noteTime * 2.5);
    
    // Pure tone + harmonic
    const sampleVal = (Math.sin(2 * Math.PI * freq * t) * 0.7 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.3) * envelope * 0.4;
    const intVal = Math.floor(sampleVal * 32767);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, intVal)), 44 + i * 2);
  }

  return buffer;
}

const dir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const tracks = [
  { name: '開局', type: 'opening' },
  { name: '春天', type: 'spring' },
  { name: '夏天', type: 'summer' },
  { name: '秋天', type: 'autumn' },
  { name: '冬天', type: 'winter' },
];

tracks.forEach(track => {
  const buf = createWavBuffer(track.type);
  // Write both mp3 filename (containing valid audio stream readable by browser Audio element) and wav filename
  fs.writeFileSync(path.join(dir, `${track.name}.mp3`), buf);
  fs.writeFileSync(path.join(dir, `${track.name}.wav`), buf);
  // Also write to root /public/
  fs.writeFileSync(path.join(__dirname, `../public/${track.name}.mp3`), buf);
});

console.log('Audio files created successfully in public/audio and public/');
