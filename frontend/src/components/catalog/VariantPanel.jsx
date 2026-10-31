import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/apiClient.js';

function VariantPanel({ product, onClose }) {
  const [variants, setVariants] = useState([]);
  const [basePrice, setBasePrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', additionalPrice: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/products/${product._id}/variants`);
      setVariants(res.data.data);
      setBasePrice(res.data.basePrice);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load variants');
    } finally {
      setLoading(false);
    }
  }, [product._id]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Variant name is required';
    if (form.additionalPrice === '' || isNaN(form.additionalPrice)) errs.additionalPrice = 'Valid price is required';
    else if (Number(form.additionalPrice) < 0) errs.additionalPrice = 'Price cannot be negative';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await apiClient.post(`/products/${product._id}/variants`, {
        name: form.name.trim(),
        additionalPrice: Number(form.additionalPrice),
      });
      setForm({ name: '', additionalPrice: '' });
      setShowAdd(false);
      fetchVariants();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add variant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Variants — {product.name}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Base price: ₹{basePrice?.toFixed(2)}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : variants.length === 0 && !showAdd ? (
            <div className="text-center py-10 text-neutral-400">
              <p className="font-medium">No variants yet</p>
              <p className="text-sm mt-1">Add a variant like a brand or edition.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v._id} className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{v.name}</p>
                    <p className="text-xs text-neutral-500">
                      +₹{v.additionalPrice?.toFixed(2)} → Total: ₹{v.calculatedPrice?.toFixed(2)}
                    </p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          {showAdd && (
            <form onSubmit={handleAdd} className="card space-y-3">
              <div>
                <label htmlFor="variant-name" className="block text-sm font-medium text-neutral-700 mb-1">
                  Variant Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="variant-name"
                  type="text"
                  placeholder="e.g. Odoo, Premium Edition"
                  value={form.name}
                  onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${formErrors.name ? 'border-red-400' : 'border-neutral-300'}`}
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label htmlFor="variant-price" className="block text-sm font-medium text-neutral-700 mb-1">
                  Additional Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  id="variant-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.additionalPrice}
                  onChange={(e) => { setForm((p) => ({ ...p, additionalPrice: e.target.value })); }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${formErrors.additionalPrice ? 'border-red-400' : 'border-neutral-300'}`}
                />
                {formErrors.additionalPrice && <p className="text-red-500 text-xs mt-1">{formErrors.additionalPrice}</p>}
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                  {saving ? 'Adding...' : 'Add Variant'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-between shrink-0">
          {!showAdd && (
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
              + Add Variant
            </button>
          )}
          <button onClick={onClose} className="btn-secondary text-sm ml-auto">Close</button>
        </div>
      </div>
    </div>
  );
}

export default VariantPanel;
