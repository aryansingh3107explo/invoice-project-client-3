/**
 * SleekInvoice - Premium Invoice Generator App Logic
 */

// ================= DOM ELEMENTS =================
const DOM = {
    // Auth Sections
    authSection: document.getElementById('auth-section'),
    authForm: document.getElementById('auth-form'),
    authUsername: document.getElementById('auth-username'),
    authPassword: document.getElementById('auth-password'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authCardTitle: document.getElementById('auth-card-title'),
    authCardSubtitle: document.getElementById('auth-card-subtitle'),
    authToggleText: document.getElementById('auth-toggle-text'),
    authToggleLink: document.getElementById('auth-toggle-link'),

    // App Sections
    appSection: document.getElementById('app-section'),
    userAvatar: document.getElementById('user-avatar'),
    userDisplayName: document.getElementById('user-display-name'),
    headerWelcomeMsg: document.getElementById('header-welcome-msg'),
    currentDate: document.getElementById('current-date'),
    btnSignout: document.getElementById('btn-signout'),
    toastContainer: document.getElementById('toast-container'),

    // Navigation Tabs
    navCreate: document.getElementById('nav-create'),
    navHistory: document.getElementById('nav-history'),
    tabCreatePage: document.getElementById('page-create'),
    tabHistoryPage: document.getElementById('page-history'),

    // Invoice Form Fields
    invoiceForm: document.getElementById('invoice-form'),
    senderName: document.getElementById('sender-name'),
    senderEmail: document.getElementById('sender-email'),
    senderAddress: document.getElementById('sender-address'),
    clientName: document.getElementById('client-name'),
    clientEmail: document.getElementById('client-email'),
    clientAddress: document.getElementById('client-address'),
    invoiceNum: document.getElementById('invoice-num'),
    invoiceDate: document.getElementById('invoice-date'),
    invoiceDueDate: document.getElementById('invoice-due-date'),
    invoiceCurrency: document.getElementById('invoice-currency'),
    invoiceNotes: document.getElementById('invoice-notes'),
    invoiceItemsBody: document.getElementById('invoice-items-body'),
    btnAddItem: document.getElementById('btn-add-item'),
    discountPct: document.getElementById('invoice-discount-pct'),
    taxPct: document.getElementById('invoice-tax-pct'),
    calcGrandTotal: document.getElementById('calc-grand-total'),
    btnSaveInvoice: document.getElementById('btn-save-invoice'),
    btnDownloadPdf: document.getElementById('btn-download-pdf'),

    // Invoice PDF Preview elements
    pdfSenderName: document.getElementById('pdf-sender-name'),
    pdfSenderDetails: document.getElementById('pdf-sender-details'),
    pdfInvoiceNum: document.getElementById('pdf-invoice-num'),
    pdfClientName: document.getElementById('pdf-client-name'),
    pdfClientDetails: document.getElementById('pdf-client-details'),
    pdfDateIssued: document.getElementById('pdf-date-issued'),
    pdfDateDue: document.getElementById('pdf-date-due'),
    pdfItemsBody: document.getElementById('pdf-items-body'),
    pdfNotesContent: document.getElementById('pdf-notes-content'),
    pdfSubtotal: document.getElementById('pdf-subtotal'),
    pdfDiscount: document.getElementById('pdf-discount'),
    pdfTax: document.getElementById('pdf-tax'),
    pdfTotalAmount: document.getElementById('pdf-total-amount'),
    invoicePdfElement: document.getElementById('invoice-pdf-element'),

    // Past Invoices (History)
    searchHistory: document.getElementById('search-history'),
    historyEmptyView: document.getElementById('history-empty-view'),
    historyGrid: document.getElementById('history-grid'),
};

// ================= APP STATE =================
let state = {
    currentUser: null,
    isSignUpMode: false,
    activeTab: 'page-create',
    invoiceItems: [], // Array of { id, description, qty, rate }
    activeEditingInvoiceId: null, // Tracks if we are editing an existing invoice
};

// ================= TOAST NOTIFICATIONS =================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    // Fade and remove toast after 3.5s
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 3500);
}

