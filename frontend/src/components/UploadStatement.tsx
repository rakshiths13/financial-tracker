"use client";

import { useState } from 'react';
import { UploadCloud, File, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function UploadStatement({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    } else {
      toast.error('Please upload a valid PDF file');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast.error('Please upload a valid PDF file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/statements/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Statement uploaded and parsed successfully!');
      setFile(null);
      onUploadSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to upload statement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Upload Bank Statement</h3>

      {!file ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <UploadCloud className="h-12 w-12 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500">PDF only (HDFC, SBI, or Generic format)</p>
          <input
            id="file-upload"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
          <div className="flex items-center space-x-3">
            <File className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setFile(null)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Upload & Parse'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
