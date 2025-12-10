

const LATENCY = 200; // Simulate network delay

const getStorage = (key, defaultVal) => {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultVal;
    try {
        return JSON.parse(stored);
    } catch {
        return defaultVal;
    }
};

const setStorage = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const SEMESTER_START = new Date('2025-08-25');
const SEMESTER_END = new Date('2025-12-15');

const getDaysRemaining = () => {
    const now = new Date();
    // For demo purposes, if we are past the end date, let's treat it as the last week or return 0
    if (now > SEMESTER_END) return 0;

    const diffTime = Math.abs(SEMESTER_END - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const getWeeksRemaining = () => {
    const days = getDaysRemaining();
    return Math.max(1, Math.ceil(days / 7)); // Ensure at least 1 week to avoid division by zero
};

// Initial Data
const INITIAL_SEMESTER_INFO = {
    semester: 'fall',
    status: 'active',
    weeks_remaining: 10,
    days_remaining: 70,
    recommended_weekly_spending: 120.50,
    budget_status: 'on_track',
    status_message: 'On Track',
    time_elapsed_percentage: 45,
    budget_used_percentage: 40,
    ideal_weekly_rate: 120.00,
    actual_weekly_rate: 115.00
};

const INITIAL_CAFE_MENU = {
    display_mode: 'lunch',
    menu: {
        breakfast: [
            { item_id: 101, name: 'Breakfast Burrito', station: 'Grill', description: 'Eggs, cheese, potatoes, sausage', calories: 550, dietary_tags: [] },
            { item_id: 102, name: 'Oatmeal', station: 'Soup', description: 'Steel-cut oats with toppings', calories: 150, dietary_tags: ['vegan', 'gluten-free'] }
        ],
        lunch: [
            { item_id: 1, name: 'Grilled Chicken Sandwich', station: 'Grill', description: 'Served with fries', calories: 650, dietary_tags: [] },
            { item_id: 2, name: 'Vegan Buddha Bowl', station: 'Salad Bar', description: 'Quinoa, roasted veggies, tahini dressing', calories: 450, dietary_tags: ['vegan', 'gluten-free'] },
            { item_id: 3, name: 'Pepperoni Pizza', station: 'Pizza', description: 'Classic pepperoni', calories: 300, dietary_tags: [] }
        ],
        dinner: [
            { item_id: 201, name: 'Pasta Primavera', station: 'Pasta', description: 'Seasonal vegetables in marinara', calories: 500, dietary_tags: ['vegetarian'] },
            { item_id: 202, name: 'Roast Chicken', station: 'Carvery', description: 'Herb roasted chicken with mashed potatoes', calories: 700, dietary_tags: ['gluten-free'] }
        ]
    }
};

const MOCK_RECEIPTS = [
    {
        "id": "receipt_207",
        "userId": "demo-user-123",
        "receipt_date": "2025-11-07T11:32:00",
        "merchant": "Maker's Cafe @ CCA",
        "total": 13.49,
        "memo": "Lunch with team",
        "orderInfo": {
            "orderNumber": "207",
            "systemOrderId": "1368282",
            "orderType": "Take Out",
            "device": "TD22KIOSK2",
            "origin": "Kiosk"
        },
        "payment": {
            "subTotal": 12.74,
            "salesTax": 0.00,
            "fees": 0.75,
            "total": 13.49,
            "remainingBalance": 1298.17
        },
        "items": [
            {
                "name": "Beyond Burger",
                "quantity": 1,
                "price": 11.00,
                "category": "meal",
                "modifiers": [
                    { "name": "White Hamburger Bun", "price": 0.00 },
                    { "name": "American", "price": 0.87 },
                    { "name": "Cheddar", "price": 0.87 }
                ]
            }
        ]
    },
    {
        "id": "receipt_964",
        "userId": "demo-user-123",
        "receipt_date": "2025-11-05T18:45:00",
        "merchant": "Maker's Cafe @ CCA",
        "total": 14.24,
        "memo": "Quick dinner",
        "orderInfo": {
            "orderNumber": "964",
            "systemOrderId": "1365981",
            "orderType": "Take Out",
            "device": "TD22KIOSK1",
            "origin": "Kiosk"
        },
        "payment": {
            "subTotal": 13.49,
            "salesTax": 0.00,
            "fees": 0.75,
            "total": 14.24,
            "remainingBalance": 1363.19
        },
        "items": [
            {
                "name": "Simply Oasis",
                "quantity": 1,
                "price": 13.49,
                "category": "meal",
                "modifiers": []
            }
        ]
    },
    {
        "id": "receipt_171",
        "userId": "demo-user-123",
        "receipt_date": "2025-11-06T15:49:00",
        "merchant": "Maker's Cafe @ CCA",
        "total": 23.99,
        "memo": "Big lunch",
        "orderInfo": {
            "orderNumber": "171",
            "systemOrderId": "1367249",
            "orderType": "Dine In",
            "device": "POSSALAD",
            "origin": "POS"
        },
        "payment": {
            "subTotal": 23.99,
            "salesTax": 0.00,
            "fees": 0.00,
            "total": 23.99,
            "remainingBalance": 1311.66
        },
        "items": [
            { "name": "gng 5.45", "quantity": 1, "price": 5.45, "category": "meal", "modifiers": [] },
            { "name": "NONG SHIM NDL BWL SHIN", "quantity": 1, "price": 3.53, "category": "meal", "modifiers": [] },
            { "name": "Udon Kitsune", "quantity": 2, "price": 4.83, "category": "meal", "modifiers": [] },
            { "name": "Special bar dessert", "quantity": 1, "price": 5.35, "category": "meal", "modifiers": [] }
        ]
    }
];

// Helper to get receipts safely (handling legacy data migration/reset)
const getSafeReceipts = () => {
    try {
        let receipts = getStorage('receipts', MOCK_RECEIPTS);

        // Validation: If receipts exist but are legacy format (missing items array or objects)
        if (Array.isArray(receipts) && receipts.length > 0) {
            const isLegacy = !receipts[0].items || !Array.isArray(receipts[0].items);
            if (isLegacy) {
                console.warn("Detected legacy receipt data. Resetting to default mock data.");
                receipts = MOCK_RECEIPTS;
                setStorage('receipts', receipts);
            }
        } else if (!Array.isArray(receipts)) {
            receipts = MOCK_RECEIPTS;
            setStorage('receipts', receipts);
        }

        return receipts;
    } catch (e) {
        console.error("Error loading receipts:", e);
        return MOCK_RECEIPTS;
    }
};

// Helper to generate transactions from receipts
const generateTransactionsFromReceipts = (receipts) => {
    let transactions = [];
    if (!Array.isArray(receipts)) return [];

    receipts.forEach(receipt => {
        if (!receipt.items || !Array.isArray(receipt.items)) return;

        receipt.items.forEach((item, idx) => {
            // Main item transaction
            transactions.push({
                id: `${receipt.id}-${idx}`,
                receipt_id: receipt.id,
                transaction_date: receipt.receipt_date,
                item_name: item.name,
                category: item.category || 'meal',
                quantity: item.quantity,
                price: item.price
            });
            // Modifiers as separate line items (optional, but good for granularity)
            if (item.modifiers && Array.isArray(item.modifiers)) {
                item.modifiers.forEach((mod, mIdx) => {
                    if (mod.price > 0) {
                        transactions.push({
                            id: `${receipt.id}-${idx}-m${mIdx}`,
                            receipt_id: receipt.id,
                            transaction_date: receipt.receipt_date,
                            item_name: `[Mod] ${mod.name}`,
                            category: 'other',
                            quantity: 1,
                            price: mod.price
                        });
                    }
                });
            }
        });
        // Fees as separate transaction
        if (receipt.payment && receipt.payment.fees > 0) {
            transactions.push({
                id: `${receipt.id}-fee`,
                receipt_id: receipt.id,
                transaction_date: receipt.receipt_date,
                item_name: "Service/Takeout Fee",
                category: 'other',
                quantity: 1,
                price: receipt.payment.fees
            });
        }
    });
    // Sort by date desc
    return transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
};

export const mockApi = {
    auth: {
        signup: async (userData) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    const users = getStorage('users', []);
                    if (users.find(u => u.email === userData.email)) {
                        reject({ response: { data: { detail: 'User already exists' } } });
                        return;
                    }
                    const newUser = { ...userData, id: Date.now(), is_admin: false };
                    users.push(newUser);
                    setStorage('users', users);

                    const token = `mock-token-${newUser.id}`;
                    setStorage('token', token);
                    setStorage('currentUser', newUser);

                    resolve({ data: { token, user: newUser } });
                }, LATENCY);
            });
        },
        login: async ({ email, password }) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    const users = getStorage('users', []);
                    const user = users.find(u => u.email === email && u.password === password);
                    if (!user) {
                        reject({ response: { data: { detail: 'Invalid credentials' } } });
                        return;
                    }

                    const token = `mock-token-${user.id}`;
                    setStorage('token', token);
                    setStorage('currentUser', user);

                    resolve({ data: { token, user } });
                }, LATENCY);
            });
        },
        me: async () => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    let user = getStorage('currentUser', null);
                    if (!user) {
                        reject({ response: { status: 401 } });
                        return;
                    }

                    // Auto-grant admin for demo/testing if not set
                    if (user.is_admin === undefined || user.is_admin === false) {
                        user.is_admin = true;
                        setStorage('currentUser', user);
                    }

                    resolve({ data: user });
                }, LATENCY);
            });
        },
        validatePasscode: async (code) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (code === '9809') {
                        const demoUser = {
                            id: 'demo-user-123',
                            name: 'Demo User',
                            email: 'demo@makerstab.com',
                            meal_plan_amount: 1865,
                            semester: 'fall',
                            is_admin: true
                        };
                        const token = `mock-token-${demoUser.id}`;
                        setStorage('token', token);
                        setStorage('currentUser', demoUser);
                        resolve({ data: { token, user: demoUser } });
                    } else {
                        reject({ response: { data: { detail: 'Invalid passcode' } } });
                    }
                }, LATENCY);
            });
        }
    },

    getData: {
        analytics: async () => {
            const user = getStorage('currentUser', null);
            const allReceipts = getSafeReceipts();
            // Filter by User ID (if user not logged in, show nothing or public? Show nothing for security)
            const receipts = user ? allReceipts.filter(r => r.userId === user.id) : [];

            const transactions = generateTransactionsFromReceipts(receipts);

            const total_spent = transactions.reduce((sum, t) => sum + (t.price * t.quantity), 0);

            // Calculate Current Balance based on the MINIMUM remaining balance across all receipts
            // This assumes the lowest balance recorded is the most up-to-date one, regardless of scan date
            let current_balance = 0;
            if (receipts.length > 0) {
                // Filter receipts that have a valid remaining balance
                const balancedReceipts = receipts.filter(r => r.payment && typeof r.payment.remainingBalance === 'number');

                if (balancedReceipts.length > 0) {
                    // Find the minimum remaining balance
                    current_balance = Math.min(...balancedReceipts.map(r => r.payment.remainingBalance));
                } else {
                    // Fallback if no receipts have balance info
                    current_balance = 1865 - total_spent;
                }
            } else {
                current_balance = 1865; // Default starting amount if no receipts
            }

            // Dynamic Semester Calculations
            const weeks_remaining = getWeeksRemaining();
            const days_remaining = getDaysRemaining();

            // Calculate recommended weekly spending: Balance / Remaining Weeks
            const recommended_weekly_spending = weeks_remaining > 0 ? (current_balance / weeks_remaining) : 0;
            const daily_budget = days_remaining > 0 ? (current_balance / days_remaining) : 0;


            // Mock analytics calculation
            const categories = {};
            transactions.forEach(t => {
                categories[t.category] = (categories[t.category] || 0) + (t.price * t.quantity);
            });

            return Promise.resolve({
                data: {
                    current_balance, // New field
                    total_spent,
                    transactions_count: transactions.length,
                    spending_trend: [], // simplified
                    spending_by_category: categories,
                    // Pass dynamic semester stats here to update the UI
                    semester_stats: {
                        weeks_remaining,
                        days_remaining,
                        recommended_weekly_spending,
                        daily_budget
                    }
                }
            });
        },
        receipts: async () => {
            const user = getStorage('currentUser', null);
            const allReceipts = getSafeReceipts();
            const receipts = user ? allReceipts.filter(r => r.userId === user.id) : [];

            // Ensure receipts are sorted by date (newest first)
            receipts.sort((a, b) => new Date(b.receipt_date) - new Date(a.receipt_date));
            return Promise.resolve({ data: { receipts: receipts } });
        },
        transactions: async () => {
            const user = getStorage('currentUser', null);
            const allReceipts = getSafeReceipts();
            const receipts = user ? allReceipts.filter(r => r.userId === user.id) : [];

            const transactions = generateTransactionsFromReceipts(receipts);
            return Promise.resolve({ data: { transactions: transactions } });
        },
        menu: async () => {
            return Promise.resolve({ data: [] });
        },
        semesterInfo: async () => {
            // We can fetch balance to do a standalone calc, but for now just return timestamps
            // The dashboard mainly gets this from 'analytics' now
            return Promise.resolve({
                data: {
                    ...INITIAL_SEMESTER_INFO,
                    weeks_remaining: getWeeksRemaining(),
                    days_remaining: getDaysRemaining()
                }
            });
        },
        cafeMenu: async () => {
            return Promise.resolve({ data: INITIAL_CAFE_MENU });
        }
    },

    receipts: {
        preview: async (formData) => {
            // Simulate OCR response for a new burger receipt
            return new Promise(resolve => {
                setTimeout(() => {
                    // Simulate a purchase made 2 hours ago, NOT "now"
                    const purchaseDate = new Date();
                    purchaseDate.setHours(purchaseDate.getHours() - 2);

                    // Calculate dynamic remaining balance for more realistic testing
                    const receipts = getSafeReceipts();
                    // Filter mainly for this user if possible, but mock preview is user-agnostic or we assume current user.
                    // For simply making the balance change:
                    let currentBalance = 1865.00;
                    if (receipts.length > 0) {
                        const balancedReceipts = receipts.filter(r => r.payment && typeof r.payment.remainingBalance === 'number');
                        if (balancedReceipts.length > 0) {
                            currentBalance = Math.min(...balancedReceipts.map(r => r.payment.remainingBalance));
                        }
                    }

                    const transactionTotal = 13.49;
                    const newBalance = currentBalance - transactionTotal;

                    resolve({
                        data: {
                            ocr_text: "Mock Scanned Text",
                            preview_data: {
                                merchant: "Maker's Cafe @ CCA",
                                date: purchaseDate.toISOString(),
                                orderInfo: {
                                    orderNumber: "888",
                                    systemOrderId: String(Math.floor(Math.random() * 1000000)),
                                    orderType: "Take Out",
                                    device: "TD22KIOSK1",
                                    origin: "Kiosk"
                                },
                                payment: {
                                    subTotal: 12.74,
                                    salesTax: 0.00,
                                    fees: 0.75,
                                    total: transactionTotal,
                                    remainingBalance: Number(newBalance.toFixed(2))
                                },
                                items: [
                                    {
                                        name: "Beyond Burger",
                                        quantity: 1,
                                        price: 11.00,
                                        category: "meal",
                                        modifiers: [
                                            { name: "American", price: 0.87 },
                                            { name: "Cheddar", price: 0.87 }
                                        ]
                                    }
                                ]
                            }
                        }
                    });
                }, 300);
            });
        },
        confirm: async (data/*: { parsed_data, ocr_text, memo }*/) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    const receipts = getSafeReceipts();
                    const newReceiptData = data.parsed_data;

                    // Duplicate Check
                    // 1. Check by systemOrderId (most reliable)
                    // 2. Fallback to orderNumber + date + total
                    const isDuplicate = receipts.some(r => {
                        if (newReceiptData.orderInfo?.systemOrderId && r.orderInfo?.systemOrderId) {
                            return newReceiptData.orderInfo.systemOrderId === r.orderInfo.systemOrderId;
                        }
                        // Fallback check
                        if (newReceiptData.orderInfo?.orderNumber && r.orderInfo?.orderNumber) {
                            const sameOrderNum = newReceiptData.orderInfo.orderNumber === r.orderInfo.orderNumber;
                            const sameDate = new Date(r.receipt_date).getTime() === new Date(newReceiptData.date).getTime();
                            const sameTotal = Math.abs(r.total - (newReceiptData.payment?.total || newReceiptData.total)) < 0.01;
                            return sameOrderNum && sameDate && sameTotal;
                        }
                        return false;
                    });

                    if (isDuplicate) {
                        resolve({
                            data: {
                                success: false,
                                message: 'Duplicate receipt detected. This receipt has already been uploaded.'
                            },
                            // If client expects error status for toast:
                            error: "Duplicate receipt"
                        });
                        return;
                    }

                    let user = getStorage('currentUser', null);
                    if (!user) {
                        // Fallback or error, for now we might fail or continue without ID
                        // Ideally we reject if not logged in
                    }

                    const newReceipt = {
                        id: `receipt_${Date.now()}`,
                        userId: user ? user.id : 'anonymous', // Binds receipt to user
                        receipt_date: newReceiptData.date || new Date().toISOString(),
                        memo: data.memo,
                        merchant: newReceiptData.merchant,
                        total: newReceiptData.payment ? newReceiptData.payment.total : newReceiptData.total,
                        // Store the full structure
                        orderInfo: newReceiptData.orderInfo,
                        payment: newReceiptData.payment,
                        items: newReceiptData.items
                    };

                    allReceipts.unshift(newReceipt);
                    setStorage('receipts', allReceipts);
                    // No need to set transactions separately, we derive them dynamically now in mock

                    resolve({ data: { success: true } });
                }, LATENCY);
            });
        },
        'delete': async (id) => {
            const newReceipts = receipts.filter(r => r.id !== id);
            setStorage('receipts', newReceipts);
            return Promise.resolve({ data: { success: true } });
        }
    }
};

