import { pipeline } from '@huggingface/transformers';
async function test() {
  try {
    const generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', { dtype: 'q4', device: 'wasm' });
    console.log("Success with Qwen q4 wasm");
  } catch(e) { console.error("Error Qwen q4:", e.message); }
}
test();