// ================= HELPER FUNCTIONS =================
// Safe storage wrapper to prevent crashes when cookies/localStorage are blocked
const SafeStorage = {
    memoryDb: {},
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn("localStorage is blocked or unavailable:", e);
            return this.memoryDb[key] || null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn("localStorage is blocked or unavailable:", e);
            this.memoryDb[key] = value;
        }
    },
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn("localStorage is blocked or unavailable:", e);
            delete this.memoryDb[key];
        }
    }
};

const SafeSession = {
    memoryDb: {},
    getItem(key) {
        try {
            return sessionStorage.getItem(key);
        } catch (e) {
            console.warn("sessionStorage is blocked or unavailable:", e);
            return this.memoryDb[key] || null;
        }
    },
    setItem(key, value) {
        try {
            sessionStorage.setItem(key, value);
        } catch (e) {
            console.warn("sessionStorage is blocked or unavailable:", e);
            this.memoryDb[key] = value;
        }
    },
    removeItem(key) {
        try {
            sessionStorage.removeItem(key);
        } catch (e) {
            console.warn("sessionStorage is blocked or unavailable:", e);
            delete this.memoryDb[key];
        }
    }
};

// Date Formatter Helper
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Simple custom hashing utility to secure passwords locally
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return hash.toString(16);
}

// Check session on load
function initSession() {
    const sessionUser = SafeSession.getItem('sleek_logged_in_user');
    if (sessionUser) {
        loginUser(sessionUser, false);
    } else {
        showAuthScreen();
    }
    
    // Set Header Date
    const today = new Date();
    DOM.currentDate.textContent = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ================= AUTHENTICATION =================
function showAuthScreen() {
    state.currentUser = null;
    sessionStorage.removeItem('sleek_logged_in_user');
    
    DOM.appSection.style.display = 'none';
    DOM.authSection.style.display = 'flex';
    
    // Reset Form
    DOM.authForm.reset();
    setSignUpMode(false);
}

function setSignUpMode(isSignUp) {
    state.isSignUpMode = isSignUp;
    if (isSignUp) {
        DOM.authCardTitle.textContent = 'Create an Account';
        DOM.authCardSubtitle.textContent = 'Register to build and sync your invoices';
        DOM.authSubmitBtn.querySelector('span').textContent = 'Sign Up';
        DOM.authSubmitBtn.querySelector('i').className = 'fa-solid fa-user-plus';
        DOM.authToggleText.textContent = 'Already have an account?';
        DOM.authToggleLink.textContent = 'Sign In';
    } else {
        DOM.authCardTitle.textContent = 'Welcome to SleekInvoice';
        DOM.authCardSubtitle.textContent = 'Sign in to access your dashboard';
        DOM.authSubmitBtn.querySelector('span').textContent = 'Sign In';
        DOM.authSubmitBtn.querySelector('i').className = 'fa-solid fa-arrow-right-to-bracket';
        DOM.authToggleText.textContent = "Don't have an account?";
        DOM.authToggleLink.textContent = 'Sign Up';
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();
    const username = DOM.authUsername.value.trim().toLowerCase();
    const password = DOM.authPassword.value;

    if (!username || !password) {
        showToast('Please fill out all credentials', 'error');
        return;
    }

    // Load registered users from localstorage
    let users = JSON.parse(SafeStorage.getItem('sleek_users')) || {};

    if (state.isSignUpMode) {
        // Register flow
        if (users[username]) {
            showToast('Username already exists', 'error');
            return;
        }

        // Store hashed credentials
        users[username] = hashPassword(password);
        SafeStorage.setItem('sleek_users', JSON.stringify(users));
        showToast('Account registered successfully!', 'success');
        
        // Auto sign-in after register
        loginUser(username);
    } else {
        // Login flow
        const hashedPassword = hashPassword(password);
        if (users[username] && users[username] === hashedPassword) {
            loginUser(username);
        } else {
            showToast('Invalid username or password', 'error');
        }
    }
}

function loginUser(username, notify = true) {
    state.currentUser = username;
    SafeSession.setItem('sleek_logged_in_user', username);
    
    // UI Transitions
    DOM.authSection.style.display = 'none';
    DOM.appSection.style.display = 'flex';
    
    // Set avatars and profile text
    DOM.userAvatar.textContent = username.substring(0, 2).toUpperCase();
    DOM.userDisplayName.textContent = username;
    DOM.headerWelcomeMsg.textContent = `Welcome, ${username.charAt(0).toUpperCase() + username.slice(1)}`;
    
    if (notify) {
        showToast(`Successfully signed in as ${username}`, 'success');
    }

    // Load initial views
    switchTab('page-create');
    resetInvoiceForm();
}

function handleSignOut() {
    showToast('Signed out successfully', 'info');
    showAuthScreen();
}

// ================= NAVIGATION =================
function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Toggle navigation classes
    if (tabId === 'page-create') {
        DOM.navCreate.classList.add('active');
        DOM.navHistory.classList.remove('active');
        DOM.tabCreatePage.classList.add('active');
        DOM.tabHistoryPage.classList.remove('active');
    } else if (tabId === 'page-history') {
        DOM.navCreate.classList.remove('active');
        DOM.navHistory.classList.add('active');
        DOM.tabCreatePage.classList.remove('active');
        DOM.tabHistoryPage.classList.add('active');
        
        // Fetch saved invoices
        loadSavedInvoicesList();
    }
}

// ================= INVOICE GENERATOR FORM SYSTEM =================
function resetInvoiceForm() {
    DOM.invoiceForm.reset();
    
    // Set default invoice meta values
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 14); // default Net 14
    const formattedDueDate = dueDate.toISOString().split('T')[0];
    
    DOM.invoiceDate.value = formattedToday;
    DOM.invoiceDueDate.value = formattedDueDate;
    
    // Default invoice ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    DOM.invoiceNum.value = `INV-${today.getFullYear()}-${randomSuffix}`;
    DOM.invoiceNotes.value = 'Thank you for your business! Payment is expected within due date.';
    
    DOM.discountPct.value = '0';
    DOM.taxPct.value = '0';
    
    state.activeEditingInvoiceId = null;
    state.invoiceItems = [];
    
    // Add one initial default empty row
    addInvoiceItemRow();
    
    // Perform calculations and synchronize preview
    recalculateInvoice();
}

