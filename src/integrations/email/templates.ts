function wrapper(bodyHtml: string, title = "আলোকিত টেলিকম"): string {
  return `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Hind Siliguri', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F8FAFC; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
              <!-- Brand Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0A4427 0%, #0D5E36 50%, #15803D 100%); padding: 28px 24px; text-align: center;">
                  <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 0.5px;">আলোকিত টেলিকম</h1>
                  <p style="color: #DCFCE7; font-size: 13px; margin: 4px 0 0 0; font-weight: 500;">Alokito Telecom • সেরা ড্রাইভ অফার ও ইনস্ট্যান্ট রিচার্জ</p>
                </td>
              </tr>
              
              <!-- Content Body -->
              <tr>
                <td style="padding: 32px 28px; color: #1E293B;">
                  ${bodyHtml}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #F1F5F9; padding: 20px 24px; text-align: center; border-top: 1px solid #E2E8F0; color: #64748B; font-size: 12px; line-height: 1.6;">
                  <p style="margin: 0;">নিরাপত্তা সতর্কবার্তা: এই ওটিপি কোডটি গোপন রাখুন। <strong>আলোকিত টেলিকম</strong> প্রতিনিধি কখনোই আপনার কাছে পিন বা ওটিপি চাইবে না।</p>
                  <p style="margin: 6px 0 0 0; color: #94A3B8;">&copy; ${new Date().getFullYear()} Alokito Telecom. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function otpEmailTemplate(params: {
  code: string;
  purposeLabel: string;
  expiresInMinutes: number;
}): {
  subject: string;
  html: string;
} {
  const { code, purposeLabel, expiresInMinutes } = params;
  return {
    subject: `[আলোকিত টেলিকম] আপনার ভেরিফিকেশন ওটিপি কোড: ${code}`,
    html: wrapper(`
      <div style="text-align: center;">
        <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">ইমেইল ভেরিফিকেশন কোড</h2>
        <p style="color: #475569; font-size: 14px; margin: 0 0 24px 0;">
          আপনার <strong>${purposeLabel}</strong> সম্পন্ন করতে নিচের ৬-ডিজিটের নিরাপত্তা ওটিপি কোডটি ব্যবহার করুন:
        </p>

        <!-- OTP Display Box -->
        <div style="background-color: #F0FDF4; border: 2px dashed #16A34A; border-radius: 12px; padding: 18px; margin: 0 auto 24px auto; max-width: 280px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #0D5E36; letter-spacing: 10px; display: inline-block;">${code}</span>
        </div>

        <p style="color: #64748B; font-size: 13px; margin: 0 0 8px 0;">
          কোডটির মেয়াদ আগামী <strong>${expiresInMinutes} মিনিট</strong> পর্যন্ত বহাল থাকবে।
        </p>
        <p style="color: #94A3B8; font-size: 12px; margin: 0;">
          আপনি যদি এই অনুরোধটি না করে থাকেন, তবে মেসেজটি এড়িয়ে চলুন।
        </p>
      </div>
    `, "আলোকিত টেলিকম - ভেরিফিকেশন কোড"),
  };
}

export function temporaryPinEmailTemplate(params: {
  email: string;
  temporaryPin: string;
}): {
  subject: string;
  html: string;
} {
  const { email, temporaryPin } = params;
  return {
    subject: "[আলোকিত টেলিকম] আপনার অ্যাকাউন্ট তৈরি সম্পন্ন হয়েছে",
    html: wrapper(`
      <div>
        <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">স্বাগতম আলোকিত টেলিকমে!</h2>
        <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0;">
          আপনার ইমেইল অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। লগইন করার সাময়িক বিবরণী নিচে দেওয়া হলো:
        </p>

        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>ইমেইল:</strong> ${email}</p>
          <p style="margin: 0; font-size: 14px; color: #334155;"><strong>সাময়িক পিন (Temporary PIN):</strong></p>
          <div style="font-size: 28px; font-weight: bold; color: #0D5E36; letter-spacing: 4px; margin-top: 8px;">${temporaryPin}</div>
        </div>

        <p style="color: #64748B; font-size: 13px; margin: 0;">
          প্রথমবার লগইন করার পর নিরাপত্তার স্বার্থে একটি নতুন পিন সেট করে নেবেন।
        </p>
      </div>
    `, "আলোকিত টেলিকম - অ্যাকাউন্ট তৈরি"),
  };
}

export function pinResetEmailTemplate(params: { temporaryPin: string }): {
  subject: string;
  html: string;
} {
  const { temporaryPin } = params;
  return {
    subject: "[আলোকিত টেলিকম] আপনার সিকিউরিটি পিন রিসেট করা হয়েছে",
    html: wrapper(`
      <div>
        <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">পিন রিসেট কনফার্মেশন</h2>
        <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0;">
          আপনার আলোকিত টেলিকম অ্যাকাউন্টের পিন সফলভাবে রিসেট করা হয়েছে। লগইন করতে সাময়িক পিনটি ব্যবহার করুন:
        </p>

        <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <div style="font-size: 32px; font-weight: bold; color: #B45309; letter-spacing: 6px;">${temporaryPin}</div>
        </div>

        <p style="color: #64748B; font-size: 13px; margin: 0;">
          লগইন করার পর অবশ্যই পিন পরিবর্তন করুন। নিরাপত্তার জন্য অন্যান্য ডিভাইস থেকে সেশন আউট করা হয়েছে।
        </p>
      </div>
    `, "আলোকিত টেলিকম - পিন রিসেট"),
  };
}
