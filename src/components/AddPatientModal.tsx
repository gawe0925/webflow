import { useState } from 'react';
import { PatientFormData, WebsterPakStatus, PackItem } from '../types';
import { X, Plus, Save, Trash2, Calendar, DollarSign, CreditCard } from 'lucide-react';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPatient: (data: PatientFormData & { initialStatus: WebsterPakStatus }) => void;
}

export default function AddPatientModal({ isOpen, onClose, onAddPatient }: AddPatientModalProps) {
  const [formData, setFormData] = useState<PatientFormData & { initialStatus: WebsterPakStatus }>({
    patientCode: '',
    notes: '',
    attachments: [],
    initialStatus: 'TODO',
    packs: [],
    hasWebsterPakFee: true, // 預設勾選 Pak Fee
    isAccountPayment: false  // 預設不勾選 Account Payment
  });

  // Error message state (in English)
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Dynamically add a weekly pack
  const handleAddPack = () => {
    const currentPacks = formData.packs || [];
    const nextPackNumber = currentPacks.length + 1;

    // Automatically calculate next week's date (+7 days)
    let defaultDate = new Date().toISOString().split('T')[0];
    if (currentPacks.length > 0) {
      const lastPackDateStr = currentPacks[currentPacks.length - 1].startDate;
      if (lastPackDateStr) {
        const [year, month, day] = lastPackDateStr.split('-').map(Number);
        const lastDate = new Date(year, month - 1, day);
        lastDate.setDate(lastDate.getDate() + 7);

        const y = lastDate.getFullYear();
        const m = String(lastDate.getMonth() + 1).padStart(2, '0');
        const d = String(lastDate.getDate()).padStart(2, '0');
        defaultDate = `${y}-${m}-${d}`;
      }
    }

    const newPack: PackItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      packNumber: nextPackNumber,
      startDate: defaultDate,
      isCompleted: false
    };

    setFormData({
      ...formData,
      packs: [...currentPacks, newPack]
    });
  };

  const handleRemovePack = (id: string) => {
    const updated = (formData.packs || [])
      .filter(p => p.id !== id)
      .map((p, idx) => ({ ...p, packNumber: idx + 1 })); // Re-index pack numbers

    setFormData({ ...formData, packs: updated });
  };

  const handlePackDateChange = (id: string, newDate: string) => {
    const updated = (formData.packs || []).map(p =>
      p.id === id ? { ...p, startDate: newDate } : p
    );
    setFormData({ ...formData, packs: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Trim whitespace and convert to uppercase
    const cleanedCode = formData.patientCode.trim().toUpperCase();

    // 2. Validate empty string
    if (!cleanedCode) {
      setErrorMessage('Patient Code is required.');
      return;
    }

    // 3. Validate alphanumeric combination (at least 1 letter and 1 number)
    const alphaNumericRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]+$/;
    if (!alphaNumericRegex.test(cleanedCode)) {
      setErrorMessage('Patient Code must combine letters and numbers (e.g., M22).');
      return;
    }

    // 4. Clear error and submit form data
    setErrorMessage('');
    onAddPatient({
      ...formData,
      patientCode: cleanedCode,
    });

    // 5. Reset form state and close modal
    setFormData({
      patientCode: '',
      notes: '',
      attachments: [],
      initialStatus: 'TODO',
      packs: [],
      hasWebsterPakFee: true, // 重置為預設勾選
      isAccountPayment: false
    });

    onClose();
  };

  const handleClose = () => {
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div
        className="absolute inset-0 z-0"
        onClick={handleClose}
      />

      {/* Modal Main Body */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col border border-zinc-200/80 overflow-hidden relative z-10">

        {/* Header */}
        <div className="bg-zinc-50/80 border-b border-zinc-200/80 p-5 rounded-t-2xl flex items-center justify-between shrink-0">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-zinc-700" />
            Add New Patient
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-zinc-200/60 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content Area */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-zinc-800">
          <div>
            <label htmlFor="patientCode" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Patient Code *
            </label>
            <input
              type="text"
              id="patientCode"
              value={formData.patientCode}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  patientCode: e.target.value.toUpperCase() // Convert to uppercase immediately
                });
                if (errorMessage) setErrorMessage(''); // Clear error message on typing
              }}
              className={`w-full p-2.5 bg-white border rounded-xl focus:outline-none text-xs text-zinc-900 placeholder:text-zinc-400 transition-colors ${
                errorMessage
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-zinc-300 focus:ring-2 focus:ring-zinc-900'
              }`}
              placeholder="e.g., M22"
              required
              autoFocus
            />
            {/* English Validation Error Message */}
            {errorMessage && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Billing & Payment Options */}
          <div className="p-3 bg-zinc-50/70 border border-zinc-200/80 rounded-xl space-y-2">
            <span className="block text-xs font-semibold text-zinc-800 mb-1">
              Billing & Payment Options
            </span>
            
            {/* Webster-Pak Fee Checklist */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-zinc-700 select-none">
              <input
                type="checkbox"
                checked={formData.hasWebsterPakFee ?? true}
                onChange={(e) => setFormData({ ...formData, hasWebsterPakFee: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Webster-Pak Fee Included
              </span>
            </label>

            {/* Account Payment Checklist */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-zinc-700 select-none">
              <input
                type="checkbox"
                checked={formData.isAccountPayment ?? false}
                onChange={(e) => setFormData({ ...formData, isAccountPayment: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                Account Payment
              </span>
            </label>
          </div>

          {/* Webster-paks Weeks Section */}
          <div className="p-4 bg-zinc-50/70 border border-zinc-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-zinc-700" />
                Webster-pak Weeks / Packs
              </label>
              <button
                type="button"
                onClick={handleAddPack}
                className="text-xs px-2.5 py-1 bg-zinc-900 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-1 font-medium shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Pack
              </button>
            </div>

            {(!formData.packs || formData.packs.length === 0) ? (
              <p className="text-xs text-zinc-400 p-3 bg-white rounded-xl border border-dashed border-zinc-200 text-center">
                No packs added yet. Click "+ Add Pack" to define weekly packs.
              </p>
            ) : (
              <div className="space-y-2">
                {formData.packs.map((pack) => (
                  <div key={pack.id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-zinc-200 shadow-xs">
                    <span className="text-xs font-semibold text-zinc-800 w-16">Pack {pack.packNumber}</span>
                    <input
                      type="date"
                      value={pack.startDate}
                      onChange={(e) => handlePackDateChange(pack.id, e.target.value)}
                      className="flex-1 text-xs p-1.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 text-zinc-700 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePack(pack.id)}
                      className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-colors"
                      title="Delete Pack"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-3 bg-white border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs text-zinc-900 min-h-[90px] placeholder:text-zinc-400"
              placeholder="Add any notes about this patient..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2.5 pt-3 border-t border-zinc-100">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-zinc-900 text-white text-xs font-medium rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Add Patient
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-zinc-100 text-zinc-700 border border-zinc-200/80 text-xs font-medium rounded-xl hover:bg-zinc-200/80 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}