function addInvoiceItemRow(description = '', qty = 1, rate = 0) {
    const id = 'item_' + Date.now() + Math.random().toString(36).substr(2, 5);
    const item = { id, description, qty, rate };
    state.invoiceItems.push(item);
    
    renderFormItemRow(item);
    recalculateInvoice();
}

function renderFormItemRow(item) {
    const currency = DOM.invoiceCurrency ? DOM.invoiceCurrency.value : '$';
    const tr = document.createElement('tr');
    tr.id = item.id;
    tr.innerHTML = `
        <td class="col-desc">
            <input class="form-control item-desc-input" type="text" value="${item.description}" placeholder="Description of service/product..." required>
        </td>
        <td class="col-qty">
            <input class="form-control item-qty-input" style="text-align: center;" type="number" min="1" value="${item.qty}" required>
        </td>
        <td class="col-rate">
            <input class="form-control item-rate-input" style="text-align: right;" type="number" min="0" step="0.01" value="${item.rate.toFixed(2)}" required>
        </td>
        <td class="col-amount" style="text-align: right;">${currency}${(item.qty * item.rate).toFixed(2)}</td>
        <td class="col-delete">
            <button type="button" class="btn-delete-row" title="Delete Item">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </td>
    `;
    
    // Add Input Listeners to Row elements to sync data
    const descInput = tr.querySelector('.item-desc-input');
    const qtyInput = tr.querySelector('.item-qty-input');
    const rateInput = tr.querySelector('.item-rate-input');
    const deleteBtn = tr.querySelector('.btn-delete-row');
    const amountCol = tr.querySelector('.col-amount');
    
    const updateLocalItemState = () => {
        const idx = state.invoiceItems.findIndex(i => i.id === item.id);
        if (idx !== -1) {
            state.invoiceItems[idx].description = descInput.value;
            state.invoiceItems[idx].qty = parseInt(qtyInput.value) || 0;
            state.invoiceItems[idx].rate = parseFloat(rateInput.value) || 0;
            
            // Update row total
            const amount = state.invoiceItems[idx].qty * state.invoiceItems[idx].rate;
            const curr = DOM.invoiceCurrency ? DOM.invoiceCurrency.value : '$';
            amountCol.textContent = `${curr}${amount.toFixed(2)}`;
            
            recalculateInvoice();
        }
    };
    
    descInput.addEventListener('input', updateLocalItemState);
    qtyInput.addEventListener('input', updateLocalItemState);
    rateInput.addEventListener('input', updateLocalItemState);
    
    deleteBtn.addEventListener('click', () => {
        removeInvoiceItemRow(item.id);
    });
    
    DOM.invoiceItemsBody.appendChild(tr);
}

