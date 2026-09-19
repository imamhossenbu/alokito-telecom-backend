import { normalizeSms } from '../src/sms/normalizer/normalizer';

async function testSmsReadingAndParsing() {
  console.log(`\n======================================================`);
  console.log(`🧪 TESTING SMS PARSER & AUTO-RECHARGE RECOGNITION`);
  console.log(`======================================================\n`);

  const sampleMessages = [
    {
      name: 'bKash Cash In / Send Money',
      sender: 'bKash',
      body: 'You have received Tk 500.00 from 01712345678. Ref . Fee Tk 0.00. Balance Tk 5,500.00. TrxID BJ72A9X110 at 19/09/2026 17:30',
      expectedProvider: 'BKASH',
    },
    {
      name: 'bKash Merchant / Payment Received',
      sender: 'bKash',
      body: 'Payment received Tk 1,200.00 from 01812345678. Balance Tk 12,500.00. TrxID 9A8B7C6D5E at 19/09/2026 16:45',
      expectedProvider: 'BKASH',
    },
    {
      name: 'Nagad Cash In / Send Money Received',
      sender: 'Nagad',
      body: 'Money In received from 01912345678. Amount: Tk 1,000.00. Fee: Tk 0.00. Balance: Tk 3,450.00. TxnID: 72NAGAD991 at 19/09/2026 15:20',
      expectedProvider: 'NAGAD',
    },
    {
      name: 'Rocket (16216) Money Received',
      sender: '16216',
      body: 'You have received Tk 750.00 from 01512345678. Your A/C balance is Tk 2,150.00. TxnId: RCK887766 at 19/09/2026 14:10',
      expectedProvider: 'ROCKET',
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const item of sampleMessages) {
    console.log(`\n📨 Testing: ${item.name}`);
    console.log(`   Sender: ${item.sender}`);
    console.log(`   Body: "${item.body}"`);

    try {
      const parsed = normalizeSms(item.body, '01700000000');

      if (parsed && parsed.transactionId) {
        console.log(`   ✅ Parsed Successfully:`);
        console.log(`      - Provider: ${parsed.provider}`);
        console.log(`      - TrxID: ${parsed.transactionId}`);
        console.log(`      - Amount: ৳${parsed.amount / 100} (${parsed.amount} Poisha)`);
        console.log(`      - Sender: ${parsed.sender || 'N/A'}`);
        console.log(`      - Received At: ${parsed.receivedAt.toISOString()}`);
        passed++;
      } else {
        console.log(`   ❌ FAILED to extract transaction details`);
        failed++;
      }
    } catch (err: any) {
      console.log(`   ❌ Error during parsing: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`SMS Parser Test Result: ${passed}/${sampleMessages.length} Passed (${((passed / sampleMessages.length) * 100).toFixed(1)}%)`);
  console.log(`------------------------------------------------------\n`);
}

testSmsReadingAndParsing();
