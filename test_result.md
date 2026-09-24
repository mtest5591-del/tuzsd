#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol: main <-> testing via this file

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

user_problem_statement: |
  Cloned https://github.com/maksnykytiuk-boop/hjjh (MaksPAY crypto payment gateway).
  Added 4 required fixes per the Ukrainian brief:
  1. Superadmin "Fee settings" block (deposit fee, cabinet-withdrawal fee, API-withdrawal fee)
  2. Fee amount displayed in Wallet transactions (both deposit and withdrawal)
  3. Network on/off toggles (TRC20/ERC20/BEP20 + others) — instantly disables deposits/withdrawals
  4. Google Authenticator 2FA for login and critical actions (withdraw, admin settings)
  Plus: free AML (OFAC + Tornado Cash + CryptoScamDB) on deposits; fresh hot wallet mnemonic
  (old one compromised in chat rotated); new TREASURY_EVM = 0xab94b4e8e9cca37961e6ccbb57da1a892a818061.
  Real integrations preserved: Alchemy, TronGrid, 1inch, Emergent Google sign-in.

backend:
  - task: "Platform fee settings (admin)"
    implemented: true
    working: "NA"
    file: "backend/admin_router.py, backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/PUT /api/admin/platform-fees. Requires role=admin. 2FA-gated when admin has 2FA enabled. Values default 0.5/1.0/0.8. Applied in _confirm_payment (deposit) and /wallet/withdraw (cabinet+api fees)."
  - task: "Network on/off toggles"
    implemented: true
    working: "NA"
    file: "backend/admin_router.py, backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/PUT /api/admin/networks. Public read at /api/admin/networks/public. Enforced in /wallet/deposit-address and /wallet/withdraw."
  - task: "2FA (Google Authenticator) enroll + login guard"
    implemented: true
    working: "NA"
    file: "backend/admin_router.py, backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "pyotp+qrcode. /api/security/2fa/{status,setup,enable,disable}. Login rejects without OTP when enabled. Withdraw and admin PUTs require OTP when enabled."
  - task: "AML on deposits (free lists: OFAC + Tornado Cash + CryptoScamDB)"
    implemented: true
    working: "NA"
    file: "backend/aml.py, backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Daily refresh worker. _confirm_payment screens sender; BLOCK for OFAC/Tornado, REVIEW (funds on hold) for community blacklist, APPROVE otherwise."
  - task: "Wallet transaction with fee/gross fields"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "add_transaction now stores fee, fee_iso, gross_amount, source. Deposit records net credited + fee taken. Withdrawal records total debited."
  - task: "Fresh HD wallet + treasury rotation"
    implemented: true
    working: true
    file: "backend/.env, /app/.wallet_mnemonic_SECRET.txt"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Old compromised mnemonic replaced with a fresh one generated locally (never printed in chat). Stored in .wallet_mnemonic_SECRET.txt (chmod 600). TREASURY_EVM updated to user-provided 0xab94b4e8e9cca37961e6ccbb57da1a892a818061. Hot wallet addresses (index 0): EVM 0x3A60275d820FA1748d2819d784bA1aC7b4cbf529, TRON TEi66UuaXL46TG2jfn7s3vT6PafpKL4dmQ."

frontend:
  - task: "Wallet — deposit fee preview, withdraw fee breakdown, transactions fee column"
    implemented: true
    working: true
    file: "frontend/src/pages/Wallet.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Verified via screenshot: deposit tab shows fee callout with example 10→9.5, withdraw shows fee breakdown, tx table has 'Комісія' column."
  - task: "Settings — Platform tab (superadmin only) for fees"
    implemented: true
    working: true
    file: "frontend/src/pages/Settings.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Verified via screenshot: 3 fee inputs + accumulated pool block. Highlighted as superadmin-only."
  - task: "Settings — Networks tab with toggles"
    implemented: true
    working: true
    file: "frontend/src/pages/Settings.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Verified via screenshot: all 8 networks (TRC20/ERC20/BEP20/BTC/SOL/MATIC/ARB/LTC) with Switch toggles + Active/Inactive badges."
  - task: "Settings — Security tab with 2FA setup (QR + secret)"
    implemented: true
    working: true
    file: "frontend/src/pages/Settings.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Verified via screenshot: Enable button generates QR + secret + OTP input; disable path with OTP shown when enabled."
  - task: "Login — supports 2FA OTP field"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Login.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Login catches 401 with detail={error:'2FA_REQUIRED'|'2FA_INVALID'} and shows OTP field; retries with otp."
  - task: "Fix React 19 'destroy is not a function' when switching tabs"
    implemented: true
    working: true
    file: "frontend/src/pages/Settings.js, frontend/src/pages/Wallet.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Root cause: useEffect(load, []) returned a Promise which React 19 tried to invoke as cleanup. Fixed with useEffect(() => { load(); }, [])."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 0
  run_ui: true

test_plan:
  current_focus:
    - "Platform fee settings (admin)"
    - "Network on/off toggles"
    - "2FA (Google Authenticator) enroll + login guard"
    - "AML on deposits (free lists: OFAC + Tornado Cash + CryptoScamDB)"
    - "Wallet transaction with fee/gross fields"
    - "Login — supports 2FA OTP field"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Cloned repo now runs as: FastAPI @ 8001 (supervisor: backend) + CRA @ 3000 (supervisor: frontend, proxying /api → 8001). Old nextjs supervisor stopped.
      Admin login: admin@makspay.local / admin123.
      Real keys wired: ALCHEMY_KEY, TRONGRID_KEY, ONEINCH_KEY, TREASURY_EVM. WALLET_MNEMONIC rotated to a fresh one (not shown in chat).
      Please run backend tests focused on new endpoints and behaviour changes; do not modify existing merchant/checkout flow logic.
