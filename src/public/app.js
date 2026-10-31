/**
 * Brightloop Software - Subscription Management System Frontend Engine
 * Focus: Member 3 (Recurring Billing, Invoices & Payments) + Cross-Module Integration
 */

let currentRole = 'admin';
let authToken = '';
let currentUser = { name: 'Elena Rostova', role: 'admin', email: 'admin@brightloop.com' };
let currentTab = 'dashboard';
let cachedInvoices = [];
let cachedSubscriptions = [];

// Pre-seeded credentials map for fast role switching during demo
const DEMO_CREDENTIALS = {
  admin: { email: 'admin@brightloop.com', password: 'BrightLoop#2026', name: 'Elena Rostova' },
  staff: { email: 'staff@brightloop.com', password: 'BrightLoop#2026', name: 'Marcus Chen' },
  customer: { email: 'alex@acme.com', password: 'BrightLoop#2026', name: 'Alex Turner' }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  // Set default dates
  const today = new Date().toISOString().slice(0, 10);
  const billingDateInput = document.getElementById('billingAsOfDate');
  if (billingDateInput) billingDateInput.value = today;

  // Auto-login as Admin initially
  await switchRole('admin');
});

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center space-x-2 transition-all ${
    type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-emerald-400'
  }`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Switch Demo Role (Admin, Staff, Customer)
async function switchRole(role) {
  currentRole = role;

  // Highlight active role button in topbar
  ['admin', 'staff', 'customer'].forEach(r => {
    const btn = document.getElementById(`roleBtn-${r}`);
    if (btn) {
      if (r === role) {
        btn.className = 'px-2.5 py-1 rounded bg-white font-semibold text-indigo-600 shadow-sm';
      } else {
        btn.className = 'px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 font-medium';
      }
    }
  });

  const creds = DEMO_CREDENTIALS[role];
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    authToken = data.token;
    currentUser = data.user;

    // Update navbar
    document.getElementById('currentUserNav').textContent = currentUser.name;
    document.getElementById('currentRoleBadge').textContent = currentUser.role.toUpperCase();
    document.getElementById('userInitials').textContent = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2);

    showToast(`Switched identity to ${currentUser.name} (${currentUser.role.toUpperCase()})`);

    // Reload active tab
    if (currentUser.role === 'customer') {
      navigateTab('portal');
    } else {
      refreshActiveTab();
    }
  } catch (err) {
    showToast(`Role switch failed: ${err.message}`, 'error');
  }
}

// Tab Navigation
function navigateTab(tabId) {
  currentTab = tabId;

  // Update sidebar active state
  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Switch visible tab panel
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.add('hidden');
  });

  const targetSection = document.getElementById(`tab-${tabId}`);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }

  refreshActiveTab();
}

function refreshActiveTab() {
  switch (currentTab) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'billing-runner':
      loadBillingRunner();
      break;
    case 'invoices':
      loadInvoices();
      break;
    case 'payments':
      loadPayments();
      break;
    case 'overdue':
      loadOverdueReport();
      break;
    case 'products-plans':
      loadCatalog();
      break;
    case 'subscriptions':
      loadSubscriptions();
      break;
    case 'portal':
      loadPortal();
      break;
  }
}

// -------------------------------------------------------------
// 1. DASHBOARD MODULE (MEMBER 4 INTEGRATION)
// -------------------------------------------------------------
async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard/stats', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const stats = await res.json();

    document.getElementById('kpi-active-subs').textContent = stats.activeSubscriptions || 0;
    document.getElementById('kpi-total-revenue').textContent = `$${Number(stats.totalRevenueReceived || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-receivables').textContent = `$${Number(stats.outstandingReceivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-overdue').textContent = `$${Number(stats.overdueInvoicesAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-overdue-count').textContent = `${stats.overdueInvoicesCount || 0} invoices past due date`;

    // Load recent activity
    const recentRes = await fetch('/api/dashboard/recent', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const recentData = await recentRes.json();

    const invoicesList = document.getElementById('dashRecentInvoices');
    if (recentData.recentInvoices && recentData.recentInvoices.length > 0) {
      invoicesList.innerHTML = recentData.recentInvoices.map(i => `
        <div class="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition">
          <div>
            <div class="font-bold text-slate-800 text-xs">${i.invoice_number} &bull; ${i.customer_name}</div>
            <div class="text-[11px] text-slate-400">Due: ${i.due_date} &bull; ${i.status.toUpperCase()}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-slate-900 text-xs">$${Number(i.total_amount).toFixed(2)}</div>
            <span class="badge-status badge-${i.status}">${i.status}</span>
          </div>
        </div>
      `).join('');
    } else {
      invoicesList.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No recent invoices</div>`;
    }

    const paymentsList = document.getElementById('dashRecentPayments');
    if (recentData.recentPayments && recentData.recentPayments.length > 0) {
      paymentsList.innerHTML = recentData.recentPayments.map(p => `
        <div class="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition">
          <div>
            <div class="font-bold text-slate-800 text-xs">${p.payment_number} &bull; ${p.customer_name}</div>
            <div class="text-[11px] text-slate-400">${p.payment_method.toUpperCase()} &bull; ${p.payment_date}</div>
          </div>
          <div class="text-right font-bold text-emerald-600 text-xs">
            +$${Number(p.amount).toFixed(2)}
          </div>
        </div>
      `).join('');
    } else {
      paymentsList.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No recent payments</div>`;
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

// -------------------------------------------------------------
// 2. RECURRING BILLING ENGINE (MEMBER 3 HIGHLIGHT)
// -------------------------------------------------------------
async function loadBillingRunner() {
  const asOfDate = document.getElementById('billingAsOfDate').value || new Date().toISOString().slice(0, 10);
  
  try {
    // 1. Fetch preview of due subscriptions
    const dueRes = await fetch(`/api/billing/due?date=${asOfDate}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const dueData = await dueRes.json();

    document.getElementById('dueSubsCountBadge').textContent = `${dueData.count} Due`;
    const table = document.getElementById('dueSubscriptionsTable');

    if (dueData.subscriptions && dueData.subscriptions.length > 0) {
      table.innerHTML = dueData.subscriptions.map(s => `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-3.5 font-bold text-indigo-600">${s.subscription_number}</td>
          <td class="p-3.5">
            <div class="font-semibold text-slate-800">${s.customer_name}</div>
            <div class="text-[11px] text-slate-400">${s.customer_company || ''}</div>
          </td>
          <td class="p-3.5 font-medium text-slate-700">${s.plan_name}</td>
          <td class="p-3.5">
            <span class="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px] uppercase">${s.billing_interval}</span>
          </td>
          <td class="p-3.5 font-semibold text-amber-600">${s.next_billing_date}</td>
          <td class="p-3.5 font-bold text-slate-900">$${Number(s.plan_price).toFixed(2)}</td>
          <td class="p-3.5 text-right">
            <button onclick="billSingleSubscription(${s.id})" class="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-bold text-[11px] transition">
              ⚡ Bill Now
            </button>
          </td>
        </tr>
      `).join('');
    } else {
      table.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">All subscriptions are up to date as of ${asOfDate}. No pending billing cycles due.</td></tr>`;
    }

    // 2. Fetch past billing runs audit trail
    const runsRes = await fetch('/api/billing/runs', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const runs = await runsRes.json();
    const runsTable = document.getElementById('billingRunsTable');

    if (runs && runs.length > 0) {
      runsTable.innerHTML = runs.map(r => `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-3.5 font-mono text-slate-600">${new Date(r.run_date).toLocaleString()}</td>
          <td class="p-3.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.trigger_type === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
              ${r.trigger_type}
            </span>
          </td>
          <td class="p-3.5 font-semibold text-slate-700">${r.subscriptions_checked} subs</td>
          <td class="p-3.5 font-bold text-emerald-600">${r.invoices_generated} generated</td>
          <td class="p-3.5 font-bold text-slate-900">$${Number(r.total_billed_amount).toFixed(2)}</td>
          <td class="p-3.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              ${r.status}
            </span>
          </td>
        </tr>
      `).join('');
    } else {
      runsTable.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">No past billing runs recorded yet.</td></tr>`;
    }
  } catch (err) {
    console.error('Failed to load billing runner:', err);
  }
}

