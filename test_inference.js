import { pipeline, env } from '@huggingface/transformers';
env.backends.onnx.wasm.numThreads = 4;
async function test() {
  console.log("Loading pipeline...");
  const generator = await pipeline('text-generation', 'Xenova/TinyLlama-1.1B-Chat-v1.0', { device: 'wasm', dtype: 'q8' });
  console.log("Pipeline loaded!");
}
test().catch(console.error);
