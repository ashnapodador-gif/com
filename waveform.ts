export async function extractWaveform(file: File): Promise<number[] | undefined> {
  // Decoding large audio files would duplicate their contents in memory.
  if (file.size > 24 * 1024 * 1024) return undefined;
  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const samples = decoded.getChannelData(0);
    const bars = 100;
    const peaks: number[] = [];
    for (let i = 0; i < bars; i++) {
      const start = Math.floor(i * samples.length / bars);
      const end = Math.floor((i + 1) * samples.length / bars);
      let max = 0;
      const stride = Math.max(1, Math.floor((end - start) / 200));
      for (let j = start; j < end; j += stride) max = Math.max(max, Math.abs(samples[j]));
      peaks.push(Math.max(0.08, max));
    }
    return peaks;
  } catch {
    return undefined;
  } finally {
    await context?.close().catch(() => undefined);
  }
}