import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Users, Lightbulb, Code2, Layout, Shield, ChevronRight, Star, ArrowLeft } from 'lucide-react';

const sections = [
  {
    id: 'governing',
    icon: <Shield className="w-6 h-6" />,
    title: 'Governing & Advisory Layer',
    subtitle: 'Strategic oversight, academic rigor, and compliance',
    color: 'from-orange-500 to-amber-600',
    lightColor: 'from-orange-50/60 to-amber-50/40',
    borderColor: 'border-orange-200/70',
    textColor: 'text-orange-600',
    members: [
      {
        name: 'Dr. Anant J. Umbarkar',
        role: 'Founder / Chief Mentor (Academic Lead / PI)',
        contributions: [
          'Vision and mission alignment',
          'Research ethics, IP, and policy compliance',
          'Strategic partnerships and funding guidance',
        ],
        badge: 'PI',
      },
    ],
  },
  {
    id: 'research',
    icon: <Lightbulb className="w-6 h-6" />,
    title: 'Research & Innovation Leadership',
    subtitle: 'Core research direction and innovation pipeline',
    color: 'from-orange-500 to-orange-600',
    lightColor: 'from-orange-50/60 to-orange-100/30',
    borderColor: 'border-orange-200/70',
    textColor: 'text-orange-600',
    members: [
      { name: 'Dr. Anant J. Umbarkar', role: 'Founder / Chief Mentor', badge: 'PI' },
      { name: 'Admuthe Sir', role: 'Co-PI', badge: 'Co-PI' },
      { name: 'Pranali Seth Ma\'am', role: 'Co-PI', badge: 'Co-PI' },
      { name: 'Mr. Virendra Patil', role: 'Team Lead (2025 Batch)', badge: 'Lead' },
      { name: 'Ms. Kranti Varekar', role: 'Team Lead (2026 Batch)', badge: 'Lead' },
    ],
    responsibilities: [
      'Defining research themes and problems',
      'Patent strategy, IP creation, and commercialization',
    ],
    patent: {
      inventors: ['Dr. Anant J. Umbarkar', 'Admuthe Sir'],
      applicants: ['Dr. Anant J. Umbarkar', 'Admuthe Sir', 'Pranali Seth Ma\'am', 'Mr. Virendra Patil'],
      subContributors: ['Dr. Anant J. Umbarkar', 'Admuthe Sir', 'Mr. Virendra Patil', 'Ms. Kranti Varekar'],
    },
  },
  {
    id: 'product',
    icon: <Award className="w-6 h-6" />,
    title: 'Product & Program Management',
    subtitle: 'Translating research into deployable products',
    color: 'from-amber-500 to-orange-500',
    lightColor: 'from-amber-50/60 to-orange-50/40',
    borderColor: 'border-amber-200/70',
    textColor: 'text-amber-700',
    members: [
      { name: 'Dr. Anant J. Umbarkar', role: 'Founder / Chief Mentor', badge: 'PI' },
      { name: 'Admuthe Sir', role: 'Co-PI', badge: 'Co-PI' },
      { name: 'Pranali Seth Ma\'am', role: 'Co-PI', badge: 'Co-PI' },
      { name: 'Mr. T. B. Patil', role: 'Contributor', badge: null },
      { name: 'Mr. N. Sheikh', role: 'Contributor', badge: null },
      { name: 'Mr. Kalash Patil', role: 'Team Lead (2025 Batch)', badge: 'Lead' },
      { name: 'Mr. Virendra Patil', role: 'Team Lead (2025 Batch)', badge: 'Lead' },
      { name: 'Ms. Kranti Varekar', role: 'Team Lead (2026 Batch)', badge: 'Lead' },
    ],
    responsibilities: [
      'Requirement analysis from research outcomes',
      'Roadmap and milestone planning',
      'Coordination between research and engineering teams',
    ],
  },
  {
    id: 'design',
    icon: <Layout className="w-6 h-6" />,
    title: 'Design & User Experience Team',
    subtitle: 'Interface design, accessibility, and user validation',
    color: 'from-orange-600 to-red-500',
    lightColor: 'from-orange-50/60 to-rose-50/30',
    borderColor: 'border-orange-200/70',
    textColor: 'text-orange-600',
    members: [
      { name: 'Mr. Virendra Patil', role: 'Improved algorithm logic (Flexible Bloom\'s Level)', badge: 'Dev' },
      { name: 'Ms. Kranti A. Varekar', role: 'Corrected optimal result equation', badge: 'Dev' },
      { name: 'Mr. Utkarsh', role: 'Lead Web Developer', badge: 'Lead' },
      { name: 'Mr. Om R. Kulsange', role: 'Lead Web Developer', badge: 'Lead' },
      { name: 'Ms. Elizabeth S. Pawar', role: 'Lead Web Developer', badge: 'Lead' },
    ],
    responsibilities: [
      'User studies and validation',
      'Interface design and accessibility',
      'Academic, industry, and end-user alignment',
    ],
  },
  {
    id: 'engineering',
    icon: <Code2 className="w-6 h-6" />,
    title: 'Software Development & Systems Engineering',
    subtitle: 'Architecture, core algorithms, and deployment',
    color: 'from-orange-500 to-amber-600',
    lightColor: 'from-orange-50/60 to-amber-50/40',
    borderColor: 'border-orange-200/70',
    textColor: 'text-orange-600',
    members: [
      { name: 'Mr. Virendra Patil', role: 'Backend & ML Algorithms', badge: 'Dev' },
      { name: 'Ms. Kranti A. Varekar', role: 'Algorithm Optimization', badge: 'Dev' },
      { name: 'Mr. Utkarsh', role: 'Full-stack Platform Architecture', badge: 'Lead' },
      { name: 'Mr. Om R. Kulsange', role: 'Frontend & UI Engineering', badge: 'Lead' },
      { name: 'Ms. Elizabeth S. Pawar', role: 'Frontend & API Integration', badge: 'Lead' },
    ],
    responsibilities: [
      'Core cognitive parsing and Bloom taxonomy engine',
      'Cloud deployment, databases, and microservices',
      'Security, validation, and real-time report generation',
    ],
  },
];

