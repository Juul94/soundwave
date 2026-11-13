// Free, in-browser genre guess: two small MusiCNN models (Essentia, MTG-UPF) listen to 15 s of the song.
// Load with a dynamic import; nothing is sent to a server.
import type { Genre } from "@/types";

const MODELS = [
  { url: "/models/genre/dortmund/model.json", labels: ["Alternative", "Blues", "Electronic", "Country", "R&B", "Jazz", "Pop", "Hip-Hop", "Rock"] },
  { url: "/models/genre/tzanetakis/model.json", labels: ["Blues", "Classical", "Country", "Disco", "Hip-Hop", "Jazz", "Metal", "Pop", "Reggae", "Rock"] },
];

// Other names an existing genre might use for each suggestion.
const ALIASES: Record<string, string[]> = {
  "Hip-Hop": ["hiphop", "rap", "trap"],
  "R&B": ["rnb", "randb", "soul", "funk", "rhythmandblues"],
  Electronic: ["electronica", "edm", "electro", "dance", "house", "techno"],
  Country: ["folk", "americana", "folkcountry"],
  Metal: ["heavymetal"],
  Classical: ["orchestral"],
  Alternative: ["indie", "alt", "altrock", "indierock"],
  Disco: ["dance", "funk"],
};

const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

export function matchGenre(name: string, genres: Genre[]) {
  const keys = [name, ...(ALIASES[name] ?? [])].map(norm);
  for (const k of keys) {
    const g = genres.find((x) => norm(x.name) === k || norm(x.slug) === k);
    if (g) return g;
  }
  return undefined;
}

// Essentia.js (AGPL-3.0) is served unmodified from /vendor/essentia; bundlers can't handle its WebAssembly build.
type MusiCNNInput = { melSpectrum: number[][] };
type Extractor = { computeFrameWise(signal: Float32Array, hopSize?: number): MusiCNNInput };
type MusiCNN = { initialize(): Promise<void>; predict(input: MusiCNNInput, zeroPadding?: boolean): Promise<number[][]> };
type EssentiaModelModule = {
  EssentiaTFInputExtractor: new (wasm: unknown, type: "musicnn") => Extractor;
  TensorflowMusiCNN: new (tf: unknown, url: string) => MusiCNN;
};
const runtimeImport = <T,>(url: string) => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url) as Promise<T>;

type Loaded = { extractor: Extractor; models: MusiCNN[] };
let loading: Promise<Loaded> | null = null;

function load() {
  loading ??= (async () => {
    const [tf, { EssentiaWASM }, { EssentiaTFInputExtractor, TensorflowMusiCNN }] = await Promise.all([
      import("@tensorflow/tfjs"),
      runtimeImport<{ EssentiaWASM: { EssentiaJS?: unknown } }>("/vendor/essentia/essentia-wasm.es.js"),
      runtimeImport<EssentiaModelModule>("/vendor/essentia/essentia.js-model.es.js"),
    ]);
    await tf.setBackend("webgl").catch(() => false); // GPU is ~50x faster than the CPU fallback
    await tf.ready();
    // The WebAssembly runtime finishes starting asynchronously in browsers.
    for (let i = 0; typeof EssentiaWASM.EssentiaJS !== "function"; i++) {
      if (i > 200) throw new Error("Audio analysis did not start");
      await new Promise((r) => setTimeout(r, 50));
    }
    const models = MODELS.map((m) => new TensorflowMusiCNN(tf, m.url));
    await Promise.all(models.map((m) => m.initialize()));
    return { extractor: new EssentiaTFInputExtractor(EssentiaWASM, "musicnn"), models };
  })();
  loading.catch(() => (loading = null));
  return loading;
}

/** Mono 16 kHz clip of up to 15 s from the middle of the song. */
async function clip(file: File) {
  const decoded = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(await file.arrayBuffer());
  const secs = Math.min(15, decoded.duration);
  const off = new OfflineAudioContext(1, Math.max(1, Math.floor(secs * 16000)), 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start(0, Math.max(0, decoded.duration / 2 - secs / 2), secs);
  return (await off.startRendering()).getChannelData(0);
}

/** Genre names ordered by how well they fit, with a 0–1 score. */
export async function suggestGenres(file: File) {
  const [{ extractor, models }, signal] = await Promise.all([load(), clip(file)]);
  const features = extractor.computeFrameWise(signal, 256);
  const totals = new Map<string, number[]>();
  for (const [i, model] of models.entries()) {
    const patches = await model.predict(features, true);
    MODELS[i].labels.forEach((label, c) => {
      const avg = patches.reduce((s, p) => s + p[c], 0) / patches.length;
      totals.set(label, [...(totals.get(label) ?? []), avg]);
    });
  }
  // A genre only one model knows (e.g. Reggae) gets less weight than one both models agree on.
  return [...totals]
    .map(([name, v]) => ({ name, score: (v.reduce((a, b) => a + b, 0) / v.length) * (v.length === models.length ? 1 : 0.75) }))
    .sort((a, b) => b.score - a.score);
}
