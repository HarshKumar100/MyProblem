import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { analyzeLocally, localAddProblem } from "../services/localStore";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const SEVERITY_DOT = { High: "bg-red-500", Medium: "bg-orange-400", Low: "bg-green-500" };
const CATEGORY_ICON = {
  "Road Infrastructure": "🛣️", Crime: "🚨", Railway: "🚂", Transport: "🚌",
  Corruption: "⚠️", Education: "📚", Health: "🏥", Environment: "🌿",
  "Water Supply": "💧", Electricity: "⚡", Other: "📋",
};

function NLPPreview({ analysis, loading }) {
  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-[#1a1a1a]/40 py-3">
      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Analysing text…
    </div>
  );
  if (!analysis) return (
    <p className="text-sm text-[#1a1a1a]/35 italic py-3 leading-relaxed">
      Start typing your problem description — AI will detect category, agency and severity automatically.
    </p>
  );
  return (
    <div className="space-y-4">
      {/* Category + agency */}
      <div className="bg-[#ede8df] rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">{CATEGORY_ICON[analysis.category] || "📋"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#1a1a1a] text-sm truncate">{analysis.category}</p>
          <p className="text-xs text-[#1a1a1a]/45 mt-0.5">→ {analysis.agency}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[analysis.severity] || SEVERITY_DOT.Medium}`} />
          <span className="text-xs font-semibold text-[#1a1a1a]/60">{analysis.severity}</span>
        </div>
      </div>
      {/* Keywords */}
      {analysis.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.keywords.map((k) => (
            <span key={k} className="bg-[#ede8df] text-[#1a1a1a]/60 text-xs px-2.5 py-1 rounded-full font-medium">
              #{k}
            </span>
          ))}
        </div>
      )}
      {/* Confidence bar */}
      {analysis.confidence > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-[#1a1a1a]/35">
            <span>Confidence</span>
            <span>{Math.round(analysis.confidence * 100)}%</span>
          </div>
          <div className="w-full bg-[#ede8df] rounded-full h-1.5">
            <div
              className="bg-[#1a1a1a] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(analysis.confidence * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportProblem() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [form, setForm] = useState({ title: "", description: "", location: "" });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);
  const [forceNew, setForceNew] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setDupWarning(null);
  };

  // Auto-submit when user chooses "Submit as New Anyway"
  useEffect(() => {
    if (forceNew) {
      const syntheticEvent = { preventDefault: () => {} };
      handleSubmit(syntheticEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceNew]);

  // Debounced NLP analysis
  useEffect(() => {
    const text = `${form.title} ${form.description}`.trim();
    if (text.length < 15) { setAnalysis(null); return; }
    setAnalysing(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.post("/api/problems/analyze", { text });
        setAnalysis(data.analysis);
      } catch {
        // Backend down — use local keyword analyser
        setAnalysis(analyzeLocally(text));
      } finally { setAnalysing(false); }
    }, 700);
    return () => clearTimeout(t);
  }, [form.title, form.description]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setImage(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      toast.error("Title, description and location are required");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title",       form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("location",    form.location.trim());
      if (forceNew) fd.append("forceNew", "true");
      if (image) fd.append("image", image);

      const { data } = await api.post("/api/problems/report", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.isDuplicate) {
        setDupWarning(data);
        setForceNew(false);
        setSubmitting(false);
        return;
      }

      toast.success("Problem reported successfully! 🎉");
      navigate(`/problems/${data.problem._id}`);
    } catch {
      // Backend down — save locally
      try {
        const imageBase64 = preview || null;
        const problem = localAddProblem(user?._id || "guest", user?.name || "Guest", {
          title: form.title.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
          imageBase64,
        });
        toast.success("Problem saved locally (offline mode) 📦");
        navigate(`/problems/${problem._id}`);
      } catch (localErr) {
        toast.error(localErr.message || "Failed to report problem");
        setSubmitting(false);
      }
    }
  };

  const handleSupportExisting = async () => {
    if (!dupWarning?.existingProblem?._id) return;
    navigate(`/problems/${dupWarning.existingProblem._id}`);
  };

  return (
    <div className="min-h-screen bg-[#ede8df] font-sans">

      {/* ── HERO HEADER ── */}
      <section className="px-8 lg:px-20 pt-14 pb-10">
        <div className="max-w-7xl mx-auto">
          {/* Badge */}
          {/* <div className="inline-flex items-center gap-2 border border-black/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-black/40 inline-block" />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-black/50">
              Submit a Complaint
            </span>
          </div> */}

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <h1 className="text-5xl lg:text-[3.4rem] font-extrabold text-[#1a1a1a] leading-[1.1] mb-4">
                Report Any Problem With<em className="font-normal italic"></em>
                <br />One Simple Form
              </h1>
              <p className="text-[#1a1a1a]/50 text-base leading-relaxed max-w-[380px]">
                Describe your issue in plain language — our AI reads it, detects the category
                and automatically routes it to the right government agency.
              </p>
            </div>

            {/* Quick stat pills */}
            {/* <div className="flex gap-3 shrink-0">
              <div className="bg-[#ddd8cf] rounded-2xl px-6 py-4 text-center">
                <p className="text-3xl font-extrabold text-[#1a1a1a]">10</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mt-1">Categories</p>
              </div>
              <div className="bg-[#ddd8cf] rounded-2xl px-6 py-4 text-center">
                <p className="text-3xl font-extrabold text-[#1a1a1a]">88%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mt-1">AI Accuracy</p>
              </div>
            </div> */}
          </div>
        </div>
      </section>

      {/* ── DUPLICATE WARNING ── */}
      {dupWarning && (
        <div className="px-8 lg:px-20 pb-4">
          <div className="max-w-7xl mx-auto">
            <div className="bg-[#ddd8cf] border border-black/10 rounded-[1.4rem] p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  <span className="text-white text-base">⚠</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#1a1a1a] text-base">Similar complaint already exists</p>
                  <p className="text-sm text-[#1a1a1a]/55 mt-1">{dupWarning.message}</p>
                  <p className="text-sm text-[#1a1a1a]/55 mt-0.5">
                    Similarity: <strong className="text-[#1a1a1a]">{Math.round(dupWarning.similarity * 100)}%</strong>
                  </p>
                  <p className="font-semibold text-[#1a1a1a] mt-2 text-sm">"{dupWarning.existingProblem?.title}"</p>
                  <div className="flex gap-3 mt-4 flex-wrap">
                    <button
                      onClick={handleSupportExisting}
                      className="bg-[#1a1a1a] text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:opacity-80 transition-opacity"
                    >
                      Support Existing Complaint
                    </button>
                    <button
                      onClick={() => { setForceNew(true); setDupWarning(null); }}
                      className="border border-[#1a1a1a]/30 text-[#1a1a1a] text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#1a1a1a]/5 transition-colors"
                    >
                      Submit as New Anyway
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <section className="px-8 lg:px-20 pb-20">
        <div className="max-w-7xl mx-auto">
          

          <div className="grid lg:grid-cols-5 gap-5">

            {/* ── FORM ── */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="bg-[#ddd8cf] rounded-[1.4rem] p-8 space-y-6">

                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-2">
                    Problem Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="title" name="title" type="text" required maxLength={200}
                    value={form.title} onChange={handleChange}
                    placeholder="e.g. Broken road near railway station"
                    className="w-full bg-[#ede8df] text-[#1a1a1a] placeholder-[#1a1a1a]/30 text-sm font-medium px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 transition"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-2">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="description" name="description" required rows={5} maxLength={2000}
                    value={form.description} onChange={handleChange}
                    placeholder="Describe the problem in detail. AI reads your text to detect category and severity…"
                    className="w-full bg-[#ede8df] text-[#1a1a1a] placeholder-[#1a1a1a]/30 text-sm font-medium px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 transition resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-[#1a1a1a]/30 mt-1 text-right">{form.description.length} / 2000</p>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-2">
                    Location <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="location" name="location" type="text" required maxLength={200}
                    value={form.location} onChange={handleChange}
                    placeholder="e.g. Near Rajiv Chowk Metro, New Delhi"
                    className="w-full bg-[#ede8df] text-[#1a1a1a] placeholder-[#1a1a1a]/30 text-sm font-medium px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 transition"
                  />
                </div>

                {/* Image upload */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-2">
                    Photo / Evidence <span className="text-[#1a1a1a]/25 normal-case font-normal text-xs tracking-normal">(optional, max 5 MB)</span>
                  </label>
                  {preview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={preview} alt="preview" className="w-full max-h-52 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImage(null); setPreview(null); }}
                        className="absolute top-3 right-3 w-8 h-8 bg-[#1a1a1a]/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#1a1a1a] transition-colors"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 bg-[#ede8df] rounded-xl cursor-pointer hover:bg-[#e5e0d7] transition-colors border-2 border-dashed border-[#1a1a1a]/15 hover:border-[#1a1a1a]/30">
                      <svg className="w-7 h-7 text-[#1a1a1a]/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-[#1a1a1a]/35 font-medium">Click to upload image</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImage} />
                    </label>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1a1a1a] text-white font-semibold py-3.5 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Submitting…
                    </>
                  ) : "Submit Report →"}
                </button>

              </form>
            </div>

            {/* ── AI SIDEBAR ── */}
            <div className="lg:col-span-2">
              <div className="bg-[#ddd8cf] rounded-[1.4rem] p-7 sticky top-20">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <span className="font-bold text-[#1a1a1a] text-sm">AI Analysis</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/35 border border-[#1a1a1a]/15 px-2.5 py-1 rounded-full">
                    Live
                  </span>
                </div>

                {/* <NLPPreview analysis={analysis} loading={analysing} /> */}

                {analysis && (
                  <div className="mt-5 pt-5 border-t border-[#1a1a1a]/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/35 mb-2">Will be routed to</p>
                    <div className="bg-[#ede8df] rounded-xl px-4 py-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[#1a1a1a] font-bold text-sm">{analysis.agency}</span>
                    </div>
                  </div>
                )}

                <div className="mt-5 pt-5 border-t border-[#1a1a1a]/10">
                  <p className="text-[11px] text-[#1a1a1a]/40 leading-relaxed">
                    <strong className="text-[#1a1a1a]/60">Duplicate detection</strong> runs automatically on submit. If a similar complaint already exists, you can add your support instead of creating a new one.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