function removeInvoiceItemRow(id) {
    // If only one row is left, don't allow deleting it (prevent empty tables)
    if (state.invoiceItems.length <= 1) {
        showToast('Invoices must have at least one line item', 'warning');
        return;
    }
    
    state.invoiceItems = state.invoiceItems.filter(i => i.id !== id);
    const rowEl = document.getElementById(id);
    if (rowEl) rowEl.remove();
    
    recalculateInvoice();
}

// ================= CALCULATIONS & PREVIEW SYNC =================
function recalculateInvoice() {
    // Calculate subtotals
    let subtotal = 0;
    state.invoiceItems.forEach(item => {
        subtotal += item.qty * item.rate;
    });
    
    // Fetch percentages
    const taxPercentage = parseFloat(DOM.taxPct.value) || 0;
    const discountPercentage = parseFloat(DOM.discountPct.value) || 0;
    
    // Calculate discount, taxable amount, tax, and final grand total
    const discountAmount = subtotal * (discountPercentage / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxPercentage / 100);
    const grandTotal = taxableAmount + taxAmount;
    
    const currency = DOM.invoiceCurrency ? DOM.invoiceCurrency.value : '$';
    
    // Update active calculations values on screen
    DOM.calcGrandTotal.textContent = `${currency}${grandTotal.toFixed(2)}`;
    
    // Update amount display currency in form table
    state.invoiceItems.forEach(item => {
        const rowEl = document.getElementById(item.id);
        if (rowEl) {
            const amountCol = rowEl.querySelector('.col-amount');
            if (amountCol) {
                amountCol.textContent = `${currency}${(item.qty * item.rate).toFixed(2)}`;
            }
        }
    });
    
    // Synchronize Form Values to the PDF Preview container
    syncPreviewData({
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total: grandTotal
    });
}

