import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';

function SubscriptionsPage() {
  const { isStaff, isAdmin, isCustomer } = useAuth();

  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [intervalFilter, setIntervalFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [pauseReason, setPauseReason] = useState('Customer temporary hold request');

  // New Subscription Form
  const [newSub, setNewSub] = useState({
    customer: '',
    planName: 'Business Suite Monthly',
    billingInterval: 'monthly',
    paymentTerms: 'Due on receipt',
    taxRate: 8,
    discountAmount: 0,
    discountCode: '',
    notes: '',
    items: [
      {
        name: 'Business Suite Standard Edition',
        variant: 'Standard',
        quantity: 1,
        unitPrice: 2000,
        taxRate: 8,
        discountAmount: 0,
      },
    ],
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (intervalFilter) params.billingInterval = intervalFilter;

      const res = await apiClient.get('/subscriptions', { params });
      if (res.data?.success) {
        setSubscriptions(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch subscriptions');
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
        if (res.data.data.length > 0 && !newSub.customer) {
          setNewSub((prev) => ({ ...prev, customer: res.data.data[0]._id }));
        }
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchCustomers();
  }, [search, statusFilter, intervalFilter]);

  // Lifecycle actions
  const handleTransitionStatus = async (id, targetStatus, reason = '') => {
    try {
      const res = await apiClient.patch(`/subscriptions/${id}/status`, {
        status: targetStatus,
        reason,
      });
      if (res.data?.success) {
        setSuccess(`Subscription status changed to ${targetStatus}`);
        fetchSubscriptions();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Status transition failed');
    }
  };

  const handlePause = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    try {
      const res = await apiClient.patch(`/subscriptions/${selectedSub._id}/pause`, {
        reason: pauseReason,
      });
      if (res.data?.success) {
        setSuccess('Subscription paused successfully');
        setShowPauseModal(false);
        fetchSubscriptions();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to pause subscription');
    }
  };

  const handleResume = async (id) => {
    try {
      const res = await apiClient.patch(`/subscriptions/${id}/resume`, {
        reason: 'Resumed by operational staff',
      });
      if (res.data?.success) {
        setSuccess('Subscription resumed and now active');
        fetchSubscriptions();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resume subscription');
    }
  };

  const handleRenew = async (id) => {
    try {
      const res = await apiClient.patch(`/subscriptions/${id}/renew`, {
        reason: 'Manual renewal triggered',
      });
      if (res.data?.success) {
        setSuccess(res.data.message || 'Subscription renewed for another cycle');
        fetchSubscriptions();
        setTimeout(() => setSuccess(''), 3500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to renew subscription');
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm('Are you sure you want to cancel and close this subscription?')) return;
    try {
      const res = await apiClient.patch(`/subscriptions/${id}/cancel`, {
        reason: 'Customer initiated early cancellation',
      });
      if (res.data?.success) {
        setSuccess('Subscription closed');
        fetchSubscriptions();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to close subscription');
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiClient.post('/subscriptions', newSub);
      if (res.data?.success) {
        setSuccess('Subscription created successfully');
        setShowCreateModal(false);
        fetchSubscriptions();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subscription');
    }
  };

  // Metrics
  const totalCount = subscriptions.length;
  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const confirmedCount = subscriptions.filter((s) => s.status === 'confirmed').length;
  const pausedCount = subscriptions.filter((s) => s.status === 'paused').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Subscription Lifecycle</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage complete subscription states: Draft → Quotation → Confirmed → Active → Paused / Closed.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm"
          >
            <span>+</span>
            <span>New Subscription</span>
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
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Confirmed</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{confirmedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Paused</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pausedCount}</p>
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by subscription #, plan name, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="w-full sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="confirmed">Confirmed</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="w-full sm:w-44">
          <select
            value={intervalFilter}
            onChange={(e) => setIntervalFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Intervals</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No subscriptions found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Subscription #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan & Interval</th>
                  <th className="py-3 px-4">Amount / Cycle</th>
                  <th className="py-3 px-4">Next Billing</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {subscriptions.map((s) => (
                  <tr key={s._id} className="hover:bg-neutral-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-primary-600">{s.subscriptionNumber}</div>
                      <div className="text-[10px] text-neutral-400">
                        Started: {new Date(s.startDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-900">{s.customer?.name || 'Customer'}</div>
                      <div className="text-xs text-neutral-400">{s.customer?.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-700">
                      <div className="font-medium">{s.planName}</div>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                        {s.billingInterval}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      ${s.totalAmount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 text-xs">
                      {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          s.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'confirmed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : s.status === 'paused'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : s.status === 'expired'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {/* Audit History Timeline button */}
                      <button
                        onClick={() => {
                          setSelectedSub(s);
                          setShowAuditModal(true);
                        }}
                        className="px-2 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 rounded hover:bg-neutral-200"
                        title="View status audit history"
                      >
                        📜 Audit
                      </button>

                      {/* Details view */}
                      <button
                        onClick={() => {
                          setSelectedSub(s);
                          setShowDetailsModal(true);
                        }}
                        className="px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 rounded hover:bg-primary-100"
                      >
                        View
                      </button>

                      {/* State transitions */}
                      {isStaff && s.status === 'confirmed' && (
                        <button
                          onClick={() => handleTransitionStatus(s._id, 'active', 'Activated by staff')}
                          className="px-2 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm"
                        >
                          Activate
                        </button>
                      )}

                      {isStaff && s.status === 'active' && (
                        <button
                          onClick={() => {
                            setSelectedSub(s);
                            setShowPauseModal(true);
                          }}
                          className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded"
                        >
                          Pause
                        </button>
                      )}

                      {isStaff && s.status === 'paused' && (
                        <button
                          onClick={() => handleResume(s._id)}
                          className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                        >
                          Resume
                        </button>
                      )}

                      {isStaff && ['active', 'expired'].includes(s.status) && (
                        <button
                          onClick={() => handleRenew(s._id)}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                          title="Renew subscription for another cycle"
                        >
                          Renew
                        </button>
                      )}

                      {s.status !== 'closed' && (
                        <button
                          onClick={() => handleClose(s._id)}
                          className="px-2 py-1 text-xs font-medium text-neutral-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Early closure / Cancellation"
                        >
                          Cancel
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

      {/* Pause Subscription Modal */}
      {showPauseModal && selectedSub && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200">
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Pause Subscription</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Pausing will temporarily suspend recurring invoice generation for{' '}
              <strong>{selectedSub.subscriptionNumber}</strong>.
            </p>
            <form onSubmit={handlePause} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reason for Pause *
                </label>
                <textarea
                  required
                  rows="3"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="e.g. Customer requested temporary seasonal hiatus"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPauseModal(false)}
                  className="px-3.5 py-1.5 border border-neutral-300 rounded text-xs text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700"
                >
                  Confirm Pause
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Timeline Modal */}
      {showAuditModal && selectedSub && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-3 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-primary-600">
                  {selectedSub.subscriptionNumber}
                </span>
                <h2 className="text-lg font-bold text-neutral-900">Lifecycle Audit History</h2>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg"
              >
                ✕
              </button>
            </div>

            {(!selectedSub.statusHistory || selectedSub.statusHistory.length === 0) ? (
              <p className="text-xs text-neutral-400 italic">No historical status transitions recorded.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                {selectedSub.statusHistory.map((h, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-primary-600 border-2 border-white ring-2 ring-primary-200" />
                    <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold capitalize text-primary-700">{h.status}</span>
                        <span className="text-neutral-400 text-[10px]">
                          {new Date(h.changedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-neutral-700">{h.reason || 'Status transition executed'}</p>
                      {h.changedBy?.name && (
                        <div className="text-[10px] text-neutral-400 mt-1">
                          Actor: {h.changedBy.name} ({h.changedBy.email})
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-5 border-t border-neutral-200 mt-6">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-lg hover:bg-neutral-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Details Modal */}
      {showDetailsModal && selectedSub && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-neutral-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-3 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-primary-600">
                  {selectedSub.subscriptionNumber}
                </span>
                <h2 className="text-lg font-bold text-neutral-900">{selectedSub.planName}</h2>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-50 p-4 rounded-xl border border-neutral-200 mb-4">
              <div>
                <span className="text-neutral-500 block">Customer:</span>
                <span className="font-semibold text-neutral-800">{selectedSub.customer?.name}</span>
                <span className="text-neutral-400 block">{selectedSub.customer?.email}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Billing Cycle:</span>
                <span className="font-semibold capitalize text-neutral-800">
                  {selectedSub.billingInterval}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Payment Terms:</span>
                <span className="font-semibold text-neutral-800">{selectedSub.paymentTerms}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Current Status:</span>
                <span className="font-bold capitalize text-primary-700">{selectedSub.status}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Start Date:</span>
                <span className="font-semibold text-neutral-800">
                  {new Date(selectedSub.startDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Next Billing:</span>
                <span className="font-semibold text-neutral-800">
                  {selectedSub.nextBillingDate
                    ? new Date(selectedSub.nextBillingDate).toLocaleDateString()
                    : '—'}
                </span>
              </div>
            </div>

            {/* Line items */}
            <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4">
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
                  {selectedSub.items?.map((item, i) => (
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

            {/* Totals */}
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1 text-xs">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal:</span>
                <span>${selectedSub.subtotal?.toFixed(2)}</span>
              </div>
              {selectedSub.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({selectedSub.discountCode || 'Applied'}):</span>
                  <span>-${selectedSub.discountAmount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-500">
                <span>Tax ({selectedSub.taxRate}%):</span>
                <span>${selectedSub.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-200 pt-1 flex justify-between font-bold text-sm text-neutral-900">
                <span>Cycle Total:</span>
                <span className="text-primary-600">${selectedSub.totalAmount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-5 border-t border-neutral-200 mt-4">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-lg hover:bg-neutral-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Create New Subscription</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Initialize a subscription directly with plan and billing intervals.
            </p>
            <form onSubmit={handleCreateSubscription} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Customer *</label>
                <select
                  required
                  value={newSub.customer}
                  onChange={(e) => setNewSub({ ...newSub, customer: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={newSub.planName}
                    onChange={(e) => setNewSub({ ...newSub, planName: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Billing Interval</label>
                  <select
                    value={newSub.billingInterval}
                    onChange={(e) => setNewSub({ ...newSub, billingInterval: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Payment Terms</label>
                  <select
                    value={newSub.paymentTerms}
                    onChange={(e) => setNewSub({ ...newSub, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
                  >
                    <option value="Due on receipt">Due on receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={newSub.taxRate}
                    onChange={(e) => setNewSub({ ...newSub, taxRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
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
                  Create Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionsPage;
