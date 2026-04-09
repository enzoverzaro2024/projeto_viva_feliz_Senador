import { db } from './src/lib/db';
import { participants } from './src/lib/db/schema';
import { sql } from 'drizzle-orm';

async function test() {
  try {
    const res = await db.update(participants).set({ processedResgate: 0 }).where(sql`1=1`);
    console.log('OK', res);
  } catch (e) {
    console.error('ERROR', e);
  }
}

test();