function syncPreviewData(calcs) {
    const currency = DOM.invoiceCurrency ? DOM.invoiceCurrency.value : '$';
    
    // Top headers
    DOM.pdfSenderName.textContent = DOM.senderName.value || 'Sender Corporation';
    
    const senderDetails = [];
    if (DOM.senderEmail.value) senderDetails.push(DOM.senderEmail.value);
    if (DOM.senderAddress.value) senderDetails.push(DOM.senderAddress.value);
    DOM.pdfSenderDetails.innerHTML = senderDetails.join('<br>') || 'sender@domain.com<br>Sender Office Location';
    
    DOM.pdfInvoiceNum.textContent = DOM.invoiceNum.value ? `#${DOM.invoiceNum.value}` : '#INV-XXXX';
    
    // Client section
    DOM.pdfClientName.textContent = DOM.clientName.value || 'Client Business / Name';
    
    const clientDetails = [];
    if (DOM.clientEmail.value) clientDetails.push(DOM.clientEmail.value);
    if (DOM.clientAddress.value) clientDetails.push(DOM.clientAddress.value);
    DOM.pdfClientDetails.innerHTML = clientDetails.join('<br>') || 'client@domain.com<br>Client Address';
    
    // Dates
    DOM.pdfDateIssued.textContent = formatDate(DOM.invoiceDate.value) || '--/--/----';
    DOM.pdfDateDue.textContent = formatDate(DOM.invoiceDueDate.value) || '--/--/----';
    
    // PDF Items rows
    DOM.pdfItemsBody.innerHTML = '';
    state.invoiceItems.forEach(item => {
        const tr = document.createElement('tr');
        const desc = item.description || 'Line Item Description';
        const qty = item.qty || 0;
        const rate = item.rate || 0;
        const total = qty * rate;
        
        tr.innerHTML = `
            <td class="pdf-col-desc">${desc}</td>
            <td class="pdf-col-qty" style="text-align: center;">${qty}</td>
            <td class="pdf-col-rate" style="text-align: right;">${currency}${rate.toFixed(2)}</td>
            <td class="pdf-col-total" style="text-align: right;">${currency}${total.toFixed(2)}</td>
        `;
        DOM.pdfItemsBody.appendChild(tr);
    });
    
    // Fallback row if no items are defined in rendering list
    if (state.invoiceItems.length === 0) {
        DOM.pdfItemsBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-tertiary);">No items configured</td>
            </tr>
        `;
    }
    
    // Notes & bottom values
    DOM.pdfNotesContent.textContent = DOM.invoiceNotes.value || 'No additional terms specified.';
    
    DOM.pdfSubtotal.textContent = `${currency}${calcs.subtotal.toFixed(2)}`;
    DOM.pdfDiscount.textContent = `-${currency}${calcs.discount.toFixed(2)}`;
    DOM.pdfTax.textContent = `+${currency}${calcs.tax.toFixed(2)}`;
    DOM.pdfTotalAmount.textContent = `${currency}${calcs.total.toFixed(2)}`;
}

// Bind live triggers to main form inputs to update preview immediately
const livePreviewInputs = [
    DOM.senderName, DOM.senderEmail, DOM.senderAddress,
    DOM.clientName, DOM.clientEmail, DOM.clientAddress,
    DOM.invoiceNum, DOM.invoiceDate, DOM.invoiceDueDate,
    DOM.invoiceNotes, DOM.taxPct, DOM.discountPct, DOM.invoiceCurrency
];

livePreviewInputs.forEach(input => {
    input.addEventListener('input', recalculateInvoice);
});

// ================= DATA PERSISTENCE =================
function handleSaveInvoice() {
    // Form verification prior to saving
    if (!DOM.invoiceForm.checkValidity()) {
        DOM.invoiceForm.reportValidity();
        showToast('Please verify and fill out all required invoice details', 'error');
        return;
    }
    
    // Items verification
    const validItems = state.invoiceItems.filter(i => i.description.trim() !== '');
    if (validItems.length === 0) {
        showToast('Invoice must contain at least one valid line item with description', 'error');
        return;
    }
    
    const invoiceNumber = DOM.invoiceNum.value.trim();
    const dbKey = `sleek_invoices_${state.currentUser}`;
    let userInvoices = JSON.parse(SafeStorage.getItem(dbKey)) || [];
    
    // Check duplicate invoice numbers if we are NOT currently editing
    if (!state.activeEditingInvoiceId) {
        const isDuplicateNum = userInvoices.some(inv => inv.invoiceNum.toLowerCase() === invoiceNumber.toLowerCase());
        if (isDuplicateNum) {
            showToast(`An invoice with ID ${invoiceNumber} already exists. Please choose a unique number.`, 'error');
            return;
        }
    }
    
    // Recalculations variables
    let subtotal = 0;
    state.invoiceItems.forEach(i => subtotal += i.qty * i.rate);
    const discPct = parseFloat(DOM.discountPct.value) || 0;
    const taxPctVal = parseFloat(DOM.taxPct.value) || 0;
    const discount = subtotal * (discPct / 100);
    const tax = (subtotal - discount) * (taxPctVal / 100);
    const total = subtotal - discount + tax;
    
    // Save state payload
    const invoiceId = state.activeEditingInvoiceId || 'inv_' + Date.now();
    const invoicePayload = {
        id: invoiceId,
        invoiceNum: invoiceNumber,
        currency: DOM.invoiceCurrency.value,
        senderName: DOM.senderName.value.trim(),
        senderEmail: DOM.senderEmail.value.trim(),
        senderAddress: DOM.senderAddress.value.trim(),
        clientName: DOM.clientName.value.trim(),
        clientEmail: DOM.clientEmail.value.trim(),
        clientAddress: DOM.clientAddress.value.trim(),
        date: DOM.invoiceDate.value,
        dueDate: DOM.invoiceDueDate.value,
        items: state.invoiceItems.map(i => ({ description: i.description, qty: i.qty, rate: i.rate })),
        notes: DOM.invoiceNotes.value.trim(),
        discountPct: discPct,
        taxPct: taxPctVal,
        subtotal,
        discount,
        tax,
        total,
        updatedAt: new Date().toISOString()
    };
    
    if (state.activeEditingInvoiceId) {
        // Edit flow
        const idx = userInvoices.findIndex(inv => inv.id === invoiceId);
        if (idx !== -1) {
            userInvoices[idx] = invoicePayload;
            showToast(`Invoice ${invoiceNumber} updated successfully!`, 'success');
        } else {
            userInvoices.push(invoicePayload);
            showToast(`Invoice ${invoiceNumber} saved!`, 'success');
        }
    } else {
        // Save new flow
        userInvoices.push(invoicePayload);
        showToast(`Invoice ${invoiceNumber} saved successfully!`, 'success');
    }
    
    SafeStorage.setItem(dbKey, JSON.stringify(userInvoices));
    
    // Reset edit pointer and route to historical archives tab
    state.activeEditingInvoiceId = null;
    switchTab('page-history');
}

// ================= PAST INVOICES ARCHIVE PAGE =================
function loadSavedInvoicesList() {
    const dbKey = `sleek_invoices_${state.currentUser}`;
    const invoices = JSON.parse(SafeStorage.getItem(dbKey)) || [];
    const searchQuery = DOM.searchHistory.value.toLowerCase().trim();
    
    // Filter list based on queries
    const filteredInvoices = invoices.filter(inv => {
        return inv.invoiceNum.toLowerCase().includes(searchQuery) ||
               inv.clientName.toLowerCase().includes(searchQuery) ||
               inv.senderName.toLowerCase().includes(searchQuery);
    });
    
    // Sort by updatedAt or date descending
    filteredInvoices.sort((a, b) => new Date(b.updatedAt || b.date) - new Date(a.updatedAt || a.date));
    
    if (filteredInvoices.length === 0) {
        DOM.historyEmptyView.style.display = 'block';
        DOM.historyGrid.style.display = 'none';
    } else {
        DOM.historyEmptyView.style.display = 'none';
        DOM.historyGrid.style.display = 'grid';
        
        DOM.historyGrid.innerHTML = '';
        filteredInvoices.forEach(inv => {
            const card = document.createElement('div');
            card.className = 'invoice-card';
            card.innerHTML = `
                <div class="card-header-row">
                    <span class="card-invoice-num">#${inv.invoiceNum}</span>
                    <span class="card-invoice-date">${formatDate(inv.date)}</span>
                </div>
                <div class="card-client-name">${inv.clientName}</div>
                <div class="card-company-name">from: ${inv.senderName}</div>
                
                <div class="card-footer-row">
                    <span class="card-total">${inv.currency || '$'}${inv.total.toFixed(2)}</span>
                    <div class="card-actions">
                        <button type="button" class="btn-icon-sm btn-edit-invoice" title="Edit Invoice">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn-icon-sm btn-pdf-invoice" title="Download PDF">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                        <button type="button" class="btn-icon-sm delete btn-delete-invoice" title="Delete Invoice">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Add click events to buttons
            card.querySelector('.btn-edit-invoice').addEventListener('click', () => {
                editPastInvoice(inv);
            });
            
            card.querySelector('.btn-pdf-invoice').addEventListener('click', () => {
                downloadPdfForInvoice(inv);
            });
            
            card.querySelector('.btn-delete-invoice').addEventListener('click', () => {
                deletePastInvoice(inv.id, inv.invoiceNum);
            });
            
            DOM.historyGrid.appendChild(card);
        });
    }
}

