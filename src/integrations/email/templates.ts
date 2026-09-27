function wrapper(bodyHtml: string, title = "আলোকিত টেলিকম"): string {
  return `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F1F5F9; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;">
              
              <!-- Premium Brand Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #052E16 0%, #0D5E36 50%, #16A34A 100%); padding: 36px 28px; text-align: center; position: relative;">
                  <!-- Glowing Logo Icon -->
                  <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); padding: 12px 18px; border-radius: 14px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25);">
                    <span style="font-size: 26px; line-height: 1;">⚡</span>
                  </div>
                  <h1 style="color: #FFFFFF; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; font-family: 'Hind Siliguri', sans-serif;">আলোকিত টেলিকম</h1>
                  <p style="color: #DCFCE7; font-size: 13px; margin: 6px 0 0 0; font-weight: 500; opacity: 0.95;">Alokito Telecom • সেরা ড্রাইভ অফার ও ইনস্ট্যান্ট রিচার্জ</p>
                </td>
              </tr>
              
              <!-- Main Content Area -->
              <tr>
                <td style="padding: 36px 32px; color: #0F172A; background-color: #FFFFFF;">
                  ${bodyHtml}
                </td>
              </tr>

              <!-- Security Warning Banner -->
              <tr>
                <td style="padding: 0 32px 28px 32px; background-color: #FFFFFF;">
                  <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #991B1B; line-height: 1.5;">
                    <strong style="display: block; margin-bottom: 2px; font-size: 13px;">🔒 নিরাপত্তা সতর্কবার্তা:</strong>
                    এই ওটিপি (OTP) কোডটি অত্যন্ত গোপনীয়। <strong>আলোকিত টেলিকম</strong>-এর কর্মকর্তা বা প্রতিনিধি পরিচয় দিয়ে কেউ চাইলেও পিন বা ওটিপি প্রদান করবেন না।
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #F8FAFC; padding: 22px 28px; text-align: center; border-top: 1px solid #E2E8F0; color: #64748B; font-size: 12px; line-height: 1.6;">
                  <p style="margin: 0; font-weight: 500;">সাহায্যের প্রয়োজন? সাপোর্ট টিমকে ইমেইল করুন: <a href="mailto:support@alokitotelecom.com" style="color: #0D5E36; text-decoration: none; font-weight: 600;">support@alokitotelecom.com</a></p>
                  <p style="margin: 8px 0 0 0; color: #94A3B8; font-size: 11px;">&copy; ${new Date().getFullYear()} Alokito Telecom Ltd. All rights reserved.</p>
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
    subject: `[আলোকিত টেলিকম] আপনার ওটিপি কোড: ${code}`,
    html: wrapper(`
      <div style="text-align: center;">
        <div style="display: inline-block; background-color: #ECFDF5; color: #047857; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 50px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
          ভেরিফিকেশন কোড
        </div>
        <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin: 0 0 10px 0; font-family: 'Hind Siliguri', sans-serif;">ইমেইল ভেরিফিকেশন</h2>
        <p style="color: #475569; font-size: 14px; margin: 0 0 28px 0; line-height: 1.6;">
          আপনার <strong>${purposeLabel}</strong> অনুরোধ সফলভাবে সম্পন্ন করতে নিচের ৬-ডিজিটের গোপন ওটিপি কোডটি ব্যবহার করুন:
        </p>

        <!-- OTP Display Box -->
        <div style="background: linear-gradient(180deg, #ECFDF5 0%, #F0FDF4 100%); border: 2px dashed #10B981; border-radius: 16px; padding: 22px 16px; margin: 0 auto 28px auto; max-width: 300px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);">
          <div style="font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 38px; font-weight: 800; color: #065F46; letter-spacing: 12px; text-indent: 12px; display: inline-block;">${code}</div>
        </div>

        <!-- Timer Pill -->
        <div style="display: inline-flex; align-items: center; justify-content: center; background-color: #F1F5F9; border-radius: 20px; padding: 8px 16px; margin-bottom: 8px;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">⏳ কোডটির মেয়াদ: <strong style="color: #0F172A;">${expiresInMinutes} মিনিট</strong></span>
        </div>
        <p style="color: #94A3B8; font-size: 12px; margin: 12px 0 0 0;">
          আপনি যদি এই অনুরোধটি না করে থাকেন, তবে কোনো অ্যাকশন নেওয়ার প্রয়োজন নেই।
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
        <div style="display: inline-block; background-color: #ECFDF5; color: #047857; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 50px; margin-bottom: 16px; text-transform: uppercase;">
          🎉 স্বাগত বার্তা
        </div>
        <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin: 0 0 10px 0; font-family: 'Hind Siliguri', sans-serif;">স্বাগতম আলোকিত টেলিকমে!</h2>
        <p style="color: #475569; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
          আপনার ইমেইল অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। অ্যাপে প্রথমবার প্রবেশ করতে সাময়িক বিবরণী নিচে দেওয়া হলো:
        </p>

        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #334155;"><strong>ইমেইল ঠিকানা:</strong> <span style="color: #0D5E36; font-weight: 600;">${email}</span></p>
          <p style="margin: 0; font-size: 14px; color: #334155;"><strong>সাময়িক সিকিউরিটি পিন (PIN):</strong></p>
          <div style="background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; font-size: 32px; font-weight: 800; color: #0D5E36; letter-spacing: 6px; text-align: center; padding: 14px; margin-top: 10px;">${temporaryPin}</div>
        </div>

        <p style="color: #64748B; font-size: 13px; margin: 0; line-height: 1.5;">
          💡 <strong>পরামর্শ:</strong> প্রথমবার লগইন করার পর নিরাপত্তার স্বার্থে আপনার প্রোফাইল থেকে সিকিউরিটি পিনটি পরিবর্তন করে নিন।
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
        <div style="display: inline-block; background-color: #FEF3C7; color: #B45309; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 50px; margin-bottom: 16px; text-transform: uppercase;">
          🔑 পিন রিসেট
        </div>
        <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin: 0 0 10px 0; font-family: 'Hind Siliguri', sans-serif;">পিন রিসেট কনফার্মেশন</h2>
        <p style="color: #475569; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
          আপনার আলোকিত টেলিকম অ্যাকাউন্টের পিন রিসেট করা হয়েছে। পুনরায় লগইন করতে সাময়িক পিনটি ব্যবহার করুন:
        </p>

        <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 34px; font-weight: 800; color: #B45309; letter-spacing: 8px;">${temporaryPin}</div>
        </div>

        <p style="color: #64748B; font-size: 13px; margin: 0; line-height: 1.5;">
          লগইন করার পর অবশ্যই নতুন সিকিউরিটি পিন সেট করুন। নিরাপত্তার জন্য আপনার পূর্ববর্তী অন্যান্য সকল সেশন বাতিল করা হয়েছে।
        </p>
      </div>
    `, "আলোকিত টেলিকম - পিন রিসেট"),
  };
}
