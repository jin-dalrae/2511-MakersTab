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
*   **📱 Responsive Design**: Fully optimized for mobile use, allowing students to check their status while in line.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework**: React 19
*   **Styling**: Tailwind CSS + Radix UI (base components) + Lucide React (icons)
*   **Build Tool**: Craco (Create React App Configuration Override)
*   **Visualization**: Recharts

### Backend
*   **Framework**: FastAPI (Python)
*   **Database**: MongoDB (Motor async driver)
*   **Authentication**: JWT (JSON Web Tokens) + BCrypt
*   **AI/ML**: OpenAI GPT-4o (via `emergentintegrations`) for OCR and data extraction
*   **Scheduling**: APScheduler (for menu scraping jobs)

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v16+)
*   Python (v3.9+)
*   MongoDB (Local or Atlas URI)

### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
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
    # or
    yarn install
    ```
3.  Start the development server:
    ```bash
    npm start
    # or
    yarn start
    ```
4.  The app should open at `http://localhost:3000`.

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory with the following keys:

```ini
# Database
MONGO_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=makerstab

# Security
JWT_SECRET=your_super_secret_jwt_skey

# AI / Agents
EMERGENT_LLM_KEY=your_openai_api_key  # Used for OCR service
```

---

## 📂 Project Structure

```
makerstab/
├── backend/
│   ├── server.py            # Main FastAPI application & API Routes
│   ├── menu_scraper.py      # Scraper for Cafe Bon Appetit
│   ├── requirements.txt     # Python dependencies
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page layouts (Dashboard, Login, etc.)
│   │   ├── services/        # API calls (axios)
│   │   └── App.js           # Main Entry point
│   ├── package.json         # Js dependencies
│   └── ...
└── README.md
```

---

## 🔮 Future Roadmap

*   **Social Features**: Compare spending trends (anonymously) with campus averages.
*   **Nutritional Tracking**: Link menu items to nutritional data.
*   **Chrome Extension**: For online ordering integration.