function deletePastInvoice(id, number) {
    if (confirm(`Are you sure you want to delete invoice ${number}?`)) {
        const dbKey = `sleek_invoices_${state.currentUser}`;
        let invoices = JSON.parse(SafeStorage.getItem(dbKey)) || [];
        invoices = invoices.filter(inv => inv.id !== id);
        SafeStorage.setItem(dbKey, JSON.stringify(invoices));
        
        showToast(`Invoice ${number} deleted`, 'info');
        loadSavedInvoicesList();
    }
}

function editPastInvoice(inv) {
    state.activeEditingInvoiceId = inv.id;
    
    // Fill up the form fields
    DOM.senderName.value = inv.senderName;
    DOM.senderEmail.value = inv.senderEmail;
    DOM.senderAddress.value = inv.senderAddress;
    DOM.clientName.value = inv.clientName;
    DOM.clientEmail.value = inv.clientEmail;
    DOM.clientAddress.value = inv.clientAddress;
    DOM.invoiceNum.value = inv.invoiceNum;
    DOM.invoiceDate.value = inv.date;
    DOM.invoiceDueDate.value = inv.dueDate;
    DOM.invoiceNotes.value = inv.notes;
    DOM.discountPct.value = inv.discountPct;
    DOM.taxPct.value = inv.taxPct;
    if (DOM.invoiceCurrency && inv.currency) {
        DOM.invoiceCurrency.value = inv.currency;
    }
    
    // Redraw item rows
    DOM.invoiceItemsBody.innerHTML = '';
    state.invoiceItems = [];
    
    inv.items.forEach(item => {
        addInvoiceItemRow(item.description, item.qty, item.rate);
    });
    
    if (inv.items.length === 0) {
        addInvoiceItemRow();
    }
    
    // Trigger updates
    recalculateInvoice();
    
    showToast(`Loaded invoice #${inv.invoiceNum} for editing`, 'info');
    switchTab('page-create');
}

