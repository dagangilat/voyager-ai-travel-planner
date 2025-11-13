const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'voyagerai-travel-planner'
});

async function sendTestEmail() {
  console.log('Sending test email via Gmail SMTP...\n');
  
  const emailDoc = {
    to: ['dagan.gilat@gmail.com'],
    from: 'feedmyinfo@gmail.com',
    message: {
      subject: '✅ Gmail SMTP Test - Voyager Travel Planner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); border-radius: 12px; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0;">✅ Gmail SMTP Working!</h1>
          </div>
          <h2 style="color: #1e3a8a;">Success!</h2>
          <p>Your Voyager email system is now configured with Gmail SMTP.</p>
          <p><strong>Email sent FROM:</strong> feedmyinfo@gmail.com</p>
          <p><strong>Email sent TO:</strong> dagan.gilat@gmail.com</p>
          <h3 style="color: #1e3a8a; margin-top: 30px;">What's Working:</h3>
          <ul style="line-height: 1.8;">
            <li>✅ Gmail SMTP with App Password</li>
            <li>✅ Trip creation emails</li>
            <li>✅ Trip update emails</li>
            <li>✅ Trip deletion emails</li>
            <li>✅ Beautiful HTML templates</li>
            <li>✅ Daily plan with lodging & experiences</li>
          </ul>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
            Sent by Voyager AI Travel Planner
          </p>
        </div>
      `,
      text: 'Gmail SMTP test successful! Your Voyager email system is working.'
    }
  };
  
  const docRef = await admin.firestore().collection('mail').add(emailDoc);
  
  console.log(`✅ Test email created: ${docRef.id}`);
  console.log(`\nEmail details:`);
  console.log(`  FROM: feedmyinfo@gmail.com`);
  console.log(`  TO: dagan.gilat@gmail.com`);
  console.log(`  Subject: Gmail SMTP Test`);
  console.log(`\nCheck dagan.gilat@gmail.com inbox in 10-30 seconds!`);
}

sendTestEmail()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
