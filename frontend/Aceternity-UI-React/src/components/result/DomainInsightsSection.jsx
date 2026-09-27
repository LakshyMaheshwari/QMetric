import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// ─── Colors per domain ──────────────────────────────────────
const DOMAIN_COLORS = {
  cognitive: '#3b82f6',   // blue
  affective: '#f59e0b',   // amber
  psychomotor: '#22c55e', // green
};

// ─── Human-readable level names ─────────────────────────────
const LEVEL_NAMES = {
  cognitive: {
    C1: 'Remember', C2: 'Understand', C3: 'Apply',
    C4: 'Analyze', C5: 'Evaluate', C6: 'Create',
  },
  affective: {
    A1: 'Receiving', A2: 'Responding', A3: 'Valuing',
    A4: 'Organizing', A5: 'Characterizing',
  },
  psychomotor: {
    P1: 'Perception', P2: 'Set', P3: 'Guided Response',
    P4: 'Mechanism', P5: 'Complex Overt', P6: 'Adaptation', P7: 'Origination',
  },
};

export default function DomainInsightsSection({ insights }) {
  if (!insights || !insights.overall) return null;

  const { overall, cognitive, affective, psychomotor, needsReview, totalQuestions } = insights;

  // ─── Build pie chart data ─────────────────────────────────
  const domainData = [
    { name: 'Cognitive',   value: overall.cognitive.percentage,   count: overall.cognitive.count,   color: DOMAIN_COLORS.cognitive },
    { name: 'Affective',   value: overall.affective.percentage,   count: overall.affective.count,   color: DOMAIN_COLORS.affective },
    { name: 'Psychomotor', value: overall.psychomotor.percentage, count: overall.psychomotor.count, color: DOMAIN_COLORS.psychomotor },
  ].filter(d => d.value > 0);

  // ─── Helper to transform level object to chart data ───────
  const buildLevelData = (levelObj, nameMap) =>
    Object.entries(levelObj).map(([key, val]) => ({
      level: key,
      name: nameMap[key] || key,
      percentage: val.percentage,
      count: val.count,
    }));

  const cognitiveData   = buildLevelData(cognitive,   LEVEL_NAMES.cognitive);
  const affectiveData   = buildLevelData(affective,   LEVEL_NAMES.affective);
  const psychomotorData = buildLevelData(psychomotor, LEVEL_NAMES.psychomotor);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 mb-6 overflow-hidden relative">
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-1">
        <div>
          <h2 className="text-base font-bold text-gray-800">🎓 Learning Domain Insights</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cognitive · Affective · Psychomotor &nbsp;|&nbsp; {totalQuestions} questions analyzed
          </p>
        </div>
      </div>

      {/* Row 1: Domain pie + Cognitive bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50/60 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Overall Domain Distribution</h3>
          {domainData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={domainData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {domainData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 }}
                  formatter={(value, name, props) => [`${value}% (${props.payload.count} q)`, name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-16 text-sm">No data available</p>
          )}
        </div>

        <div className="bg-gray-50/60 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Cognitive — Bloom&apos;s
            <span className="ml-2 text-xs text-gray-400 font-normal">
              ({overall.cognitive.count} q · {overall.cognitive.percentage}%)
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cognitiveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="level" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 }}
                formatter={(value, name, props) => [`${value}% (${props.payload.count} q)`, props.payload.name]}
              />
              <Bar dataKey="percentage" fill={DOMAIN_COLORS.cognitive} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Affective (conditional) */}
      {overall.affective.count > 0 && (
        <div className="bg-gray-50/60 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Affective — Krathwohl&apos;s
            <span className="ml-2 text-xs text-gray-400 font-normal">
              ({overall.affective.count} q · {overall.affective.percentage}%)
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={affectiveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="level" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 }}
                formatter={(value, name, props) => [`${value}% (${props.payload.count} q)`, props.payload.name]}
              />
              <Bar dataKey="percentage" fill={DOMAIN_COLORS.affective} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row 3: Psychomotor (conditional) */}
      {overall.psychomotor.count > 0 && (
        <div className="bg-gray-50/60 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Psychomotor — Simpson&apos;s
            <span className="ml-2 text-xs text-gray-400 font-normal">
              ({overall.psychomotor.count} q · {overall.psychomotor.percentage}%)
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={psychomotorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="level" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 }}
                formatter={(value, name, props) => [`${value}% (${props.payload.count} q)`, props.payload.name]}
              />
              <Bar dataKey="percentage" fill={DOMAIN_COLORS.psychomotor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row 4: Needs Review table */}
      {needsReview && needsReview.length > 0 && (
        <div className="bg-yellow-50/60 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-yellow-800">
              ⚠️ Questions Needing Manual Review ({needsReview.length})
            </h3>
            <p className="text-xs text-yellow-700">
              Confidence below 80% — please verify domain and level
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-yellow-200">
                  <th className="text-left py-2 pr-3 font-semibold text-yellow-900">Q#</th>
                  <th className="text-left py-2 pr-3 font-semibold text-yellow-900">Question</th>
                  <th className="text-left py-2 pr-3 font-semibold text-yellow-900">Verb</th>
                  <th className="text-left py-2 pr-3 font-semibold text-yellow-900">Suggested</th>
                  <th className="text-left py-2 pr-3 font-semibold text-yellow-900">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-100">
                {needsReview.map((q, i) => (
                  <tr key={i} className="hover:bg-yellow-100/40">
                    <td className="py-2 pr-3 text-yellow-900">{q.questionNumber}</td>
                    <td className="py-2 pr-3 text-gray-700 max-w-md truncate" title={q.questionText}>
                      {q.questionText}
                    </td>
                    <td className="py-2 pr-3 italic text-gray-500">
                      {q.verb || '—'}
                    </td>
                    <td className="py-2 pr-3 text-gray-700">
                      {q.suggestedDomain
                        ? `${q.suggestedDomain} · ${q.suggestedLevelName || q.suggestedLevel}`
                        : '—'}
                    </td>
                    <td className="py-2 pr-3 font-semibold text-yellow-700">
                      {q.score ? `${Math.round(q.score * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state (no questions at all) */}
      {totalQuestions === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">No questions were analyzed for domain insights.</p>
        </div>
      )}
    </section>
  );
}