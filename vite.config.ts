import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import type { Plugin } from 'vite';
import type { IncomingMessage } from 'http';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadEnv({ path: path.resolve(__dirname, '.env.local') });
loadEnv({ path: path.resolve(__dirname, '.env') });

const IAM_URL = 'https://iam.cloud.ibm.com/identity/token';
const TOKEN_TTL_MS = 50 * 60 * 1000;

type TokenCache = { value: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function getIamToken(apiKey: string): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }
  const body = new URLSearchParams({
    grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
    apikey: apiKey,
  });
  const res = await fetch(IAM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`IAM token ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('IAM response missing access_token');
  const ttlMs = Math.min(
    TOKEN_TTL_MS,
    Math.max(60_000, ((data.expires_in ?? 3600) - 120) * 1000),
  );
  tokenCache = { value: data.access_token, expiresAt: Date.now() + ttlMs };
  return data.access_token;
}

async function logAvailableModels(baseUrl: string, token: string): Promise<void> {
  try {
    const url = `${baseUrl}/ml/v1/foundation_model_specs?version=2024-05-01&limit=200`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error('[granite] foundation_model_specs failed', res.status);
      return;
    }
    const data = (await res.json()) as { resources?: { model_id?: string }[] };
    const ids = (data.resources ?? [])
      .map((r) => r.model_id)
      .filter((id): id is string => Boolean(id));
    const granite = ids.filter((id) => /granite/i.test(id));
    console.error(
      '[granite] model not found — available granite model_ids:',
      granite.length ? granite : ids.slice(0, 40),
    );
  } catch (err) {
    console.error('[granite] failed to list foundation_model_specs', err);
  }
}

function graniteProxyPlugin(): Plugin {
  return {
    name: 'helm-granite-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/api/granite' || req.method !== 'POST') {
          next();
          return;
        }

        const apiKey = process.env.WATSONX_API_KEY;
        const projectId = process.env.WATSONX_PROJECT_ID;
        const baseUrl = (process.env.WATSONX_URL ?? 'https://us-south.ml.cloud.ibm.com').replace(
          /\/$/,
          '',
        );
        const modelId = process.env.WATSONX_MODEL_ID ?? 'ibm/granite-4-h-small';

        try {
          if (!apiKey || !projectId) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing WATSONX_API_KEY or WATSONX_PROJECT_ID' }));
            return;
          }

          const raw = await readBody(req);
          const parsed = JSON.parse(raw || '{}') as { prompt?: string };
          const prompt = parsed.prompt?.trim();
          if (!prompt) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing prompt' }));
            return;
          }

          const token = await getIamToken(apiKey);
          // Granite 4 H Small returns empty text on deprecated text/generation;
          // watsonx instructs using text/chat instead.
          const genUrl = `${baseUrl}/ml/v1/text/chat?version=2024-05-01`;
          const upstream = await fetch(genUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              model_id: modelId,
              project_id: projectId,
              messages: [{ role: 'user', content: prompt }],
              parameters: {
                max_new_tokens: 4096,
                temperature: 0.2,
                repetition_penalty: 1.05,
              },
            }),
          });

          const upstreamText = await upstream.text();
          if (!upstream.ok) {
            if (upstream.status === 404 || /model.?not.?found|does not exist/i.test(upstreamText)) {
              await logAvailableModels(baseUrl, token);
            }
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: `watsonx chat ${upstream.status}`,
                detail: upstreamText.slice(0, 500),
              }),
            );
            return;
          }

          const data = JSON.parse(upstreamText) as {
            results?: { generated_text?: string }[];
            choices?: { message?: { content?: string | { text?: string }[] } }[];
          };
          const choiceContent = data.choices?.[0]?.message?.content;
          const fromChoice =
            typeof choiceContent === 'string'
              ? choiceContent
              : Array.isArray(choiceContent)
                ? choiceContent.map((c) => (typeof c === 'string' ? c : c.text ?? '')).join('')
                : '';
          const text = (fromChoice || data.results?.[0]?.generated_text || '').trim();
          if (!text) {
            console.error('[granite] empty chat content; upstream=', upstreamText.slice(0, 1000));
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'Empty chat content',
                detail: upstreamText.slice(0, 800),
              }),
            );
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ text }));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Granite proxy failed';
          console.error('[granite]', message);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), graniteProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