function BadgePill({ label, colorClass }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${colorClass}`}>
      {label}
    </span>
  );
}

function SectionCard({ section, isOpen, onToggle }) {
  return (
    <div className="rounded-2xl border border-[#E8E2D7] bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-neutral-50/60 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${section.color} text-white shadow-md shadow-orange-500/20`}>
            {section.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#111827]">{section.title}</h3>
            <p className="text-sm text-[#57534E]">{section.subtitle}</p>
          </div>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Body */}
      {isOpen && (
        <div className={`px-6 pb-6 pt-2 bg-gradient-to-br ${section.lightColor} border-t border-[#F2ECE1]`}>
          {/* Members grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {section.members.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-white rounded-xl p-3.5 border border-[#E8E2D7] shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-2" />
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-[#111827]">{m.name}</span>
                    {m.badge && (
                      <BadgePill
                        label={m.badge}
                        colorClass="text-orange-700 bg-orange-100/80 border border-orange-200"
                      />
                    )}
                  </div>
                  <p className="text-xs text-[#57534E] mt-0.5">{m.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Responsibilities */}
          {section.responsibilities && (
            <div className="mb-4 bg-white/70 rounded-xl p-4 border border-[#E8E2D7]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2.5">
                Core Responsibilities
              </h4>
              <ul className="space-y-1.5">
                {section.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#374151]">
                    <Star className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-orange-500" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Patent block */}
          {section.patent && (
            <div className="mt-2 bg-white rounded-xl p-4 border border-orange-200/80 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-3">
                Patent & Intellectual Property Details
              </h4>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#111827] mb-1">Inventors</p>
                  {section.patent.inventors.map((n, i) => (
                    <p key={i} className="text-[#57534E] text-xs">{n}</p>
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-[#111827] mb-1">Applicants</p>
                  {section.patent.applicants.map((n, i) => (
                    <p key={i} className="text-[#57534E] text-xs">{n}</p>
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-[#111827] mb-1">Sub-Contributors</p>
                  {section.patent.subContributors.map((n, i) => (
                    <p key={i} className="text-[#57534E] text-xs">{n}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Single member contributions */}
          {section.members[0]?.contributions && (
            <ul className="space-y-1.5 mt-2 bg-white/70 rounded-xl p-4 border border-[#E8E2D7]">
              {section.members[0].contributions.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#374151]">
                  <Star className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-orange-500" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreditsPage() {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState({ governing: true, research: true });

  const toggle = (id) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-[#FAF7F2] pt-20 pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden py-14">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-[#E8E2D7] rounded-full px-4 py-1.5 text-xs font-bold text-orange-600 mb-6 shadow-sm">
            <Users className="w-3.5 h-3.5" />
            Institutional Credits
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#111827] mb-4 tracking-tight">
            Credits &{' '}
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Contributions
            </span>
          </h1>
          <p className="text-base text-[#57534E] max-w-2xl mx-auto leading-relaxed">
            QMetric represents a collective multi-year research and engineering endeavor.
            We proudly honor and recognize every contributor, researcher, and engineer behind the project.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            isOpen={!!openSections[section.id]}
            onToggle={() => toggle(section.id)}
          />
        ))}

        {/* Declaration */}
        <div className="mt-8 rounded-2xl border border-[#E8E2D7] bg-white shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white mb-4 shadow-lg shadow-orange-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-[#111827] mb-3">Institutional Academic Declaration</h3>
          <p className="text-[#57534E] max-w-2xl mx-auto text-sm leading-relaxed">
            This Major Academic Project has been carried out under the direct guidance and supervision
            of the faculty mentors and team leads above. All evaluation models strictly comply with
            national accreditation guidelines (NBA/NAAC) and ethical academic benchmarks.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center pt-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#57534E] hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </section>
    </div>
  );
}