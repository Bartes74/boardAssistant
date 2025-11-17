import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import axios from 'axios';
import { formatISO } from 'date-fns';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const backendUrl = process.env.CORE_SERVICE_URL ?? 'http://localhost:3000';
const mockUserHeader = process.env.INGEST_MOCK_USER ?? '00000000-0000-0000-0000-0000000000cf|ADMIN|admin@example.com';

async function main() {
  const filePath = resolve(process.cwd(), 'data/sources/demo-rss.json');
  const payload = JSON.parse(readFileSync(filePath, 'utf-8'));

  payload.documents = payload.documents.map((doc: any) => ({
    ...doc,
    published_at: doc.published_at ?? formatISO(new Date()),
  }));

  const response = await axios.post(`${backendUrl}/api/sources/ingest`, payload, {
    headers: {
      'x-mock-user': mockUserHeader,
      'Content-Type': 'application/json',
    },
  });

  console.log('Zakończono ingest:', response.data);
}

main().catch((error) => {
  console.error('Błąd ingestu', error.response?.data ?? error.message);
  process.exit(1);
});
