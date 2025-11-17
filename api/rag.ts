import type { VercelRequest, VercelResponse } from '@vercel/node';

const ragBaseUrl = process.env.RAG_SERVICE_URL ?? 'http://localhost:8000';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const response = await fetch(`${ragBaseUrl}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const payload = await response.json();
    res.status(response.status).json(payload);
  } catch (error) {
    res.status(500).json({ error: 'Nie udało się połączyć z rag-service', details: String(error) });
  }
}
