import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';

function CustomersPage() {
  const { isStaff, isAdmin } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSubscriptions, setCustomerSubscriptions] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'active',
    address: { street: '', city: '', state: '', country: '', postcode: '' },
    notes: '',
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/customers', { params });
      if (res.data?.success) {
        setCustomers(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiClient.post('/customers', formData);
      if (res.data?.success) {
        setSuccess('Customer created successfully');
        setShowCreateModal(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          status: 'active',
          address: { street: '', city: '', state: '', country: '', postcode: '' },
          notes: '',
        });
        fetchCustomers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setError('');
    try {
      const res = await apiClient.put(`/customers/${selectedCustomer._id}`, formData);
      if (res.data?.success) {
        setSuccess('Customer updated successfully');
        setShowEditModal(false);
        setSelectedCustomer(null);
        fetchCustomers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update customer');
    }
  };

  const openEditModal = (c) => {
    setSelectedCustomer(c);
    setFormData({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      status: c.status || 'active',
      address: c.address || { street: '', city: '', state: '', country: '', postcode: '' },
      notes: c.notes || '',
    });
    setShowEditModal(true);
  };

  const openDetailsModal = async (c) => {
    setSelectedCustomer(c);
    setShowDetailsModal(true);
    try {
      const res = await apiClient.get(`/customers/${c._id}`);
      if (res.data?.success) {
        setCustomerSubscriptions(res.data.data.subscriptions || []);
      }
    } catch {
      setCustomerSubscriptions([]);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this customer?')) return;
    try {
      await apiClient.delete(`/customers/${id}`);
      setSuccess('Customer deactivated');
      fetchCustomers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate customer');
    }
  };

  // Metrics
  const totalCount = customers.length;
  const activeCount = customers.filter((c) => c.status === 'active').length;
  const inactiveCount = customers.filter((c) => c.status === 'inactive').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Customer Management</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Maintain customer profiles, contact directories, and active subscription associations.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm"
          >
            <span>+</span>
            <span>New Customer</span>
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Total Customers
          </span>
          <p className="text-3xl font-extrabold text-neutral-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Active Accounts
          </span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Inactive / Suspended
          </span>
          <p className="text-3xl font-extrabold text-neutral-500 mt-1">{inactiveCount}</p>
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
            placeholder="Search by name, email, company, or phone..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No customers found matching the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Customer / Company</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Active Subs</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-neutral-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-900">{c.name}</div>
                      {c.company && (
                        <div className="text-xs text-neutral-500">{c.company}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600">
                      <div>{c.email}</div>
                      {c.phone && <div className="text-xs text-neutral-400">{c.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 text-xs">
                      {c.address?.city || c.address?.country ? (
                        <span>{[c.address?.city, c.address?.country].filter(Boolean).join(', ')}</span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
                        {c.activeSubscriptionsCount || 0} active
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'suspended'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openDetailsModal(c)}
                        className="px-2.5 py-1 text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 rounded hover:bg-primary-100"
                      >
                        Details
                      </button>
                      {isStaff && (
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 rounded hover:bg-neutral-200"
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && c.status === 'active' && (
                        <button
                          onClick={() => handleDeactivate(c._id)}
                          className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 rounded hover:bg-red-100"
                        >
                          Deactivate
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

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Add New Customer</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Enter customer contact information and address details.
            </p>
            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Customer / Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="billing@acme.com"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 555-0100"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Acme Holdings LLC"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div className="border-t border-neutral-200 pt-3">
                <span className="block text-xs font-bold text-neutral-700 mb-2">Billing Address</span>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value },
                      })
                    }
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="State / Region"
                      value={formData.address.state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, state: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={formData.address.country}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, country: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Internal Notes</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key account details or preferred billing contact"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
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
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Edit Customer</h2>
            <form onSubmit={handleUpdateCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details & Subscriptions Drawer/Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-neutral-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">{selectedCustomer.name}</h2>
                <p className="text-xs text-neutral-500">{selectedCustomer.company || 'Individual Account'}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <div>
                <span className="text-neutral-500 block">Email:</span>
                <span className="font-semibold text-neutral-800">{selectedCustomer.email}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Phone:</span>
                <span className="font-semibold text-neutral-800">{selectedCustomer.phone || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Status:</span>
                <span className="font-semibold capitalize text-neutral-800">{selectedCustomer.status}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Address:</span>
                <span className="font-semibold text-neutral-800">
                  {selectedCustomer.address
                    ? [selectedCustomer.address.street, selectedCustomer.address.city, selectedCustomer.address.country]
                        .filter(Boolean)
                        .join(', ') || '—'
                    : '—'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-neutral-900 mb-3">Linked Subscriptions</h3>
              {customerSubscriptions.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No subscriptions registered for this customer yet.</p>
              ) : (
                <div className="space-y-2">
                  {customerSubscriptions.map((sub) => (
                    <div
                      key={sub._id}
                      className="p-3 bg-white border border-neutral-200 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-primary-600 mr-2">
                          {sub.subscriptionNumber}
                        </span>
                        <span className="font-semibold text-neutral-800">{sub.planName}</span>
                        <span className="text-neutral-400 ml-2 capitalize">({sub.billingInterval})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900">${sub.totalAmount?.toLocaleString()}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            sub.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'paused'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-5 border-t border-neutral-200 mt-6">
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
    </div>
  );
}

export default CustomersPage;
