import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import p1 from "../assets/p1.png";
import p2 from "../assets/p2.jpeg";
import p11 from "../assets/p11.jpeg";
import p12 from "../assets/p12.png";
import p3 from "../assets/p3.png";
import p4 from "../assets/p4.png";
import p5 from "../assets/p5.png";
import p6 from "../assets/p6.png";

const CATEGORIES = [
  {
    num: "01", icon: "🛣️", name: "Road Infrastructure", agency: "MCD / PWD",
    desc: "Potholes, broken roads, damaged bridges, speed breakers and missing road signs affecting daily commute and public safety.",
    bullets: ["Pothole & Road Damage Reports", "Bridge & Flyover Safety Issues", "Missing Road Signs & Markings", "Encroachment on Roads"],
    img: p12
  },
  {
    num: "02", icon: "🚨", name: "Crime & Safety", agency: "Police Department",
    desc: "Theft, robbery, assault, cybercrime, domestic violence and other criminal matters requiring immediate police intervention.",
    bullets: ["Theft, Robbery & Assault", "Cybercrime & Online Fraud", "Eve-Teasing & Domestic Violence", "Missing Persons Reports"],
    img: p4
  },
  {
    num: "03", icon: "🚂", name: "Railway", agency: "Indian Railways",
    desc: "Train delays, station infrastructure issues, safety concerns, ticketing problems and passenger grievances on Indian Railways.",
    bullets: ["Train Delays & Cancellations", "Station Cleanliness & Facilities", "Safety & Security Onboard", "Ticketing & Refund Issues"],
    img: p11
  },
  {
    num: "04", icon: "🚌", name: "Transport", agency: "Transport Department",
    desc: "Overcharging autos, bus route problems, RTO documentation issues, traffic violations and public transit complaints.",
    bullets: ["Auto / Taxi Overcharging", "Bus Route & Frequency Issues", "RTO & Driving License Problems", "Traffic Signal Malfunctions"],
    img: p6
  },
  {
    num: "05", icon: "⚠️", name: "Corruption", agency: "Anti-Corruption Bureau",
    desc: "Bribery demands, misuse of government funds, illegal permits and exploitation of welfare schemes by public officials.",
    bullets: ["Bribery by Government Officials", "Misuse of Public Funds", "Illegal Permits & Licenses", "Welfare Scheme Fraud"],
    img: p2
  },
  {
    num: "06", icon: "📚", name: "Education", agency: "Education Department",
    desc: "Missing teachers, scholarship delays, mid-day meal quality, school infrastructure failures and examination irregularities.",
    bullets: ["Teacher Absenteeism", "Scholarship & Fee Issues", "Mid-Day Meal Quality", "School Building & Infrastructure"],
    img: p3
  },
  {
    num: "07", icon: "🏥", name: "Health", agency: "Health Department",
    desc: "Hospital staff shortage, ambulance unavailability, medicine supply gaps, vaccination drives and public health emergencies.",
    bullets: ["Hospital Staff & Doctor Shortage", "Ambulance Availability", "Medicine & Equipment Supply", "Vaccination & Health Camps"],
    img: p5
  },
  {
    num: "08", icon: "🌿", name: "Environment", agency: "Pollution Control Board",
    desc: "Air pollution, noise pollution, water contamination, illegal dumping, deforestation and industrial waste violations.",
    bullets: ["Air & Noise Pollution", "Illegal Waste Dumping", "Water Source Contamination", "Illegal Tree Cutting"],
    img: p6
  },
  {
    num: "09", icon: "💧", name: "Water Supply", agency: "Water Supply Department",
    desc: "No water supply, contaminated water, broken underground pipelines, low pressure and water shortage in residential areas.",
    bullets: ["No Water Supply / Shortage", "Contaminated / Dirty Water", "Broken Pipelines & Leaks", "Low Water Pressure"],
    img: p1
  },
  {
    num: "10", icon: "⚡", name: "Electricity", agency: "Electricity Department",
    desc: "Power cuts, voltage fluctuation, wrong billing, street light failures, illegal connections and transformer issues.",
    bullets: ["Frequent Power Cuts & Outages", "Voltage Fluctuation & Damage", "Wrong / Excess Billing", "Street Light Not Working"],
    img: p4
  },
];