// ================= PDF EXPORT UTILITY =================
function handleDownloadPdf() {
    // Validate form before exporting
    if (!DOM.invoiceForm.checkValidity()) {
        DOM.invoiceForm.reportValidity();
        showToast('Please complete form specifications before generating PDF', 'error');
        return;
    }
    
    const invoiceNumber = DOM.invoiceNum.value || 'XXXX';
    
    // Generate and download
    DOM.invoicePdfElement.classList.add('pdf-printable-area');
    
    const options = {
        margin: 12,
        filename: `invoice-${invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Use html2pdf.js workflow
    html2pdf()
        .from(DOM.invoicePdfElement)
        .set(options)
        .save()
        .then(() => {
            DOM.invoicePdfElement.classList.remove('pdf-printable-area');
            showToast(`PDF exported successfully for #${invoiceNumber}!`, 'success');
        })
        .catch(err => {
            DOM.invoicePdfElement.classList.remove('pdf-printable-area');
            console.error(err);
            showToast('Failed to export PDF file', 'error');
        });
}

// Support direct PDF download from the history card list without changing form state
function downloadPdfForInvoice(inv) {
    // Create an ephemeral render node in the background
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '700px'; // fixed layout scale width
    document.body.appendChild(container);
    
    // Create a copy of the layout elements
    const printableNode = DOM.invoicePdfElement.cloneNode(true);
    printableNode.id = 'ephemeral-pdf-node';
    printableNode.classList.add('pdf-printable-area');
    container.appendChild(printableNode);
    
    // Inject values from the saved invoice payload into this printable node
    printableNode.querySelector('#pdf-sender-name').textContent = inv.senderName;
    
    const senderDetails = [];
    if (inv.senderEmail) senderDetails.push(inv.senderEmail);
    if (inv.senderAddress) senderDetails.push(inv.senderAddress);
    printableNode.querySelector('#pdf-sender-details').innerHTML = senderDetails.join('<br>') || 'sender@domain.com';
    
    printableNode.querySelector('#pdf-invoice-num').textContent = `#${inv.invoiceNum}`;
    printableNode.querySelector('#pdf-client-name').textContent = inv.clientName;
    
    const clientDetails = [];
    if (inv.clientEmail) clientDetails.push(inv.clientEmail);
    if (inv.clientAddress) clientDetails.push(inv.clientAddress);
    printableNode.querySelector('#pdf-client-details').innerHTML = clientDetails.join('<br>') || 'client@domain.com';
    
    printableNode.querySelector('#pdf-date-issued').textContent = formatDate(inv.date);
    printableNode.querySelector('#pdf-date-due').textContent = formatDate(inv.dueDate);
    
    // Items table
    const pdfItemsBody = printableNode.querySelector('#pdf-items-body');
    pdfItemsBody.innerHTML = '';
    const curr = inv.currency || '$';
    inv.items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="pdf-col-desc">${item.description}</td>
            <td class="pdf-col-qty" style="text-align: center;">${item.qty}</td>
            <td class="pdf-col-rate" style="text-align: right;">${curr}${item.rate.toFixed(2)}</td>
            <td class="pdf-col-total" style="text-align: right;">${curr}${(item.qty * item.rate).toFixed(2)}</td>
        `;
        pdfItemsBody.appendChild(tr);
    });
    
    // Notes & Totals
    printableNode.querySelector('#pdf-notes-content').textContent = inv.notes || 'No terms specified.';
    printableNode.querySelector('#pdf-subtotal').textContent = `${curr}${inv.subtotal.toFixed(2)}`;
    printableNode.querySelector('#pdf-discount').textContent = `-${curr}${inv.discount.toFixed(2)}`;
    printableNode.querySelector('#pdf-tax').textContent = `+${curr}${inv.tax.toFixed(2)}`;
    printableNode.querySelector('#pdf-total-amount').textContent = `${curr}${inv.total.toFixed(2)}`;
    
    // Run print job
    const options = {
        margin: 12,
        filename: `invoice-${inv.invoiceNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    showToast(`Generating PDF file for #${inv.invoiceNum}...`, 'info');
    
    html2pdf()
        .from(printableNode)
        .set(options)
        .save()
        .then(() => {
            container.remove();
            showToast(`PDF exported successfully for #${inv.invoiceNum}!`, 'success');
        })
        .catch(err => {
            container.remove();
            console.error(err);
            showToast('Failed to export PDF file', 'error');
        });
}

// ================= INITIAL EVENT LISTENERS =================
// Auth toggle login/signup
DOM.authToggleLink.addEventListener('click', () => {
    setSignUpMode(!state.isSignUpMode);
});

// Auth form submit
DOM.authForm.addEventListener('submit', handleAuthSubmit);

// Sign Out
DOM.btnSignout.addEventListener('click', handleSignOut);

// Navigation tab clicks
DOM.navCreate.addEventListener('click', () => switchTab('page-create'));
DOM.navHistory.addEventListener('click', () => switchTab('page-history'));

// Add dynamic invoice items
DOM.btnAddItem.addEventListener('click', () => addInvoiceItemRow());

// Invoice form submissions/saves
DOM.btnSaveInvoice.addEventListener('click', handleSaveInvoice);
DOM.btnDownloadPdf.addEventListener('click', handleDownloadPdf);

// History filter search input
DOM.searchHistory.addEventListener('input', loadSavedInvoicesList);

// Initialize on window load
window.addEventListener('DOMContentLoaded', initSession);
