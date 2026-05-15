# MakersTab (DPS)

**MakersTab** is an intelligent meal plan budgeting and expense tracking application designed to help students manage their semester dining funds effectively. By leveraging AI for receipt scanning and providing real-time financial forecasting, MakersTab takes the guesswork out of meal plan management.

---

## 🎯 Problem / Solution / Impact

### The Problem
Students often struggle to pace their meal plan spending throughout a semester. Without easy visibility into their daily spending versus their remaining budget, many students either run out of funds weeks before the semester ends or finish with a significant surplus that goes to waste. The "mental math" required to track a declining balance against a calendar is error-prone and stressful.

### The Solution
MakersTab provides a centralized dashboard that visualizes the user's financial health in real-time. 
*   **Automated Tracking:** Students simply snap a photo of their receipt. Our AI (GPT-4o) extracts the transaction details and update the balance automatically.
*   **Predictive Analytics:** The app calculates an "Ideal Spending Curve" vs. "Actual Spending," alerting users if they are over or under budget.
*   **Forecasting:** It predicts how long the current funds will last based on recent spending habits.

### The Impact
*   **Financial Security:** Ensures students have funds for food through finals week.
*   **Reduced Anxiety:** Eliminates the uncertainty of "do I have enough money left?"
*   **Data-Driven Decisions:** empowers students to adjust their daily spending behavior based on clear, visual feedback.

---

## ✨ Key Features

*   **📸 AI Receipt Scanning**: Upload receipt images to automatically extract items, prices, dates, and—most importantly—the *remaining balance* printed on the receipt to keep records perfectly synced.
*   **📊 Smart Analytics**:
    *   **Expected vs. Actual**: Visualize your spending trajectory against the ideal semester burn rate.
    *   **Spending Forecast**: See exactly when your funds will run out at your current pace.
    *   **Weekly Reports**: Track daily and weekly spending averages.
*   **💰 Budget Health Check**: Instant indicators showing if you are "On Track", "Over Budget", or "Under Budget".
*   **🍽️ Menu Integration** *(Beta)*: Daily menu scraping from Makers Cafe to help plan meals (and costs) in advance.
*   **🆔 OneCard Import** *(Beta)*: Manual paste-import of your CCA OneWeb statement — no login, no scraping, no credentials. See [`backend/ONECARD_SETUP.md`](backend/ONECARD_SETUP.md).
*   **📱 Responsive Design**: Fully optimized for mobile use, allowing students to check their status while in line.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework**: React 19
*   **Styling**: Tailwind CSS + Radix UI (base components) + Lucide React (icons)
*   **Build Tool**: Craco (Create React App Configuration Override)
*   **Visualization**: Recharts
*   **Auth Client**: Firebase Web SDK (Auth)

### Backend
*   **Framework**: FastAPI (Python)
*   **Database**: MongoDB (Motor async driver)
*   **Authentication**: Firebase Auth — backend verifies Firebase ID tokens via Google's public x509 certs (no service account required for verify-only)
*   **AI/ML**: OpenAI GPT-4o (via `emergentintegrations`) for OCR and data extraction
*   **Scheduling**: APScheduler (daily cafe menu scrape)
*   **OneCard**: manual statement paste-import — text parser, no scraping, no credentials

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (v3.10+)
*   MongoDB (Local or Atlas URI)
*   A Firebase project (free tier is fine) — get your Web SDK config from **Project settings → General → Your apps**

### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Create a `.env` file in the `backend` directory (see [Environment Variables](#environment-variables)).
5.  Run the server:
    ```bash
    uvicorn server:app --reload --port 8000
    ```

### 2. Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` in the `frontend` directory with your Firebase Web SDK config (see [Environment Variables](#environment-variables)).
4.  Start the development server:
    ```bash
    npm start
    ```
5.  The app opens at `http://localhost:3000`.

---

## 🔐 Environment Variables

### `backend/.env`

```ini
# Database
MONGO_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=makerstab

# Firebase (verify ID tokens issued by the frontend)
FIREBASE_PROJECT_ID=makerstab-app-001

# AI / OCR (used by the receipt scanner)
EMERGENT_LLM_KEY=your_openai_api_key
```

### `frontend/.env`

All client-side keys must be prefixed `REACT_APP_` so CRA exposes them.

```ini
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=makerstab-app-001.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=makerstab-app-001
REACT_APP_FIREBASE_STORAGE_BUCKET=makerstab-app-001.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

> The Firebase Web SDK `apiKey` is a public identifier, **not** a secret. Security comes from Firebase Auth providers + Firestore/Storage security rules — not from hiding this value.

---

## 🆔 OneCard Import (manual)

MakersTab does **not** connect to TouchNet, store CCA credentials, or scrape
anything. The OneCard page is a manual paste-import:

1.  The student opens their OneWeb Current Statement themselves and copies the table.
2.  They paste it into MakersTab's `/onecard` page and click **Import**.
3.  The backend parses the text into balance + transaction records and stores
    only those records. Duplicates are skipped via a fingerprint.

Receipt OCR is still the primary balance source — this is just for backfilling
history you didn't snap a receipt for. Full detail in
[`backend/ONECARD_SETUP.md`](backend/ONECARD_SETUP.md).

---

## 📂 Project Structure

```
makerstab/
├── backend/
│   ├── server.py             # FastAPI app, routes, scheduler, Mongo init
│   ├── firebase_auth.py      # Firebase ID token verifier (no service account needed)
│   ├── menu_scraper.py       # Cafe Bon Appetit menu scraper
│   ├── onecard.py            # OneCard manual paste-import: parser + routes
│   ├── ONECARD_SETUP.md      # OneCard import design + parser notes
│   ├── requirements.txt
│   └── .env                  # Not committed
├── frontend/
│   ├── src/
│   │   ├── App.js            # Routes + Firebase Auth state
│   │   ├── pages/            # AuthPage, Dashboard, AdminDashboard, OneCardSettings, ...
│   │   ├── components/ui/    # shadcn/ui (vendored)
│   │   ├── hooks/            # useOneCard, ...
│   │   ├── lib/firebase.js   # Firebase initialization + getAuthHeaders()
│   │   └── services/         # onecardApi.js, mockApi.js
│   ├── package.json
│   └── .env                  # Not committed
└── README.md
```

---

## 🔮 Future Roadmap

*   **Firestore Migration**: Replace MongoDB collections with Firestore (currently auth is Firebase, storage is Mongo).
*   **OneCard parser hardening**: Tighten `parse_statement()` in `onecard.py` against more real pasted-statement samples (current parser is anchored on the ISO datetime + End Amount line).
*   **Social Features**: Compare spending trends (anonymously) with campus averages.
*   **Nutritional Tracking**: Link menu items to nutritional data.
*   **Chrome Extension**: For online ordering integration.
