export interface LlmClient {
  // Returns raw text; caller parses JSON. Provider-swappable.
  complete(prompt: string): Promise<string>;
}

export function getLlmClient(): LlmClient {
  if (!hasLlmKey()) {
    throw new Error('Granite disabled (set VITE_GRANITE_ENABLED=true)');
  }
  return {
    async complete(prompt: string): Promise<string> {
      const res = await fetch('/api/granite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Granite proxy ${res.status}: ${detail.slice(0, 200)}`);
      }
      const data = (await res.json()) as { text?: string };
      const text = data.text?.trim();
      if (!text) throw new Error('Empty LLM response');
      return text;
    },
  };
}

export function hasLlmKey(): boolean {
  return import.meta.env.VITE_GRANITE_ENABLED === 'true';
}
