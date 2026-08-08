"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface FileResult {
  file_name: string;
  status: "success" | "failed" | "no_data";
  error?: string;
  parsed_count: number;
  skipped_count: number;
  transaction_ids: number[];
}

interface UploadStatementProps {
  onUploadSuccess: () => void;
}

const MAX_FILES = 7;

export default function UploadStatement({ onUploadSuccess }: UploadStatementProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FileResult[] | null>(null);

  const addFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter((f) => f.type === "application/pdf");
    if (pdfs.length !== incoming.length) {
      toast.error("Only PDF files are allowed.");
    }
    setFiles((prev) => {
      const merged = [...prev, ...pdfs];
      if (merged.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed.`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = ""; // allow re-selecting same files
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setResults(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const { data } = await api.post<FileResult[]>("/statements/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResults(data);
      const success = data.filter((r) => r.status === "success");
      const failed = data.filter((r) => r.status !== "success");
      if (success.length > 0) {
        const total = success.reduce((acc, r) => acc + r.parsed_count - r.skipped_count, 0);
        toast.success(`${success.length} statement${success.length > 1 ? "s" : ""} processed — ${total} transactions added!`);
        onUploadSuccess();
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} file${failed.length > 1 ? "s" : ""} could not be parsed.`);
      }
      setFiles([]);
    } catch (error) {
      const errRes = error as { response?: { data?: { detail?: string } } };
      toast.error(errRes.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "success") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (status === "failed") return <XCircle className="h-5 w-5 text-red-500" />;
    return <AlertCircle className="h-5 w-5 text-amber-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="card p-6 card-hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-700 font-bold text-slate-900">Upload Bank Statements</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload up to {MAX_FILES} PDF statements from any bank
          </p>
        </div>
        {files.length > 0 && !loading && (
          <button
            onClick={() => document.getElementById("file-upload-input")?.click()}
            className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add more
          </button>
        )}
      </div>

      <input
        id="file-upload-input"
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {/* Drop zone — shown when no files queued */}
      {files.length === 0 && (
        <motion.div
          layout
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-upload-input")?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
              : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50"
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragging ? "bg-indigo-100" : "bg-white shadow-md"}`}>
            <UploadCloud className={`h-7 w-7 transition-colors duration-300 ${isDragging ? "text-indigo-600" : "text-slate-400"}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">
              {isDragging ? "Drop your files here" : "Click to upload or drag & drop"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              PDF bank statements — HDFC, SBI, ICICI, Axis, Kotak &amp; more · Max {MAX_FILES} files
            </p>
          </div>
        </motion.div>
      )}

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ul className="space-y-2 mb-4">
              {files.map((f, idx) => (
                <motion.li
                  key={`${f.name}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4.5 w-4.5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{f.name}</p>
                      <p className="text-xs text-slate-400">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    disabled={loading}
                    className="ml-3 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </ul>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {files.length} / {MAX_FILES} files selected
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Clear All
                </button>
                <motion.button
                  onClick={handleUpload}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      Upload {files.length} File{files.length > 1 ? "s" : ""}
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results panel */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Upload Summary</h4>
            {results.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  r.status === "success"
                    ? "bg-emerald-50 border-emerald-200"
                    : r.status === "failed"
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <StatusIcon status={r.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.file_name}</p>
                  {r.status === "success" ? (
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {r.parsed_count - r.skipped_count} added
                      {r.skipped_count > 0 && `, ${r.skipped_count} duplicates skipped`}
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 mt-0.5">{r.error || "Could not parse"}</p>
                  )}
                </div>
              </motion.div>
            ))}
            <button
              onClick={() => setResults(null)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors mt-1"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
