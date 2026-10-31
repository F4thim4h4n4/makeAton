import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';

function QuotationsPage() {
  const navigate = useNavigate();
  const { isStaff, isAdmin, isCustomer } = useAuth();

  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // New Quotation Form
  const [newQuotation, setNewQuotation] = useState({
    customer: '',
    planName: 'Business Suite Monthly',
    billingInterval: 'monthly',
    validityDays: 30,
    discountCode: '',
    discountAmount: 0,
    taxRate: 8,
    isTemplate: false,
    templateName: '',
    notes: '',
    items: [
      {
        name: 'Business Suite (Standard Edition)',
        variant: 'Standard',
        quantity: 1,
        unitPrice: 2000,
        taxRate: 8,
        discountAmount: 0,
      },
    ],
  });

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/quotations', { params });
      if (res.data?.success) {
        setQuotations(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    if (isCustomer) return;
    try {
      const res = await apiClient.get('/customers');
      if (res.data?.success) {
        setCustomers(res.data.data || []);
        if (res.data.data.length > 0 && !newQuotation.customer) {
          setNewQuotation((prev) => ({ ...prev, customer: res.data.data[0]._id }));
        }
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchCustomers();
  }, [search, statusFilter]);

  // Compute live totals for new quotation
  const computeTotals = () => {
    let subtotal = 0;
    newQuotation.items.forEach((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unit = Math.max(0, Number(item.unitPrice) || 0);
      const disc = Math.max(0, Number(item.discountAmount) || 0);
      subtotal += qty * unit - disc;
    });

    const disc = Math.min(subtotal, Math.max(0, Number(newQuotation.discountAmount) || 0));
    const taxable = Math.max(0, subtotal - disc);
    const taxAmt = Number(((taxable * Number(newQuotation.taxRate || 0)) / 100).toFixed(2));
    const total = Number((taxable + taxAmt).toFixed(2));

    return { subtotal, disc, taxAmt, total };
  };

  const { subtotal, disc, taxAmt, total } = computeTotals();

  const handleAddItem = () => {
    setNewQuotation((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          name: 'Custom Product / Add-on',
          variant: '',
          quantity: 1,
          unitPrice: 250,
          taxRate: 8,
          discountAmount: 0,
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (newQuotation.items.length <= 1) return;
    setNewQuotation((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...newQuotation.items];
    updated[index][field] = value;
    setNewQuotation({ ...newQuotation, items: updated });
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiClient.post('/quotations', newQuotation);
      if (res.data?.success) {
        setSuccess('Quotation generated successfully');
        setShowCreateModal(false);
        fetchQuotations();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create quotation');
    }
  };

  const handleSendQuotation = async (id) => {
    try {
      const res = await apiClient.patch(`/quotations/${id}/send`);
      if (res.data?.success) {
        setSuccess('Quotation sent to customer');
        fetchQuotations();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send quotation');
    }
  };

  const handleConfirmQuotation = async (id) => {
    try {
      const res = await apiClient.patch(`/quotations/${id}/confirm`);
      if (res.data?.success) {
        setSuccess('Quotation confirmed');
        fetchQuotations();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm quotation');
    }
  };

  const handleConvertQuotation = async (id) => {
    try {
      const res = await apiClient.post(`/quotations/${id}/convert`);
      if (res.data?.success) {
        const sub = res.data.data;
        setSuccess(`Converted to Subscription: ${sub.subscriptionNumber}! Redirecting...`);
        fetchQuotations();
        setTimeout(() => {
          navigate('/subscriptions');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to convert quotation to subscription');
    }
  };

  // Metrics
  const totalCount = quotations.length;
  const draftCount = quotations.filter((q) => q.status === 'draft').length;
  const confirmedCount = quotations.filter((q) => q.status === 'confirmed').length;
  const convertedCount = quotations.filter((q) => q.status === 'converted').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Quotations & Proposals</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Build customized quotations, apply tax/discount rules, and convert proposals directly into subscriptions.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm"
          >
            <span>+</span>
            <span>New Quotation</span>
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total</span>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Draft / Sent</span>
          <p className="text-2xl font-bold text-neutral-700 mt-1">{draftCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Confirmed</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{confirmedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Converted</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{convertedCount}</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 font-bold">✕</button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by quotation #, notes, or template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="confirmed">Confirmed</option>
            <option value="converted">Converted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Quotation Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">Loading quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No quotations found. Click "+ New Quotation" to generate one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan / Interval</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {quotations.map((q) => (
                  <tr key={q._id} className="hover:bg-neutral-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-primary-600">{q.quotationNumber}</div>
                      {q.isTemplate && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium border border-purple-200">
                          Template
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-neutral-900">{q.customer?.name || 'Customer'}</div>
                      <div className="text-xs text-neutral-400">{q.customer?.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600">
                      <div>{q.planName || 'Standard'}</div>
                      <div className="text-xs text-neutral-400 capitalize">{q.billingInterval} billing</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      ${q.totalAmount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 text-xs">
                      {q.expiresAt ? new Date(q.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          q.status === 'confirmed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : q.status === 'converted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : q.status === 'sent'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedQuotation(q);
                          setShowDetailsModal(true);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 rounded hover:bg-neutral-200"
                      >
                        Preview
                      </button>

                      {isStaff && q.status === 'draft' && (
                        <button
                          onClick={() => handleSendQuotation(q._id)}
                          className="px-2.5 py-1 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 rounded hover:bg-amber-100 border border-amber-200"
                        >
                          Send
                        </button>
                      )}

                      {['draft', 'sent'].includes(q.status) && (
                        <button
                          onClick={() => handleConfirmQuotation(q._id)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 rounded hover:bg-blue-100 border border-blue-200"
                        >
                          Confirm
                        </button>
                      )}

                      {isStaff && ['confirmed', 'sent', 'draft'].includes(q.status) && (
                        <button
                          onClick={() => handleConvertQuotation(q._id)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm"
                          title="Convert quotation directly into a live subscription"
                        >
                          Convert to Sub
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Quotation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Create New Quotation</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Select customer, plan, billing interval, and line items with tax/discount rules.
            </p>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Customer *</label>
                  <select
                    required
                    value={newQuotation.customer}
                    onChange={(e) => setNewQuotation({ ...newQuotation, customer: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={newQuotation.planName}
                    onChange={(e) => setNewQuotation({ ...newQuotation, planName: e.target.value })}
                    placeholder="e.g. Business Suite Monthly"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Billing Interval</label>
                  <select
                    value={newQuotation.billingInterval}
                    onChange={(e) =>
                      setNewQuotation({ ...newQuotation, billingInterval: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuotation.validityDays}
                    onChange={(e) =>
                      setNewQuotation({ ...newQuotation, validityDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newQuotation.taxRate}
                    onChange={(e) =>
                      setNewQuotation({ ...newQuotation, taxRate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t border-neutral-200 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Product Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-2">
                  {newQuotation.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 text-xs">
                      <input
                        type="text"
                        placeholder="Product description"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-neutral-300 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Variant (optional)"
                        value={item.variant}
                        onChange={(e) => handleItemChange(idx, 'variant', e.target.value)}
                        className="w-28 px-2 py-1.5 border border-neutral-300 rounded"
                      />
                      <div className="w-16">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-neutral-300 rounded text-center"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit $"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-neutral-300 rounded text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={newQuotation.items.length <= 1}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Summary */}
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-3">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Discount Code</label>
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10"
                      value={newQuotation.discountCode}
                      onChange={(e) =>
                        setNewQuotation({ ...newQuotation, discountCode: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Discount Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={newQuotation.discountAmount}
                      onChange={(e) =>
                        setNewQuotation({ ...newQuotation, discountAmount: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-500">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-neutral-800">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-${disc.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Tax ({newQuotation.taxRate}%):</span>
                    <span className="font-semibold text-neutral-800">${taxAmt.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-1 flex justify-between font-bold text-sm text-neutral-900">
                    <span>Total Amount:</span>
                    <span className="text-primary-600">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isTemplate"
                  checked={newQuotation.isTemplate}
                  onChange={(e) =>
                    setNewQuotation({ ...newQuotation, isTemplate: e.target.checked })
                  }
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isTemplate" className="text-xs text-neutral-700">
                  Save as reusable quotation template
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
                >
                  Create Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quotation Preview / Print Details Modal */}
      {showDetailsModal && selectedQuotation && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-neutral-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-3 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-primary-600">
                  {selectedQuotation.quotationNumber}
                </span>
                <h2 className="text-xl font-bold text-neutral-900 mt-0.5">
                  Quotation Proposal
                </h2>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-neutral-50 p-4 rounded-xl border border-neutral-200 mb-4">
              <div>
                <span className="text-neutral-500 block">Customer:</span>
                <span className="font-semibold text-neutral-800">{selectedQuotation.customer?.name}</span>
                <span className="text-neutral-400 block">{selectedQuotation.customer?.email}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Plan & Interval:</span>
                <span className="font-semibold text-neutral-800">{selectedQuotation.planName}</span>
                <span className="text-neutral-500 block capitalize">
                  {selectedQuotation.billingInterval} billing cycle
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Valid Until:</span>
                <span className="font-semibold text-neutral-800">
                  {selectedQuotation.expiresAt
                    ? new Date(selectedQuotation.expiresAt).toLocaleDateString()
                    : '30 days'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Current Status:</span>
                <span className="font-bold capitalize text-primary-700">{selectedQuotation.status}</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                Line Items
              </span>
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {selectedQuotation.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2">
                          <div className="font-semibold text-neutral-800">{item.name}</div>
                          {item.variant && <div className="text-[10px] text-neutral-400">{item.variant}</div>}
                        </td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-right">${item.unitPrice}</td>
                        <td className="p-2 text-right font-medium">${item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total breakdown */}
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1 text-xs">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal:</span>
                <span>${selectedQuotation.subtotal?.toFixed(2)}</span>
              </div>
              {selectedQuotation.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({selectedQuotation.discountCode || 'Applied'}):</span>
                  <span>-${selectedQuotation.discountAmount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-500">
                <span>Tax ({selectedQuotation.taxRate}%):</span>
                <span>${selectedQuotation.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-200 pt-1 flex justify-between font-bold text-sm text-neutral-900">
                <span>Total Amount:</span>
                <span className="text-primary-600">${selectedQuotation.totalAmount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 mt-4">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                🖨 Print Quotation
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-1.5 bg-neutral-100 text-neutral-700 text-xs font-semibold rounded hover:bg-neutral-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuotationsPage;