// Trigger Batch Billing Run
async function triggerBillingRun() {
  const btn = document.getElementById('btnRunBilling');
  const asOfDate = document.getElementById('billingAsOfDate').value || new Date().toISOString().slice(0, 10);

  try {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳ Processing Billing Cycles...</span>`;

    const res = await fetch('/api/billing/run-recurring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ asOfDate, triggerType: 'manual' })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Billing run failed');

    showToast(`✅ Billing run complete! Generated ${data.invoicesGenerated} invoices ($${data.totalBilledAmount}), Skipped ${data.skipped}.`);
    loadBillingRunner();
    loadDashboard();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>⚡ Run Billing Cycle Now</span>`;
  }
}

// Bill individual subscription on demand
async function billSingleSubscription(subId) {
  try {
    const res = await fetch(`/api/invoices/generate/${subId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ issueDate: new Date().toISOString().slice(0, 10) })
    });

    const data = await res.json();
    if (res.status === 409) {
      showToast(`⚠️ Skipped: ${data.reason}`, 'error');
      return;
    }
    if (!res.ok) throw new Error(data.error || 'Failed to generate invoice');

    showToast(`🎉 Generated invoice ${data.invoice.invoice_number} ($${data.invoice.total_amount})!`);
    loadBillingRunner();
    loadDashboard();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// -------------------------------------------------------------
// 3. INVOICES MODULE (MEMBER 3 HIGHLIGHT)
// -------------------------------------------------------------
let currentInvoiceFilter = '';

async function loadInvoices(statusFilter = currentInvoiceFilter) {
  currentInvoiceFilter = statusFilter;
  try {
    let url = '/api/invoices';
    if (statusFilter) url += `?status=${statusFilter}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const invoices = await res.json();
    cachedInvoices = invoices;

    renderInvoicesTable(invoices);
  } catch (err) {
    console.error('Failed to load invoices:', err);
  }
}

function renderInvoicesTable(invoices) {
  const tbody = document.getElementById('invoicesTableBody');
  if (!invoices || invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400">No invoices found matching criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = invoices.map(i => `
    <tr class="hover:bg-slate-50 transition">
      <td class="p-3.5 font-bold text-indigo-600">${i.invoice_number}</td>
      <td class="p-3.5">
        <div class="font-semibold text-slate-800">${i.customer_name}</div>
        <div class="text-[11px] text-slate-400">${i.customer_company || ''}</div>
      </td>
      <td class="p-3.5 text-slate-600 font-mono text-[11px]">${i.period_start} to ${i.period_end}</td>
      <td class="p-3.5 font-medium ${new Date(i.due_date) < new Date() && i.balance_due > 0 ? 'text-red-600 font-bold' : 'text-slate-600'}">
        ${i.due_date}
      </td>
      <td class="p-3.5 text-right font-bold text-slate-900">$${Number(i.total_amount).toFixed(2)}</td>
      <td class="p-3.5 text-right font-semibold text-emerald-600">$${Number(i.amount_paid).toFixed(2)}</td>
      <td class="p-3.5 text-right font-bold ${i.balance_due > 0 ? 'text-amber-600' : 'text-slate-400'}">$${Number(i.balance_due).toFixed(2)}</td>
      <td class="p-3.5">
        <span class="badge-status badge-${i.status}">${i.status}</span>
      </td>
      <td class="p-3.5 text-right space-x-1.5 whitespace-nowrap">
        <button onclick="printInvoice(${i.id})" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] transition">
          🖨️ View
        </button>
        ${i.balance_due > 0 && i.status !== 'cancelled' ? `
          <button onclick="openRecordPaymentModalForInvoice(${i.id})" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] transition">
            💳 Pay
          </button>
        ` : ''}
        ${i.status === 'draft' ? `
          <button onclick="updateInvoiceStatus(${i.id}, 'confirmed')" class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] transition">
            Confirm
          </button>
        ` : ''}
        ${i.status !== 'cancelled' && i.status !== 'paid' ? `
          <button onclick="updateInvoiceStatus(${i.id}, 'cancelled')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded font-semibold text-[11px] transition">
            Cancel
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function filterInvoices(status) {
  document.querySelectorAll('.invoice-filter-btn').forEach(btn => {
    btn.className = 'invoice-filter-btn px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200';
  });
  event.target.className = 'invoice-filter-btn px-2.5 py-1 rounded-full bg-slate-900 text-white font-semibold';
  loadInvoices(status);
}

function searchInvoices() {
  const query = document.getElementById('invoiceSearchInput').value.toLowerCase();
  const filtered = cachedInvoices.filter(i => 
    i.invoice_number.toLowerCase().includes(query) ||
    i.customer_name.toLowerCase().includes(query)
  );
  renderInvoicesTable(filtered);
}

function printInvoice(id) {
  window.open(`/api/invoices/${id}/print?token=${authToken}`, '_blank');
}

async function updateInvoiceStatus(id, newStatus) {
  if (!confirm(`Are you sure you want to transition invoice #${id} to ${newStatus}?`)) return;
  try {
    const res = await fetch(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(data.message);
    loadInvoices();
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 4. PAYMENTS MODULE (MEMBER 3 HIGHLIGHT)
// -------------------------------------------------------------
async function loadPayments() {
  try {
    const res = await fetch('/api/payments', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const payments = await res.json();
    const tbody = document.getElementById('paymentsTableBody');

    if (!payments || payments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400">No payment transactions recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = payments.map(p => `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-3.5 font-bold text-emerald-700">${p.payment_number}</td>
        <td class="p-3.5 font-bold text-indigo-600">${p.invoice_number}</td>
        <td class="p-3.5">
          <div class="font-semibold text-slate-800">${p.customer_name}</div>
          <div class="text-[11px] text-slate-400">${p.customer_company || ''}</div>
        </td>
        <td class="p-3.5">
          <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase">
            ${p.payment_method.replace('_', ' ')}
          </span>
        </td>
        <td class="p-3.5 font-mono text-slate-600">${p.payment_date}</td>
        <td class="p-3.5 font-mono text-slate-500 text-[11px]">${p.transaction_reference || '—'}</td>
        <td class="p-3.5 text-right font-extrabold text-emerald-600">$${Number(p.amount).toFixed(2)}</td>
        <td class="p-3.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
            ${p.status}
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load payments:', err);
  }
}

// -------------------------------------------------------------
// 5. OVERDUE & AGING REPORT (MEMBER 3 HIGHLIGHT)
// -------------------------------------------------------------
async function loadOverdueReport() {
  try {
    const res = await fetch('/api/invoices/reports/overdue', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    document.getElementById('aging-30').textContent = `$${Number(data.aging.under30Days).toFixed(2)}`;
    document.getElementById('aging-60').textContent = `$${Number(data.aging.days31to60).toFixed(2)}`;
    document.getElementById('aging-90').textContent = `$${Number(data.aging.over60Days).toFixed(2)}`;
    document.getElementById('overdueTotalAmountBadge').textContent = `$${Number(data.totalOverdueAmount).toFixed(2)} Due`;

    const tbody = document.getElementById('overdueInvoicesTableBody');
    if (!data.invoices || data.invoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-emerald-600 font-bold">🎉 Outstanding! There are no overdue invoices at this time.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.invoices.map(i => `
      <tr class="hover:bg-red-50/50 transition">
        <td class="p-3.5 font-bold text-indigo-600">${i.invoice_number}</td>
        <td class="p-3.5">
          <div class="font-semibold text-slate-800">${i.customer_name}</div>
          <div class="text-[11px] text-slate-400">${i.customer_email}</div>
        </td>
        <td class="p-3.5 font-semibold text-red-600">${i.due_date}</td>
        <td class="p-3.5">
          <span class="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[10px]">
            ${i.days_overdue} days
          </span>
        </td>
        <td class="p-3.5 text-right font-bold text-slate-800">$${Number(i.total_amount).toFixed(2)}</td>
        <td class="p-3.5 text-right font-black text-red-600">$${Number(i.balance_due).toFixed(2)}</td>
        <td class="p-3.5 text-right space-x-1.5">
          <button onclick="printInvoice(${i.id})" class="px-2 py-1 bg-white border border-slate-300 rounded text-slate-700 font-bold text-[11px]">
            View
          </button>
          <button onclick="openRecordPaymentModalForInvoice(${i.id})" class="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[11px]">
            💳 Settle
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load overdue report:', err);
  }
}

// -------------------------------------------------------------
// 6. RECORD PAYMENT MODAL WORKFLOWS
// -------------------------------------------------------------
let activeModalInvoice = null;

async function openRecordPaymentModal() {
  const select = document.getElementById('payInvoiceSelect');
  select.innerHTML = '<option value="">-- Choose an open invoice --</option>';

  try {
    const res = await fetch('/api/invoices', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const invoices = await res.json();
    const openInvoices = invoices.filter(i => i.balance_due > 0 && i.status !== 'cancelled');

    openInvoices.forEach(i => {
      const opt = document.createElement('option');
      opt.value = i.id;
      opt.textContent = `${i.invoice_number} - ${i.customer_name} (Balance: $${Number(i.balance_due).toFixed(2)})`;
      opt.dataset.total = i.total_amount;
      opt.dataset.balance = i.balance_due;
      select.appendChild(opt);
    });

    document.getElementById('payDateInput').value = new Date().toISOString().slice(0, 10);
    document.getElementById('payAmountInput').value = '';
    document.getElementById('payRefInput').value = `TXN-REF-${Math.floor(100000 + Math.random() * 900000)}`;
    document.getElementById('recordPaymentModal').classList.remove('hidden');
  } catch (err) {
    showToast('Failed to open payment modal', 'error');
  }
}

function openRecordPaymentModalForInvoice(invoiceId) {
  openRecordPaymentModal().then(() => {
    const select = document.getElementById('payInvoiceSelect');
    select.value = invoiceId;
    onPaymentInvoiceChange();
  });
}

function onPaymentInvoiceChange() {
  const select = document.getElementById('payInvoiceSelect');
  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption || !selectedOption.dataset.balance) {
    document.getElementById('payModalInvoiceTotal').textContent = '$0.00';
    document.getElementById('payModalBalanceDue').textContent = '$0.00';
    document.getElementById('payAmountInput').value = '';
    return;
  }

  const balance = Number(selectedOption.dataset.balance);
  const total = Number(selectedOption.dataset.total);

  document.getElementById('payModalInvoiceTotal').textContent = `$${total.toFixed(2)}`;
  document.getElementById('payModalBalanceDue').textContent = `$${balance.toFixed(2)}`;
  document.getElementById('payAmountInput').value = balance.toFixed(2); // default to full balance settlement
  document.getElementById('payAmountInput').max = balance;
}

async function handleRecordPaymentSubmit(e) {
  e.preventDefault();
  const invoiceId = document.getElementById('payInvoiceSelect').value;
  const amount = Number(document.getElementById('payAmountInput').value);
  const paymentMethod = document.getElementById('payMethodSelect').value;
  const paymentDate = document.getElementById('payDateInput').value;
  const transactionReference = document.getElementById('payRefInput').value;
  const notes = document.getElementById('payNotesInput').value;

  try {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        invoiceId,
        amount,
        paymentMethod,
        paymentDate,
        transactionReference,
        notes
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Payment failed');

    showToast(`✅ Payment ${data.payment.payment_number} ($${data.payment.amount}) recorded! Invoice is now ${data.updatedInvoice.status.toUpperCase()}.`);
    closeModal('recordPaymentModal');

    // Refresh current view
    if (currentTab === 'invoices') loadInvoices();
    if (currentTab === 'payments') loadPayments();
    if (currentTab === 'overdue') loadOverdueReport();
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 7. GENERATE INVOICE MODAL (MEMBER 3)
// -------------------------------------------------------------
async function openGenerateInvoiceModal() {
  const select = document.getElementById('genSubSelect');
  select.innerHTML = '<option value="">-- Choose active subscription --</option>';

  try {
    const res = await fetch('/api/subscriptions', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const subs = await res.json();
    cachedSubscriptions = subs;

    subs.filter(s => s.status === 'active').forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.subscription_number} - ${s.customer_name} (${s.plan_name} - ${s.billing_interval})`;
      select.appendChild(opt);
    });

    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    document.getElementById('genIssueDate').value = today;
    document.getElementById('genDueDate').value = dueDate;
    document.getElementById('genPeriodStart').value = today;
    document.getElementById('genPeriodEnd').value = periodEnd;

    document.getElementById('generateInvoiceModal').classList.remove('hidden');
  } catch (err) {
    showToast('Failed to open modal', 'error');
  }
}

async function handleGenerateInvoiceSubmit(e) {
  e.preventDefault();
  const subId = document.getElementById('genSubSelect').value;
  const issueDate = document.getElementById('genIssueDate').value;
  const dueDate = document.getElementById('genDueDate').value;
  const periodStart = document.getElementById('genPeriodStart').value;
  const periodEnd = document.getElementById('genPeriodEnd').value;

  try {
    const res = await fetch(`/api/invoices/generate/${subId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ issueDate, dueDate, periodStart, periodEnd })
    });

    const data = await res.json();
    if (res.status === 409) {
      showToast(`⚠️ Skipped: ${data.reason}`, 'error');
      return;
    }
    if (!res.ok) throw new Error(data.error);

    showToast(`🎉 Generated invoice #${data.invoice.invoice_number} ($${data.invoice.total_amount})!`);
    closeModal('generateInvoiceModal');
    loadInvoices();
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// -------------------------------------------------------------
// 8. OTHER MODULES (PRODUCTS, PLANS, SUBSCRIPTIONS, PORTAL)
// -------------------------------------------------------------
async function loadCatalog() {
  try {
    const [prodRes, planRes] = await Promise.all([
      fetch('/api/catalog/products'),
      fetch('/api/catalog/plans')
    ]);
    const products = await prodRes.json();
    const plans = await planRes.json();

    const prodList = document.getElementById('productsCatalogList');
    prodList.innerHTML = products.map(p => `
      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-bold text-slate-900 text-xs">${p.name} <span class="font-mono text-slate-400">(${p.code})</span></div>
            <div class="text-[11px] text-slate-500">${p.description || ''}</div>
          </div>
          <div class="font-black text-indigo-600 text-xs">$${Number(p.sales_price).toFixed(2)}</div>
        </div>
        ${p.variants && p.variants.length > 0 ? `
          <div class="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Configured Variants:</span>
            ${p.variants.map(v => `
              <div class="flex justify-between text-[11px] text-slate-600">
                <span>&bull; ${v.variant_name} (${v.attribute_type})</span>
                <span class="font-semibold text-emerald-600">+${Number(v.price_adjustment) > 0 ? `$${v.price_adjustment}` : '$0'}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');

    const planList = document.getElementById('plansCatalogList');
    planList.innerHTML = plans.map(p => `
      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
        <div>
          <div class="font-bold text-slate-900 text-xs">${p.name}</div>
          <div class="text-[11px] text-slate-500">Product: ${p.product_name}</div>
          <span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase">${p.billing_interval}</span>
        </div>
        <div class="text-right">
          <div class="font-black text-slate-900 text-sm">$${Number(p.price).toFixed(2)}</div>
          <div class="text-[10px] text-slate-400">per interval</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load catalog:', err);
  }
}

async function loadSubscriptions() {
  try {
    const res = await fetch('/api/subscriptions', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const subs = await res.json();
    const tbody = document.getElementById('subscriptionsTableBody');

    if (!subs || subs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">No subscriptions found.</td></tr>`;
      return;
    }

    tbody.innerHTML = subs.map(s => `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-3.5 font-bold text-indigo-600">${s.subscription_number}</td>
        <td class="p-3.5">
          <div class="font-semibold text-slate-800">${s.customer_name}</div>
          <div class="text-[11px] text-slate-400">${s.customer_company || ''}</div>
        </td>
        <td class="p-3.5 font-medium text-slate-700">${s.plan_name}</td>
        <td class="p-3.5">
          <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase">${s.billing_interval}</span>
        </td>
        <td class="p-3.5 font-mono text-slate-600">${s.start_date}</td>
        <td class="p-3.5 font-semibold text-amber-600">${s.next_billing_date}</td>
        <td class="p-3.5">
          <span class="badge-status badge-${s.status}">${s.status}</span>
        </td>
        <td class="p-3.5 text-right">
          <button onclick="billSingleSubscription(${s.id})" class="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-bold text-[11px]">
            ⚡ Bill
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load subscriptions:', err);
  }
}

async function loadPortal() {
  try {
    const res = await fetch('/api/dashboard/portal', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    document.getElementById('portalCustomerName').textContent = data.customer.name;
    document.getElementById('portalCustomerCompany').textContent = `${data.customer.company || 'Direct License'} • ${data.customer.email}`;
    document.getElementById('portalActiveSubs').textContent = data.stats.activeSubscriptions;
    document.getElementById('portalTotalInvoices').textContent = data.stats.totalInvoices;
    document.getElementById('portalTotalPaid').textContent = `$${Number(data.stats.totalSpent).toFixed(2)}`;
    document.getElementById('portalBalanceDue').textContent = `$${Number(data.stats.currentOutstanding).toFixed(2)}`;

    const tbody = document.getElementById('portalInvoicesBody');
    if (!data.invoices || data.invoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">No invoices on file.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.invoices.map(i => `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-3 font-bold text-indigo-600">${i.invoice_number}</td>
        <td class="p-3 text-slate-600">${i.issue_date}</td>
        <td class="p-3 font-semibold ${new Date(i.due_date) < new Date() && i.balance_due > 0 ? 'text-red-600' : 'text-slate-600'}">${i.due_date}</td>
        <td class="p-3 text-right font-bold text-slate-900">$${Number(i.total_amount).toFixed(2)}</td>
        <td class="p-3 text-right font-bold text-amber-600">$${Number(i.balance_due).toFixed(2)}</td>
        <td class="p-3">
          <span class="badge-status badge-${i.status}">${i.status}</span>
        </td>
        <td class="p-3 text-right">
          <button onclick="printInvoice(${i.id})" class="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-bold text-[11px]">
            🖨️ View
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load customer portal:', err);
  }
}
