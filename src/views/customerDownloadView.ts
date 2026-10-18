export interface CustomerViewData {
  version?: string;
  build?: number;
  releaseNotes?: string;
  whatsapp?: string;
  telegram?: string;
  offlinePhone?: string;
  facebook?: string;
  youtube?: string;
  noticeBanner?: string;
}

export function renderCustomerDownloadPage(data: CustomerViewData = {}): string {
  const version = data.version || "1.0.7";
  const build = data.build || 8;
  const whatsapp = data.whatsapp || "https://wa.me/8801890000001";
  const telegram = data.telegram || "https://t.me/alokito_telecom";
  const phone = data.offlinePhone || "01890000001";
  const notice = data.noticeBanner || "";

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>আলোকিত টেলিকম - অফিসিয়াল গ্রাহক অ্যাপ ডাউনলোড (Customer App)</title>
  <meta name="description" content="আলোকিত টেলিকম অফিসিয়াল গ্রাহক মোবাইল অ্যাপ ও ওয়েব পোর্টাল। সবচেয়ে কম মূল্যে ড্রাইভ অফার, ক্যাশব্যাক ও ইনস্ট্যান্ট বিকাশ-নগদ অটো ব্যালেন্স রিচার্জ।">
  <link rel="icon" type="image/png" href="/public/favicon.png">

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="আলোকিত টেলিকম - গ্রাহক অ্যাপ ও ড্রাইভ অফার">
  <meta property="og:description" content="সরাসরি গ্রাহক অ্যাপ ডাউনলোড করুন। সেরা ড্রাইভ অফার, নিয়মিত প্যাক, ক্যাশব্যাক ও দ্রুত ব্যালেন্স রিচার্জ।">
  <meta property="og:image" content="/public/logo.png">
  <meta property="og:url" content="/customer-app">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="আলোকিত টেলিকম - অফিসিয়াল গ্রাহক অ্যাপ">
  <meta name="twitter:description" content="সরাসরি গ্রাহক অ্যাপ ডাউনলোড করুন। সেরা ড্রাইভ অফার ও ইনস্ট্যান্ট ব্যালেন্স রিচার্জ।">
  <meta name="twitter:image" content="/public/logo.png">
  <meta name="theme-color" content="#0D5E36">

  <!-- Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Hind+Siliguri:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'Bornomala';
      src: url('/public/fonts/Bornomala-Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Bornomala';
      src: url('/public/fonts/Bornomala-Bold.ttf') format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    :root {
      --primary: #15803D;
      --primary-bright: #22C55E;
      --primary-dark: #0D5E36;
      --bg: #070E17;
      --card-bg: rgba(255, 255, 255, 0.04);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --accent-glow: rgba(34, 197, 94, 0.25);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Bornomala', 'Plus Jakarta Sans', 'Hind Siliguri', sans-serif;
      background: radial-gradient(circle at 50% -20%, #173824 0%, #09121D 55%, #05080E 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 30px 16px 50px;
      line-height: 1.5;
    }
    .container {
      max-width: 640px;
      width: 100%;
    }
    /* Notice Banner */
    .notice-bar {
      background: linear-gradient(135deg, rgba(234, 88, 12, 0.2), rgba(194, 65, 12, 0.3));
      border: 1px solid rgba(249, 115, 22, 0.4);
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      color: #FDBA74;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo-wrapper {
      position: relative;
      display: inline-block;
      margin-bottom: 14px;
    }
    .logo-glow {
      position: absolute;
      inset: -6px;
      background: radial-gradient(circle, rgba(34, 197, 94, 0.45) 0%, transparent 70%);
      border-radius: 28px;
      filter: blur(10px);
      z-index: 0;
    }
    .logo-img {
      position: relative;
      width: 84px;
      height: 84px;
      border-radius: 22px;
      background: #ffffff;
      padding: 6px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
      object-fit: contain;
      z-index: 1;
    }
    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(22, 163, 74, 0.18);
      border: 1px solid rgba(74, 222, 128, 0.35);
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: #4ADE80;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      line-height: 1.25;
    }
    p.sub {
      color: var(--text-muted);
      font-size: 14px;
      max-width: 520px;
      margin: 0 auto;
    }
    /* Hero Download Card */
    .hero-card {
      background: linear-gradient(180deg, rgba(21, 128, 61, 0.14) 0%, rgba(255, 255, 255, 0.04) 100%);
      border: 1px solid rgba(34, 197, 94, 0.35);
      border-radius: 22px;
      padding: 24px;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(22, 163, 74, 0.12);
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    .hero-card::before {
      content: '';
      position: absolute;
      top: -40%;
      right: -20%;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(34, 197, 94, 0.18) 0%, transparent 70%);
      pointer-events: none;
    }
    .app-meta {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
    }
    .app-meta-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: white;
      padding: 4px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
      flex-shrink: 0;
    }
    .app-meta-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .app-meta-info h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .app-meta-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #CBD5E1;
    }
    .tag.green {
      background: rgba(34, 197, 94, 0.2);
      color: #4ADE80;
      border: 1px solid rgba(74, 222, 128, 0.3);
    }
    .app-desc {
      font-size: 13.5px;
      color: #CBD5E1;
      margin-bottom: 20px;
      line-height: 1.55;
    }
    .perks-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 22px;
    }
    @media (max-width: 480px) {
      .perks-list { grid-template-columns: 1fr; }
      h1 { font-size: 24px; }
    }
    .perk-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #E2E8F0;
      background: rgba(255, 255, 255, 0.03);
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .perk-item span.icon {
      color: #4ADE80;
      font-weight: bold;
    }
    /* Buttons */
    .btn-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn-main {
      background: linear-gradient(135deg, #15803D 0%, #16A34A 50%, #22C55E 100%);
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 15px 22px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 8px 24px rgba(22, 163, 74, 0.35);
      transition: all 0.2s ease;
      border: none;
      cursor: pointer;
    }
    .btn-main:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(22, 163, 74, 0.5);
    }
    .btn-row {
      display: flex;
      gap: 10px;
    }
    .btn-web {
      flex: 1;
      background: rgba(22, 163, 74, 0.15);
      border: 1px solid rgba(74, 222, 128, 0.4);
      color: #4ADE80;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      padding: 12px 14px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn-web:hover {
      background: rgba(22, 163, 74, 0.25);
    }
    .btn-v7a {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #CBD5E1;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      padding: 12px 14px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn-v7a:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    /* Section Title */
    .section-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (max-width: 480px) {
      .features-grid { grid-template-columns: 1fr; }
    }
    .feature-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 16px;
      backdrop-filter: blur(12px);
      transition: all 0.2s ease;
    }
    .feature-card:hover {
      border-color: rgba(34, 197, 94, 0.35);
      transform: translateY(-2px);
    }
    .feature-icon {
      font-size: 22px;
      margin-bottom: 8px;
      display: inline-block;
    }
    .feature-card h3 {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
      color: #F1F5F9;
    }
    .feature-card p {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.45;
    }
    /* Install Guide Card */
    .guide-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .step-item {
      display: flex;
      gap: 14px;
      margin-bottom: 14px;
    }
    .step-item:last-child {
      margin-bottom: 0;
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(34, 197, 94, 0.2);
      color: #4ADE80;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid rgba(74, 222, 128, 0.4);
    }
    .step-text h4 {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 2px;
      color: #F8FAFC;
    }
    .step-text p {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    /* Support Bar */
    .support-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 18px;
      margin-bottom: 24px;
      text-align: center;
    }
    .support-card h3 {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .support-card p {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 14px;
    }
    .support-btns {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn-support {
      padding: 9px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn-wa {
      background: #25D366;
      color: #052e16;
    }
    .btn-tg {
      background: #0088cc;
      color: white;
    }
    .btn-call {
      background: rgba(255, 255, 255, 0.1);
      color: #E2E8F0;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-support:hover {
      transform: translateY(-1px);
    }
    /* Share Bar */
    .share-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 24px;
    }
    .share-text {
      font-size: 12px;
      color: var(--text-muted);
    }
    .btn-copy {
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(74, 222, 128, 0.4);
      color: #4ADE80;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-copy:hover {
      background: rgba(34, 197, 94, 0.3);
    }
    /* Footer */
    .footer {
      text-align: center;
      font-size: 12px;
      color: #64748B;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${notice ? `
    <div class="notice-bar">
      <span>📢</span>
      <div>${notice}</div>
    </div>
    ` : ''}

    <div class="header">
      <div class="logo-wrapper">
        <div class="logo-glow"></div>
        <img src="/public/logo.png" class="logo-img" alt="Alokito Telecom" />
      </div>
      <div>
        <div class="badge-verified">⚡ অফিসিয়াল ভেরিফাইড গ্রাহক অ্যাপ</div>
      </div>
      <h1>আলোকিত টেলিকম</h1>
      <p class="sub">ড্রাইভ অফার, নিয়মিত ইন্টারনেট-মিনিট প্যাক এবং সেকেন্ডের মধ্যে বিকাশ ও নগদ অটো ব্যালেন্স রিচার্জ</p>
    </div>

    <!-- Main Customer App Card -->
    <div class="hero-card">
      <div class="app-meta">
        <div class="app-meta-icon">
          <img src="/public/logo.png" alt="Customer App Icon" />
        </div>
        <div class="app-meta-info">
          <h2>Alokito Telecom - Customer App</h2>
          <div class="app-meta-badges">
            <span class="tag green">v${version} (Build ${build})</span>
            <span class="tag">সাইজ: ২০.৪ MB</span>
            <span class="tag">Android 5.0+</span>
            <span class="tag">নিরাপদ ও পরীক্ষিত</span>
          </div>
        </div>
      </div>

      <div class="app-desc">
        গ্রাহকদের জন্য তৈরি সেরা টেলিকম অ্যাপ। সকল সিমের ডিসকাউন্ট ড্রাইভ অফার কিনুন, বিকাশ ও নগদে টাকা পাঠিয়ে সরাসরি একাউন্টে ব্যালেন্স যুক্ত করুন এবং নিরাপদ পিন দিয়ে যেকোনো অফার অর্ডার করুন।
      </div>

      <div class="perks-list">
        <div class="perk-item">
          <span class="icon">✓</span>
          <span>সকল সিমে সেরা ড্রাইভ অফার</span>
        </div>
        <div class="perk-item">
          <span class="icon">✓</span>
          <span>বিকাশ ও নগদ অটো ব্যালেন্স</span>
        </div>
        <div class="perk-item">
          <span class="icon">✓</span>
          <span>৪-ডিজিট সিকিউর পিন কোড</span>
        </div>
        <div class="perk-item">
          <span class="icon">✓</span>
          <span>লাইভ অর্ডার স্টেটমেন্ট ও হিস্ট্রি</span>
        </div>
      </div>

      <div class="btn-stack">
        <a href="/download/customer" class="btn-main" download id="downloadBtn">
          ⬇️ ডাউনলোড গ্রাহক অ্যাপ APK (মেইন সংস্করণ)
        </a>
        <div class="btn-row">
          <a href="/customer" class="btn-web" target="_blank">
            🌐 সরাসরি ওয়েব অ্যাপ খুলুন (iOS / PC)
          </a>
          <a href="/download/customer-v7a" class="btn-v7a" download title="Compact 32-bit build for older phones">
            📦 v7a বিল্ড (১৭.৯ MB)
          </a>
        </div>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="section-title">✨ অ্যাপের প্রধান সুবিধাসমূহ</div>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🚀</div>
        <h3>সেরা ড্রাইভ ও ক্যাশব্যাক</h3>
        <p>GP, Robi, Airtel, BL ও Teletalk-এর সকল স্পেশাল ড্রাইভ প্যাক সর্বোচ্চ ক্যাশব্যাক কমিশনে উপভোগ করুন।</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>অটো ব্যালেন্স রিচার্জ</h3>
        <p>বিকাশ বা নগদে টাকা পাঠিয়ে ট্রানজ্যাকশন আইডি ও নম্বর দিলে মাত্র ৩০ সেকেন্ডে স্বয়ংক্রিয় ব্যালেন্স যোগ।</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔐</div>
        <h3>৪-ডিজিট সিকিউর পিন</h3>
        <p>আপনার ওয়ালেটের টাকা ও অ্যাকাউন্ট সুরক্ষিত রাখতে প্রতি লেনদেনে আধুনিক সিকিউর পিন ভেরিফিকেশন।</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>লাইভ স্টেটমেন্ট ও হিস্ট্রি</h3>
        <p>আপনার করা সকল রিচার্জ, অফার রিকোয়েস্টের রিয়েলটাইম স্ট্যাটাস ও সম্পূর্ণ হিসাবের খতিয়ান।</p>
      </div>
    </div>

    <!-- Install Guide -->
    <div class="section-title">📲 সহজে ইনস্টল করার নিয়ম (৪টি ধাপ)</div>
    <div class="guide-card">
      <div class="step-item">
        <div class="step-num">১</div>
        <div class="step-text">
          <h4>ডাউনলোড বাটনে ক্লিক করুন</h4>
          <p>উপরের সবুজ 'ডাউনলোড গ্রাহক অ্যাপ APK' বাটনে চাপ দিন। আপনার ফোনে ফাইলটি ডাউনলোড হওয়া শুরু হবে।</p>
        </div>
      </div>
      <div class="step-item">
        <div class="step-num">২</div>
        <div class="step-text">
          <h4>'Download anyway' চাপুন</h4>
          <p>Chrome ব্রাউজার সতর্ক করতে পারে ('File might be harmful')। এটি প্লে-স্টোরের বাইরের যেকোনো APK ফাইলের স্বাভাবিক নোটিশ। নিশ্চিন্তে 'Download anyway' বা 'ডাউনলোড চালিয়ে যান' চাপুন।</p>
        </div>
      </div>
      <div class="step-item">
        <div class="step-num">৩</div>
        <div class="step-text">
          <h4>ফাইলে ট্যাপ করে 'Install' করুন</h4>
          <p>ডাউনলোড শেষ হলে নোটিফিকেশন বার থেকে ফাইলে চাপ দিন। 'Install from unknown sources' পারমিশন চাইলে 'Allow' করে দিয়ে Install সম্পন্ন করুন।</p>
        </div>
      </div>
      <div class="step-item">
        <div class="step-num">৪</div>
        <div class="step-text">
          <h4>লগইন করুন ও অফার উপভোগ করুন</h4>
          <p>অ্যাপ চালু করে আপনার মোবাইল নম্বর দিয়ে লগইন বা একাউন্ট খুলে ড্রাইভ অফার কেনা শুরু করুন।</p>
        </div>
      </div>
    </div>

    <!-- Support Box -->
    <div class="support-card">
      <h3>সহায়তা বা যে কোনো প্রয়োজনে</h3>
      <p>অফিসিয়াল কাস্টমার কেয়ারে সরাসরি মেসেজ বা কল করুন</p>
      <div class="support-btns">
        <a href="${whatsapp}" class="btn-support btn-wa" target="_blank">
          💬 WhatsApp সাপোর্ট
        </a>
        <a href="${telegram}" class="btn-support btn-tg" target="_blank">
          ✈️ Telegram চ্যানেল
        </a>
        <a href="tel:${phone}" class="btn-support btn-call">
          📞 হেল্পলাইন: ${phone}
        </a>
      </div>
    </div>

    <!-- Share Link helper -->
    <div class="share-box">
      <div class="share-text">
        🔗 বন্ধুদের এই গ্রাহক লিঙ্কটি পাঠান
      </div>
      <button class="btn-copy" onclick="copyCurrentUrl()" id="copyBtn">
        📋 লিঙ্ক কপি করুন
      </button>
    </div>

    <div class="footer">
      Alokito Telecom &copy; 2026. All rights reserved. নিরাপদ ও বিশ্বস্ত টেলিকম সেবা।
    </div>
  </div>

  <script>
    function copyCurrentUrl() {
      const url = window.location.href.split('?')[0];
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyBtn');
        const orig = btn.innerHTML;
        btn.innerHTML = '✅ কপি হয়েছে!';
        setTimeout(() => btn.innerHTML = orig, 2500);
      }).catch(() => {
        prompt('লিঙ্কটি কপি করুন:', window.location.href);
      });
    }

    // Auto-download query param check (?download=1 or ?auto=1)
    const params = new URLSearchParams(window.location.search);
    if (params.get('download') === '1' || params.get('auto') === '1') {
      setTimeout(() => {
        const dlBtn = document.getElementById('downloadBtn');
        if (dlBtn) dlBtn.click();
      }, 800);
    }
  </script>
</body>
</html>`;
}
