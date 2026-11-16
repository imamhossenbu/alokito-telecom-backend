export interface AdminPortalViewData {
  customerVersion?: string;
  customerBuild?: number;
  adminVersion?: string;
  adminBuild?: number;
  listenerVersion?: string;
}

export function renderAdminAppsPortalPage(data: AdminPortalViewData = {}): string {
  const custVer = data.customerVersion || "1.0.7";
  const custBuild = data.customerBuild || 8;
  const admVer = data.adminVersion || "1.0.7";
  const admBuild = data.adminBuild || 8;
  const listVer = data.listenerVersion || "1.0.3";

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alokito Telecom - Apps & Admin Portal</title>
  <link rel="icon" type="image/png" href="/public/favicon.png">
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
      --primary: #0D5E36;
      --primary-light: #15803D;
      --bg: #0B131E;
      --card-bg: rgba(255, 255, 255, 0.05);
      --border: rgba(255, 255, 255, 0.1);
      --text: #F8FAFC;
      --text-muted: #94A3B8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Bornomala', 'Plus Jakarta Sans', sans-serif;
      background: radial-gradient(circle at top, #13271E 0%, #080D14 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 36px 16px;
    }
    .container {
      max-width: 680px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-img {
      width: 76px;
      height: 76px;
      border-radius: 20px;
      background: #ffffff;
      padding: 4px;
      box-shadow: 0 10px 30px rgba(13, 94, 54, 0.4);
      margin-bottom: 14px;
      object-fit: contain;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(13, 94, 54, 0.3);
      border: 1px solid rgba(22, 163, 74, 0.4);
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: #4ADE80;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }
    p.sub {
      color: var(--text-muted);
      font-size: 14px;
    }

    /* Customer Share Callout Banner */
    .customer-share-banner {
      background: linear-gradient(135deg, rgba(22, 163, 74, 0.18) 0%, rgba(13, 94, 54, 0.28) 100%);
      border: 1px solid rgba(74, 222, 128, 0.35);
      border-radius: 18px;
      padding: 16px 20px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(22, 163, 74, 0.15);
    }
    .banner-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .banner-pill {
      font-size: 12px;
      font-weight: 800;
      color: #4ADE80;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .banner-hint {
      font-size: 11px;
      color: #CBD5E1;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 6px;
    }
    .banner-body {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .banner-url {
      flex: 1;
      min-width: 220px;
      background: rgba(0, 0, 0, 0.35);
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 12px;
      color: #F8FAFC;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: monospace;
      user-select: all;
    }
    .banner-buttons {
      display: flex;
      gap: 8px;
    }
    .btn-banner-copy {
      background: #16A34A;
      color: white;
      border: none;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn-banner-copy:hover {
      background: #15803D;
      transform: translateY(-1px);
    }
    .btn-banner-open {
      background: rgba(255, 255, 255, 0.08);
      color: #E2E8F0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
    }
    .btn-banner-open:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .apps-grid {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .app-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 22px;
      backdrop-filter: blur(16px);
      transition: all 0.2s ease;
    }
    .app-card:hover {
      border-color: rgba(34, 197, 94, 0.4);
      transform: translateY(-2px);
    }
    .card-top {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }
    .app-icon {
      width: 54px;
      height: 54px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      background: white;
      padding: 4px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
    }
    .app-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .app-info h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #CBD5E1;
    }
    .badge.green {
      background: rgba(34, 197, 94, 0.15);
      color: #4ADE80;
    }
    .description {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 18px;
    }
    .btn-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-download {
      flex: 1;
      min-width: 180px;
      background: linear-gradient(135deg, #15803D, #16A34A);
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 13.5px;
      padding: 12px 18px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3);
      transition: all 0.2s ease;
    }
    .btn-download:hover {
      background: linear-gradient(135deg, #166534, #15803D);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #E2E8F0;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      padding: 12px 14px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }
    .btn-web {
      background: rgba(22, 163, 74, 0.15);
      border: 1px solid rgba(74, 222, 128, 0.4);
      color: #4ADE80;
      text-decoration: none;
      font-size: 12.5px;
      font-weight: 700;
      padding: 12px 14px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .btn-web:hover {
      background: rgba(22, 163, 74, 0.25);
    }
    .footer {
      text-align: center;
      margin-top: 36px;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="/public/logo.png" class="logo-img" alt="Alokito Telecom Logo" />
      <div>
        <div class="logo-badge">⚡ Alokito Telecom Production Suite</div>
      </div>
      <h1>অফিসিয়াল অ্যাপস পোর্টাল</h1>
      <p class="sub">গ্রাহক, অ্যাডমিন ও সার্ভিস অ্যাপের কেন্দ্রীয় ডাউনলোড পোর্টাল</p>
    </div>

    <!-- Top Notice for Admins to Share Customer Link -->
    <div class="customer-share-banner">
      <div class="banner-top">
        <span class="banner-pill">📱 কাস্টমারদের পাঠানোর ডেডিকেটেড ডাউনলোড লিঙ্ক</span>
        <span class="banner-hint">অ্যাডমিন লিঙ্ক ছাড়া সুরক্ষিত পেজ</span>
      </div>
      <div class="banner-body">
        <code class="banner-url" id="customerShareUrl">https://alokito-telecom-backend-7coy.onrender.com/customer-app</code>
        <div class="banner-buttons">
          <button onclick="copyCustomerShareLink()" class="btn-banner-copy" id="bannerCopyBtn">
            📋 লিঙ্ক কপি করুন
          </button>
          <a href="/customer-app" target="_blank" class="btn-banner-open">
            👁️ প্রিভিউ দেখুন
          </a>
        </div>
      </div>
    </div>

    <div class="apps-grid">
      <!-- Alokito Telecom Customer App Card -->
      <div class="app-card" style="border-color: rgba(34, 197, 94, 0.5); background: linear-gradient(180deg, rgba(21, 128, 61, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);">
        <div class="card-top">
          <div class="app-icon">
            <img src="/public/logo.png" alt="Customer App" />
          </div>
          <div class="app-info">
            <h2>Alokito Telecom - Customer App (গ্রাহক অ্যাপ)</h2>
            <div class="badges">
              <span class="badge green">New & Verified</span>
              <span class="badge">v${custVer} (Build ${custBuild})</span>
              <span class="badge">Android & Web</span>
            </div>
          </div>
        </div>
        <div class="description">
          গ্রাহকদের জন্য ড্রাইভ ও রেগুলার অফার কেনা, ইনস্ট্যান্ট বিকাশ/নগদ ব্যালেন্স রিচার্জ, ৪-ডিজিট সিকিউর পিন এবং বিস্তারিত লেজার স্টেটমেন্ট।
        </div>
        <div class="btn-group">
          <a href="/download/customer" class="btn-download" download>
            ⬇️ Download Customer APK
          </a>
          <a href="/customer" class="btn-web" target="_blank">
            🌐 Open Customer Web
          </a>
          <a href="/download/customer-v7a" class="btn-secondary" download title="Compact build for older phones">
            v7a Build
          </a>
        </div>
      </div>

      <!-- Alokito Telecom Admin App Card -->
      <div class="app-card">
        <div class="card-top">
          <div class="app-icon">
            <img src="/public/logo.png" alt="Admin App" />
          </div>
          <div class="app-info">
            <h2>Alokito Telecom - Admin App (অ্যাডমিন অ্যাপ)</h2>
            <div class="badges">
              <span class="badge green">Production Ready</span>
              <span class="badge">v${admVer} (Build ${admBuild})</span>
              <span class="badge">Android & Web</span>
            </div>
          </div>
        </div>
        <div class="description">
          ড্রাইভ ও রেগুলার অফার ম্যানেজমেন্ট, ক্যাটাগরি নিয়ন্ত্রণ, রিয়েলটাইম অর্ডার প্রসেসিং, ইউজার কন্ট্রোল, নোটিফিকেশন অ্যালার্ট ও ব্রাউজার সাপোর্ট।
        </div>
        <div class="btn-group">
          <a href="/download/admin" class="btn-download" download>
            ⬇️ Download Admin APK
          </a>
          <a href="/admin" class="btn-web" target="_blank">
            🌐 Open Web Admin
          </a>
          <a href="/download/admin-v7a" class="btn-secondary" download title="Compact build">
            v7a Build
          </a>
        </div>
      </div>

      <!-- Alokito Telecom SMS Listener App Card -->
      <div class="app-card">
        <div class="card-top">
          <div class="app-icon">
            <img src="/public/logo.png" alt="SMS Listener" />
          </div>
          <div class="app-info">
            <h2>Alokito Telecom - SMS Listener (লিসেনার)</h2>
            <div class="badges">
              <span class="badge green">Production Ready</span>
              <span class="badge">v${listVer}</span>
              <span class="badge">Background Service</span>
            </div>
          </div>
        </div>
        <div class="description">
          বিকাশ, নগদ ও রকেটের ইনকামিং SMS স্বয়ংক্রিয়ভাবে সার্ভারে সিঙ্ক ও পেমেন্ট ভেরিফাই করার ডেডিকেটেড ব্যাকগ্রাউন্ড সার্ভিস অ্যাপ।
        </div>
        <div class="btn-group">
          <a href="/download/listener" class="btn-download" download>
            ⬇️ Download SMS Listener APK
          </a>
          <a href="/download/listener-v7a" class="btn-secondary" download title="Compact build">
            v7a Build
          </a>
        </div>
      </div>
    </div>

    <div class="footer">
      Alokito Telecom &copy; 2026. All rights reserved.
    </div>
  </div>

  <script>
    // Ensure the share URL matches current domain
    const host = window.location.origin;
    const urlEl = document.getElementById('customerShareUrl');
    if (urlEl) {
      urlEl.innerText = host + '/customer-app';
    }

    function copyCustomerShareLink() {
      const shareUrl = host + '/customer-app';
      navigator.clipboard.writeText(shareUrl).then(() => {
        const btn = document.getElementById('bannerCopyBtn');
        const orig = btn.innerHTML;
        btn.innerHTML = '✅ লিঙ্ক কপি হয়েছে!';
        setTimeout(() => btn.innerHTML = orig, 2500);
      }).catch(() => {
        prompt('গ্রাহক লিঙ্কটি কপি করুন:', shareUrl);
      });
    }
  </script>
</body>
</html>`;
}
