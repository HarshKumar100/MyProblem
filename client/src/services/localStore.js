// ─── localStorage fallback store ────────────────────────────────────────────
// Used when the backend / MongoDB is unavailable.
// All data is stored in localStorage under the "mp_" namespace.

const LS_PROBLEMS = "mp_local_problems";

// ── helpers ──────────────────────────────────────────────────────────────────
export const getProblems = () =>
  JSON.parse(localStorage.getItem(LS_PROBLEMS) || "[]");

const saveProblems = (list) =>
  localStorage.setItem(LS_PROBLEMS, JSON.stringify(list));

// ── NLP fallback (keyword-based) ─────────────────────────────────────────────
const CATEGORIES = [
  { name: "Road Infrastructure", agency: "Public Works Department (PWD)",  keywords: ["road", "pothole", "bridge", "highway", "footpath", "street"] },
  { name: "Crime",               agency: "Police Department",               keywords: ["crime", "theft", "robbery", "assault", "murder", "kidnap", "fraud"] },
  { name: "Railway",             agency: "Indian Railways",                 keywords: ["train", "railway", "station", "track", "rail"] },
  { name: "Transport",           agency: "Regional Transport Office (RTO)", keywords: ["bus", "transport", "auto", "rickshaw", "taxi", "traffic"] },
  { name: "Corruption",          agency: "Anti-Corruption Bureau",          keywords: ["bribe", "corrupt", "fraud", "scam", "money", "official"] },
  { name: "Education",           agency: "Department of Education",         keywords: ["school", "college", "teacher", "student", "exam", "education"] },
  { name: "Health",              agency: "Department of Health",            keywords: ["hospital", "doctor", "medicine", "health", "clinic", "disease"] },
  { name: "Environment",         agency: "Pollution Control Board",         keywords: ["pollution", "garbage", "waste", "toxic", "environment", "smoke"] },
  { name: "Water Supply",        agency: "Water Supply Department",         keywords: ["water", "pipe", "leak", "supply", "drain", "sewage"] },
  { name: "Electricity",         agency: "Electricity Department",          keywords: ["electricity", "power", "light", "wire", "voltage", "outage"] },
];

const SEVERITY_WORDS = {
  High:   ["urgent", "emergency", "dead", "killed", "dangerous", "critical", "severe", "fire", "flood"],
  Medium: ["broken", "damaged", "issue", "problem", "trouble", "missing", "blocked"],
};

export const analyzeLocally = (text) => {
  const lower = text.toLowerCase();
  let matched = CATEGORIES.find((c) => c.keywords.some((k) => lower.includes(k)));
  if (!matched) matched = { name: "Other", agency: "Concerned Department" };

  let severity = "Low";
  if (SEVERITY_WORDS.High.some((w) => lower.includes(w)))   severity = "High";
  else if (SEVERITY_WORDS.Medium.some((w) => lower.includes(w))) severity = "Medium";

  const words = lower.match(/\b[a-z]{4,}\b/g) || [];
  const stopwords = new Set(["this","that","with","have","from","they","will","been","your","what","when","also","into","more","about","over","just","very","some"]);
  const keywords = [...new Set(words.filter((w) => !stopwords.has(w)))].slice(0, 5);

  return { category: matched.name, agency: matched.agency, severity, keywords, confidence: 0.7 };
};

// ── CRUD ──────────────────────────────────────────────────────────────────────
export const localAddProblem = (userId, userName, formData) => {
  const analysis = analyzeLocally(`${formData.title} ${formData.description}`);
  const problem = {
    _id:          `local_${Date.now()}`,
    title:        formData.title,
    description:  formData.description,
    location:     formData.location,
    imageUrl:     formData.imageBase64 || null,
    category:     analysis.category,
    agency:       analysis.agency,
    severity:     analysis.severity,
    keywords:     analysis.keywords,
    status:       "Pending",
    supportCount: 0,
    supporters:   [],
    adminComment: "",
    user:         { _id: userId, name: userName },
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
  };
  saveProblems([problem, ...getProblems()]);
  return problem;
};

export const localGetMyProblems = (userId) =>
  getProblems().filter((p) => p.user?._id === userId);

export const localGetAllProblems = ({ category, status, search, page = 1, limit = 15 } = {}) => {
  let list = getProblems();
  if (category && category !== "All") list = list.filter((p) => p.category === category);
  if (status   && status   !== "All") list = list.filter((p) => p.status   === status);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q)
    );
  }
  const total = list.length;
  const start = (page - 1) * limit;
  return {
    problems:   list.slice(start, start + limit),
    pagination: { total, page, pages: Math.ceil(total / limit) },
  };
};

export const localGetProblemById = (id) =>
  getProblems().find((p) => p._id === id) || null;

export const localUpdateStatus = (id, status, adminComment) => {
  const list = getProblems().map((p) =>
    p._id === id ? { ...p, status, adminComment: adminComment || p.adminComment, updatedAt: new Date().toISOString() } : p
  );
  saveProblems(list);
  return list.find((p) => p._id === id);
};

export const localAddSupport = (id, userId) => {
  const list = getProblems().map((p) => {
    if (p._id !== id) return p;
    if (p.supporters.includes(userId)) throw new Error("Already supported");
    return { ...p, supportCount: p.supportCount + 1, supporters: [...p.supporters, userId] };
  });
  saveProblems(list);
  const updated = list.find((p) => p._id === id);
  return { supportCount: updated.supportCount };
};

export const localGetStats = () => {
  const list = getProblems();
  return {
    total:      list.length,
    pending:    list.filter((p) => p.status === "Pending").length,
    inProgress: list.filter((p) => p.status === "In Progress").length,
    resolved:   list.filter((p) => p.status === "Resolved").length,
    rejected:   list.filter((p) => p.status === "Rejected").length,
  };
};