const STATS = [
  // { value: "10,000+", label: "Problems Reported" },
  // { value: "10+",     label: "Problem Categories" },
  // { value: "88%",     label: "AI Accuracy" },
];

const STEPS = [
  { num: "01", title: "Describe the Problem", desc: "Type your complaint in plain language — Hindi or English. No paperwork needed." },
  { num: "02", title: "AI Analyses Your Text", desc: "Our NLP engine detects category, severity, keywords and flags duplicate complaints instantly." },
  { num: "03", title: "Routed to Right Agency", desc: "Your complaint is auto-assigned to the correct government body and tracked in real time." },
];

export default function Home() {
  const { user } = useAuth();
  const [openCat, setOpenCat] = useState(0);

  return (
    <div className="font-sans">

      {/* ═══════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════ */}
      {/* LexGuard-style full-bleed split hero */}
      <section className="flex flex-col lg:flex-row min-h-[92vh] px-1 lg:px-2 pt-0 pb-1 gap-1.5 lg:gap-2">

        {/* LEFT – dark panel */}
        <div className="relative flex-1 bg-[#111111] flex flex-col justify-between px-10 py-14 lg:px-16 lg:py-16 overflow-hidden">
          {/* Decorative curved lines */}
          <svg className="absolute bottom-0 left-0 w-full opacity-10 pointer-events-none" viewBox="0 0 600 400" fill="none">
            <path d="M-50 350 Q150 200 350 280 T750 150" stroke="white" strokeWidth="1.2" fill="none" />
            <path d="M-50 380 Q200 230 400 310 T750 180" stroke="white" strokeWidth="1.2" fill="none" />
            <path d="M-50 410 Q250 260 450 340 T750 210" stroke="white" strokeWidth="1.2" fill="none" />
            <path d="M-50 440 Q300 290 500 370 T750 240" stroke="white" strokeWidth="1.2" fill="none" />
          </svg>

          {/* Top badge */}
          {/* <div>
            <span className="inline-flex items-center gap-2 border border-white/20 text-white/70 text-xs font-medium px-4 py-1.5 rounded-full">
              ✦ &nbsp;AI-Powered · Built for India
            </span>
          </div> */}

          {/* Centre text */}
          <div className="my-auto py-10">
            <h1 className="text-5xl lg:text-[3.6rem] font-extrabold text-white leading-[1.08] mb-6">
              Report Any Problem.<br />
              Reach the Right Agency.
            </h1>
            <p className="text-white/50 text-base lg:text-lg leading-relaxed max-w-md mb-10">
              Stop hunting for government portals. Describe your problem and our AI
              automatically routes it to MCD, Police, Railways or any agency — instantly.
            </p>
            {user ? (
              <Link to="/report"
                className="inline-flex items-center gap-3 border border-white text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-white hover:text-black transition-all duration-200">
                Report a Problem &nbsp;→
              </Link>
            ) : (
              <Link to="/register"
                className="inline-flex items-center gap-3 border border-white text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-white hover:text-black transition-all duration-200">
                Get Started Free &nbsp;→
              </Link>
            )}
          </div>

          {/* Bottom stats row */}
          <div className="flex flex-wrap gap-10 pt-10 border-t border-white/10">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-extrabold text-white">{s.value}</p>
                <p className="text-white/40 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT – full-bleed image */}
        <div className="relative flex-1 min-h-[50vh] lg:min-h-0 overflow-hidden">
          <img
            src={p11}
            alt="Citizen reporting"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Floating trust badge – bottom right */}
          {/* <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-200 border-2 border-white flex items-center justify-center text-xs font-bold text-blue-700">A</div>
              <div className="w-8 h-8 rounded-full bg-green-200 border-2 border-white flex items-center justify-center text-xs font-bold text-green-700">B</div>
              <div className="w-8 h-8 rounded-full bg-orange-200 border-2 border-white flex items-center justify-center text-xs font-bold text-orange-700">C</div>
            </div>
            <div>
              <p className="text-gray-900 text-sm font-bold">Trusted by Citizens</p>
              <p className="text-yellow-500 text-xs font-semibold">★ 4.8 &nbsp;<span className="text-gray-400 font-normal">Trust Score</span></p>
            </div>
          </div> */}
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════
          ABOUT / PLATFORM INTRO
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <div className="relative group">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-50 -z-10" />
            <img src={p2} alt="Government building"
              className="rounded-2xl w-full object-cover shadow-lg group-hover:scale-[1.02] transition-transform duration-500" />
            {/* <div className="absolute top-6 right-6 bg-[#0a0f1e] text-white rounded-xl px-4 py-3 text-sm font-semibold shadow-xl">
              🏛️ &nbsp;Trusted by Citizens
            </div> */}
          </div>

          {/* Text */}
          <div>
            <span className="text-black text-xs font-bold uppercase tracking-widest">About MyProblem</span>
            <h2 className="text-4xl font-extrabold text-black leading-tight mt-3 mb-5">
              We exist for one reason: <br />
              <span className="text-black">Make your voice reach the government.</span>
            </h2>
            <p className="text-black/70 leading-relaxed mb-5">
              MyProblem is an AI-powered citizen grievance platform. We use Natural Language Processing
              to read your complaint, understand it, and automatically route it to the right government
              department — without you needing to know which portal to use.
            </p>
            <p className="text-black/70 leading-relaxed mb-8">
              Built on a dataset of <strong>173,000+ real PGPORTAL grievances</strong>, our model recognises
              10 problem categories with 88% accuracy — including Road, Crime, Health, Railway and more.
            </p>
            <Link to={user ? "/report" : "/register"}
              className="inline-flex items-center gap-2 bg-[#0a0f1e] hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-lg transition-all duration-200">
              {user ? "Report a Problem →" : "Get Started →"}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS (dark strip)
      ═══════════════════════════════════════════════════════════ */}
      {/* <section className="bg-[#0a0f1e] py-24 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
            <div>
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">How It Works</span>
              <h2 className="text-4xl font-extrabold text-white mt-2">Three steps to get heard</h2>
            </div>
            <Link to={user ? "/report" : "/register"}
              className="shrink-0 text-sm text-blue-400 hover:text-blue-300 font-semibold border border-blue-500/40 hover:border-blue-400 px-5 py-2.5 rounded-lg transition-all">
              Start Now →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.num}
                className="group bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-500 rounded-2xl p-8 transition-all duration-300 cursor-default">
                <span className="text-5xl font-black text-white/10 group-hover:text-white/20 block mb-6">{s.num}</span>
                <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-gray-400 group-hover:text-blue-100 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* ═══════════════════════════════════════════════════════════
          LIVE EXAMPLE (demo strip)
      ═══════════════════════════════════════════════════════════ */}
      {/* <section className="py-14 px-6 lg:px-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-gray-400 uppercase tracking-wider font-semibold mb-8">Live AI Demo</p>
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Citizen types:</p>
              <p className="text-gray-800 italic text-base">"Road near the railway station is broken and causing accidents every day"</p>
            </div>
            <div className="text-3xl text-gray-300 shrink-0 hidden sm:block">→</div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-3">AI detects:</p>
              <div className="space-y-2 text-sm">
                <div className="flex gap-3"><span className="text-gray-400 w-20">Category</span><span className="font-semibold text-blue-600">Road Infrastructure</span></div>
                <div className="flex gap-3"><span className="text-gray-400 w-20">Agency</span><span className="font-semibold text-green-600">MCD / PWD</span></div>
                <div className="flex gap-3"><span className="text-gray-400 w-20">Severity</span><span className="font-semibold text-red-500">High</span></div>
                <div className="flex gap-3"><span className="text-gray-400 w-20">Confidence</span><span className="font-semibold text-gray-800">98%</span></div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* ═══════════════════════════════════════════════════════════
          CATEGORIES (LexGuard-style dark accordion)
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#111111] py-20 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto">

          {/* Header row */}
          <div className="flex items-start justify-between mb-8">
            <h2 className="text-4xl lg:text-[2.6rem] font-bold text-white leading-tight whitespace-nowrap">
              All Problem Categories Covered
            </h2>
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <span className="w-2 h-2 bg-white/50 inline-block" />
              <span className="text-white/50 text-sm font-medium">Our Services</span>
            </div>
          </div>

          {/* Top divider */}
          <div className="border-t border-white/20" />

          {/* Accordion rows */}
          <div>
            {CATEGORIES.map((cat, idx) => (
              <div key={cat.num} className="border-b border-white/10">

                {/* Row header */}
                <div
                  className="flex items-center justify-between py-5 cursor-pointer group"
                  onMouseEnter={() => setOpenCat(idx)}
                >
                  <div className="flex items-center gap-5">
                    <span className="text-white/30 text-sm font-medium w-7 shrink-0">{cat.num}.</span>
                    <span className={`text-xl lg:text-2xl font-medium transition-colors ${openCat === idx ? "text-white" : "text-white/60 group-hover:text-white"
                      }`}>
                      {cat.name}
                    </span>
                  </div>
                </div>

                {/* Expanded body */}
                {openCat === idx && (
                  <div className="flex flex-col lg:flex-row gap-8 pb-8">
                    {/* Left: description + bullets */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-sm">{cat.desc}</p>
                      <ul className="space-y-3">
                        {cat.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-3 text-white/60 text-sm">
                            <span className="w-1.5 h-1.5 bg-white/40 shrink-0 inline-block" />
                            {b}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6">
                        <span className="text-white/30 text-xs font-semibold uppercase tracking-wider">Agency: </span>
                        <span className="text-white/50 text-xs">{cat.agency}</span>
                      </div>
                    </div>
                    {/* Right: image */}
                    <div className="relative rounded-xl overflow-hidden lg:w-[380px] shrink-0 aspect-[4/3]">
                      <img
                        src={cat.img}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SMART DUPLICATE DETECTION FEATURE
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Smart Feature</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-5">
              AI Duplicate Detection
            </h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Every day, hundreds of citizens report the same broken road, the same flooded street,
              the same non-functional streetlight — without knowing others already did. Our AI reads
              your complaint the moment you type it and instantly scans all existing reports to detect
              if the same issue has already been raised by someone in your area.
            </p>
            <p className="text-gray-500 leading-relaxed mb-6">
              Instead of creating a duplicate entry that gets lost in the system, you can{" "}
              <strong className="text-gray-700">add your support</strong> to the existing complaint with a single click.
              Government agencies don't just see one complaint — they see{" "}
              <strong className="text-gray-700">17 citizens, 43 citizens, 100+ citizens</strong> all
              reporting the same problem. That collective weight forces faster action, higher priority
              assignment, and real accountability from the responsible department.
            </p>
            {/* <div className="bg-white border border-yellow-200 rounded-xl p-5 shadow-sm max-w-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-yellow-800 font-semibold text-sm">Already reported by 17 people</p>
                  <p className="text-yellow-600 text-xs mt-1">Would you like to support this complaint?</p>
                  <button className="mt-3 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-900 font-semibold px-4 py-1.5 rounded-lg transition-colors">
                    + Add Support
                  </button>
                </div>
              </div>
            </div> */}
          </div>
          <div className="relative group">
            <img src={p5} alt="AI Duplicate Detection"
              className="rounded-2xl w-full object-cover shadow-xl group-hover:scale-[1.02] transition-transform duration-500" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CTA
      ═══════════════════════════════════════════════════════════ */}
      {!user && (
        <section className="bg-[#0a0f1e] py-24 px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Next Step</span>
            <h2 className="text-4xl font-extrabold text-white mt-3 mb-4">
              Ready to make your voice heard?
            </h2>
            <p className="text-gray-400 mb-10">
              Join thousands of citizens using MyProblem to fix their communities.
              Register free — no paperwork, no portals.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 py-3.5 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30">
                Register Now – It's Free →
              </Link>
              <Link to="/login"
                className="inline-flex items-center gap-2 border border-white/20 hover:border-white/50 text-white font-semibold px-8 py-3.5 rounded-lg transition-all duration-200 hover:bg-white/5">
                Sign In
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

