import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from './src/lib/db/index';
import { participants, attendance, transactions } from './src/lib/db/schema';
import { eq, or } from 'drizzle-orm';

async function check019() {
  try {
    const p = await db.query.participants.findMany({
      where: or(eq(participants.cardId, '019'), eq(participants.cardNumber, '019'))
    });
    
    console.log('Participants finding 019:');
    console.log(JSON.stringify(p, null, 2));
    
    if (p.length > 0) {
      for (const participant of p) {
        const att = await db.query.attendance.findMany({
          where: eq(attendance.participantId, participant.id)
        });
        console.log(`\nAttendance records for ID ${participant.id}:`);
        console.log(JSON.stringify(att, null, 2));

        const trans = await db.query.transactions.findMany({
          where: eq(transactions.participantId, participant.id)
        });
        console.log(`\nTransactions for ID ${participant.id}:`);
        console.log(JSON.stringify(trans, null, 2));
      }
    } else {
      console.log('No participant found with 019');
    }
  } catch (e) {
    console.error('ERROR', e);
  } finally {
    process.exit(0);
  }
}

check019();
