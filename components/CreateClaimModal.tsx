import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { CreateClaimData } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClaimData) => Promise<void>;
}

export const CreateClaimModal: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateClaimData>>({
    policyNumber: '',
    vehicleModel: '',
    vehicleYear: '',
    accidentDetails: '',
    images: []
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, images: Array.from(e.target.files) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.policyNumber || !formData.images?.length) {
      alert("Please fill in required fields and upload an image.");
      return;
    }
    setLoading(true);
    await onSubmit(formData as CreateClaimData);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-800">File New Claim</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Policy Number</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.policyNumber}
                onChange={e => setFormData({...formData, policyNumber: e.target.value})}
                placeholder="POL-12345678"
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Year</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.vehicleYear}
                onChange={e => setFormData({...formData, vehicleYear: e.target.value})}
                placeholder="2022"
              />
            </div>
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Model</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.vehicleModel}
                onChange={e => setFormData({...formData, vehicleModel: e.target.value})}
                placeholder="Toyota Camry XLE"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Accident Details</label>
              <textarea
                rows={4}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.accidentDetails}
                onChange={e => setFormData({...formData, accidentDetails: e.target.value})}
                placeholder="Describe what happened..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Damage Photos</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors relative">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                <p className="text-sm text-slate-600">Click to upload photos or videos</p>
                {formData.images && formData.images.length > 0 && (
                  <p className="text-green-600 font-medium mt-2">{formData.images.length} files selected</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              {loading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Processing...</> : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};