import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Download, BookOpen, ArrowLeft, CheckCircle2 } from 'lucide-react';
import BloomsAnalysisChart from './report/BloomAnalysisChart';
import ModuleAnalysisChart from './report/ModuleAnalysisChart';
import QuestionDistributionChart from './report/QuestionDistributionChart';
import COCoverageChart from './report/COCoverageChart';
import apiClient from '../../api/client';
import DomainInsightsSection from '../result/DomainInsightsSection';

// Small SVG gauge component for final score
function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = (angleDeg - 90) * Math.PI / 180.0;
  return {
    x: cx + (r * Math.cos(angleRad)),
    y: cy + (r * Math.sin(angleRad))
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = (endAngle - startAngle) <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function normalizeSequenceConfig(rawSequence) {
  if (!rawSequence) return { COs: {}, ModuleHours: {} };

  // Current backend saves Sequence as [{ COs, ModuleHours }] because
  // PaperInfo.Sequence is declared as an array-of-Mixed.
  if (
    Array.isArray(rawSequence) &&
    rawSequence.length === 1 &&
    rawSequence[0] &&
    (rawSequence[0].COs || rawSequence[0].ModuleHours)
  ) {
    return {
      COs: rawSequence[0].COs || {},
      ModuleHours: rawSequence[0].ModuleHours || {},
    };
  }

  // Also support older papers that stored the original flat Sequence array:
  // [{ name: 'CO1', type: 'CO', ... }, { name: 'Module1', type: 'Module', ... }]
  if (Array.isArray(rawSequence)) {
    const config = { COs: {}, ModuleHours: {} };

    rawSequence.forEach((item) => {
      if (!item || typeof item !== 'object') return;

      const match = String(item.name || '').match(/\d+/);
      if (!match) return;

      const number = match[0];

      if (item.type === 'CO') {
        const blooms = Array.isArray(item.blooms)
          ? item.blooms.filter((b) => typeof b === 'string')
          : typeof item.blooms === 'string'
            ? [item.blooms]
            : [];

        config.COs[`CO${number}`] = {
          weight: Number(item.weight) || 0,
          blooms,
        };
      } else if (item.type === 'Module') {
        config.ModuleHours[`M${number}`] = Number(item.hours) || 0;
      }
    });

    return config;
  }

  // Support a plain object as well.
  return {
    COs: rawSequence.COs || {},
    ModuleHours: rawSequence.ModuleHours || {},
  };
}

const Gauge = ({ value = 0, size = 220 }) => {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  const width = size + 60;
  const height = Math.round(size / 2) + 80;
  const cx = (size + 60) / 2;
  const cy = size / 2 + 35;
  const r = Math.max(10, (size / 2) - 24);

  const startAngle = -90;
  const maxAngle = 90;
  const currentAngle = startAngle + (v / 100) * (maxAngle - startAngle);

  const getColorForPercentage = (percentage) => {
    if (percentage >= 80) return '#16a34a';
    if (percentage >= 60) return '#2563eb';
    if (percentage >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const backgroundArcs = [
    { start: 0, end: 40, color1: '#ef4444', color2: '#f59e0b' },
    { start: 40, end: 60, color1: '#f59e0b', color2: '#2563eb' },
    { start: 60, end: 100, color1: '#2563eb', color2: '#16a34a' }
  ];

  const bgPath = describeArc(cx, cy, r, startAngle, maxAngle);
  const fgPath = describeArc(cx, cy, r, startAngle, currentAngle);

  const needlePt = polarToCartesian(cx, cy, r - 6, currentAngle);

  const color = v >= 80 ? '#16a34a' : v >= 60 ? '#2563eb' : v >= 40 ? '#f59e0b' : '#ef4444';

  const scaleLabels = [];
  for (let i = 0; i <= 10; i++) {
    const percentage = i * 10;
    const angle = startAngle + (percentage / 100) * (maxAngle - startAngle);
    const labelRadius = r + 42;
    const labelPos = polarToCartesian(cx, cy, labelRadius, angle);
    scaleLabels.push({
      percentage,
      x: labelPos.x,
      y: labelPos.y,
      angle,
      color: getColorForPercentage(percentage)
    });
  }

  return (
    <div className="inline-block" aria-hidden="false">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>

        <path d={bgPath} fill="none" stroke="url(#gaugeGradient)" strokeWidth="18" strokeLinecap="round" />
        <path d={fgPath} fill="none" stroke={color} strokeWidth="18" strokeLinecap="round" opacity="0.7" />

        {scaleLabels.map((label) => (
          <text
            key={label.percentage}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fontWeight="600"
            fill={label.color}
            className="pointer-events-none"
          >
            {label.percentage}
          </text>
        ))}

        <line x1={cx} y1={cy} x2={needlePt.x} y2={needlePt.y} stroke="#222" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="#222" />
      </svg>

      <div className="mt-2 text-center">
        <div className="text-4xl font-bold text-blue-600">{v.toFixed(1)}%</div>
        <div className="text-sm text-gray-700">Overall Assessment Score</div>
      </div>
    </div>
  );
};

const ResultPage = () => {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const chartsRef = useRef(null);

  const { user } = useAuth();

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!paperId) return;
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get(`/teacher/papers/${paperId}`);

        if (!response.data.error && response.data.paper) {
          setData(response.data.paper);
        } else {
          throw new Error(response.data.message || 'Invalid response format');
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to load results';
        setError(msg);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [paperId]);

  const normalizeCoRecommendations = (arr = []) => {
    return (arr || []).map(r => ({
      co: r.co ?? r.CO ?? r.Co ?? r.CoId ?? r.coId ?? r.co_name ?? r.coName ?? '',
      expected: Number(r.expected ?? r.Expected ?? r.target ?? r.targetCoverage ?? 0),
      actual: Number(r.actual ?? r.Actual ?? r.coverage ?? r.value ?? 0),
      suggestion: r.suggestion ?? r.Suggestion ?? r.suggest ?? r.s ?? ''
    }));
  };

  const normalizeModuleRecommendations = (arr = []) => {
    return (arr || []).map(r => ({
      module: r.module ?? r.Module ?? r.moduleName ?? r.ModuleName ?? r.name ?? String(r.module || ''),
      expected: Number(r.expected ?? r.Expected ?? r.target ?? 0),
      actual: Number(r.actual ?? r.Actual ?? r.coverage ?? 0),
      suggestion: r.suggestion ?? r.Suggestion ?? r.suggest ?? ''
    }));
  };

  const openAppendix = async () => {
    const link = document.createElement('a');
    link.href = '/Appendix_QMetric.pdf';
    link.download = `Assessment_Appendix_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCertificate = async () => {
    try {
      setIsDownloading(true);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Unable to open print window');
      }

      const collectedData = data['Collected Data']?.[0];
      const finalScore = collectedData?.FinalScore || 0;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const certificateHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Question Paper Quality Certificate</title>
          <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }

            body {
              font-family: 'Libre Baskerville', Georgia, serif;
              background: #d0cec9;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              min-height: 100vh;
              padding: 30px 20px;
            }

            .certificate {
              width: 750px;
              min-height: 1060px;
              background: #f5f2ec;
              position: relative;
              box-shadow: 0 15px 50px rgba(0,0,0,0.35);
              overflow: hidden;
            }

            .cert-watermark {
              position: absolute;
              inset: 0;
              background-image:
                repeating-linear-gradient(45deg,  rgba(180,160,100,0.07) 0, rgba(180,160,100,0.07) 1px, transparent 1px, transparent 18px),
                repeating-linear-gradient(-45deg, rgba(180,160,100,0.07) 0, rgba(180,160,100,0.07) 1px, transparent 1px, transparent 18px);
              z-index: 0;
              pointer-events: none;
            }

            .wave-tr {
              position: absolute;
              top: 0; right: 0;
              width: 340px; height: 290px;
              z-index: 2;
              display: block;
            }
            .wave-bl {
              position: absolute;
              bottom: 0; left: 0;
              width: 340px; height: 290px;
              z-index: 2;
              display: block;
            }

            .cert-body {
              position: relative;
              z-index: 3;
              padding: 52px 70px 50px 70px;
            }

            .header-row {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              margin-bottom: 0;
            }
            .title-block { flex: 1; padding-right: 16px; }

            .cert-title {
              font-family: 'Dancing Script', cursive;
              font-size: 54px;
              font-weight: 600;
              color: #1a1a2e;
              line-height: 1.15;
              margin: 0;
            }

            .by-qmetric {
              font-family: 'Montserrat', sans-serif;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 3.5px;
              color: #1a1a2e;
              margin-top: 10px;
              text-align: left;
            }

            .badge-wrap { flex-shrink: 0; margin-top: 8px; }

            .intro-para {
              font-family: 'Libre Baskerville', serif;
              font-size: 12.5px;
              line-height: 1.9;
              color: #1a1a1a;
              text-align: center;
              margin-top: 32px;
              margin-bottom: 22px;
            }

            .detail-para {
              font-family: 'Libre Baskerville', serif;
              font-size: 12px;
              line-height: 2;
              color: #1a1a1a;
              text-align: center;
              margin-bottom: 24px;
            }

            .blank {
              display: inline-block;
              min-width: 80px;
              border-bottom: 1.5px solid #222;
              vertical-align: bottom;
              padding-bottom: 1px;
              font-style: italic;
              font-weight: 600;
              color: #1a1a2e;
            }

            .assessment-block {
              font-family: 'Libre Baskerville', serif;
              font-size: 12px;
              color: #1a1a1a;
              margin-bottom: 32px;
            }
            .assessment-block p { margin-bottom: 5px; }
            .assessment-block ul { list-style: none; padding-left: 10px; }
            .assessment-block ul li { font-weight: 700; letter-spacing: 0.4px; line-height: 1.95; }
            .assessment-block ul li::before { content: '• '; }

            .score-center-row {
              display: flex;
              justify-content: center;
              margin-bottom: 38px;
            }

            .score-box {
              border: 2px solid #c9a84c;
              background: rgba(255,255,255,0.35);
              padding: 18px 48px 16px 48px;
              text-align: center;
            }

            .score-box-title {
              font-family: 'Dancing Script', cursive;
              font-size: 27px;
              color: #1a1a2e;
              margin-bottom: 4px;
            }

            .score-value-row {
              font-family: 'Dancing Script', cursive;
              font-size: 27px;
              color: #1a1a2e;
            }

            .score-underline {
              display: inline-block;
              min-width: 70px;
              border-bottom: 2px solid #1a1a2e;
              text-align: center;
              vertical-align: bottom;
            }

            .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 12px;
            }

            .date-block { text-align: center; }
            .date-line {
              width: 200px;
              border-bottom: 1.5px solid #222;
              margin-bottom: 6px;
              padding-bottom: 4px;
              font-family: 'Libre Baskerville', serif;
              font-size: 12px;
              font-weight: 600;
              color: #1a1a2e;
              text-align: center;
              min-height: 22px;
            }
            .date-label {
              font-family: 'Montserrat', sans-serif;
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 1px;
              color: #333;
              text-align: center;
            }

            .qmetric-logo { text-align: right; }

            @media print {
              body { background: white; padding: 0; }
              .certificate { box-shadow: none; }
              @page { margin: 0; size: A4 portrait; }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="cert-watermark"></div>

            <svg class="wave-tr" viewBox="0 0 340 290" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M340,0 L340,290 Q200,250 170,155 Q120,40 340,0 Z" fill="#0d1b4b"/>
              <path d="M340,0 Q305,75 258,128 Q210,178 170,155 Q200,250 340,290" fill="none" stroke="#c9a84c" stroke-width="2.5"/>
              <path d="M340,0 Q295,65 248,118 Q202,168 180,150 Q208,245 340,290 L340,0 Z" fill="#1a2f6b" opacity="0.45"/>
            </svg>

            <svg class="wave-bl" viewBox="0 0 340 290" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M0,290 L0,0 Q140,40 170,135 Q220,250 0,290 Z" fill="#0d1b4b"/>
              <path d="M0,290 Q35,215 82,162 Q130,112 170,135 Q140,40 0,0" fill="none" stroke="#c9a84c" stroke-width="2.5"/>
              <path d="M0,290 Q45,225 92,172 Q138,122 160,140 Q132,45 0,0 L0,290 Z" fill="#1a2f6b" opacity="0.45"/>
            </svg>

            <div class="cert-body">

              <div class="header-row">
                <div class="title-block">
                  <h1 class="cert-title">Question paper<br>quality certificate</h1>
                  <p class="by-qmetric">BY QMETRIC</p>
                </div>

                <div class="badge-wrap">
                  <svg width="92" height="104" viewBox="0 0 92 104" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient id="outerRing" cx="35%" cy="30%" r="65%">
                        <stop offset="0%" stop-color="#ffe066"/>
                        <stop offset="45%" stop-color="#d4a017"/>
                        <stop offset="100%" stop-color="#7a5500"/>
                      </radialGradient>
                      <radialGradient id="medalFace" cx="35%" cy="30%" r="65%">
                        <stop offset="0%" stop-color="#ffd24d"/>
                        <stop offset="55%" stop-color="#c99010"/>
                        <stop offset="100%" stop-color="#8a5c00"/>
                      </radialGradient>
                    </defs>
                    <polygon points="20,54 36,54 31,104 14,94" fill="#c9a84c"/>
                    <polygon points="72,54 56,54 61,104 78,94" fill="#b8932a"/>
                    <circle cx="46" cy="44" r="39" fill="url(#outerRing)"/>
                    <circle cx="46" cy="44" r="34" fill="none" stroke="#a07820" stroke-width="2" opacity="0.6"/>
                    <circle cx="46" cy="44" r="31" fill="url(#medalFace)"/>
                    <line x1="46" y1="16" x2="46" y2="72" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/>
                    <line x1="18" y1="44" x2="74" y2="44" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/>
                    <line x1="26" y1="24" x2="66" y2="64" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/>
                    <line x1="66" y1="24" x2="26" y2="64" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/>
                    <ellipse cx="38" cy="36" rx="9" ry="7" fill="rgba(255,255,255,0.22)" transform="rotate(-30 38 36)"/>
                  </svg>
                </div>
              </div>

              <p class="intro-para">
                This is to certify that the Question Paper Quality Assessment for the<br>
                course identified below has been conducted and validated in<br>
                accordance with outcome-based education (OBE) and recognized<br>
                academic assessment frameworks.
              </p>

              <p class="detail-para">
                The Question Paper Quality Assessment was conducted for the course<br>
                titled <span class="blank">${data['Course Name'] || ''}</span>, offered under the
                <span class="blank">${data['Branch'] || ''}</span> program/branch, for the<br>
                <span class="blank">${data['Semester'] || ''}</span> semester of the academic year
                <span class="blank">${data['Year Of Study'] || ''}</span>. The assessment<br>
                pertained to the question paper prepared by
                <span class="blank">${data['Course Teacher'] || ''}</span>, Faculty, Department of<br>
                <span class="blank">${data['College Name'] || ''}</span>
              </p>

              <div class="assessment-block">
                <p>The assessment included systematic evaluation of:</p>
                <ul>
                  <li>Course Outcome alignment</li>
                  <li>Cognitive level distribution</li>
                  <li>Syllabus coverage</li>
                  <li>Analytical depth and fairness</li>
                </ul>
              </div>

              <div class="score-center-row">
                <div class="score-box">
                  <div class="score-box-title">Final Quality Score:</div>
                  <div class="score-value-row">
                    <span class="score-underline">${finalScore.toFixed(1)}</span>%
                  </div>
                </div>
              </div>

              <div class="footer-row">
                <div class="date-block">
                  <div class="date-line">${dateStr}</div>
                  <div class="date-label">Date</div>
                </div>

                <div class="qmetric-logo">
                  <svg width="138" height="56" viewBox="0 0 138 56" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="qGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#9b59b6"/>
                        <stop offset="50%" stop-color="#3498db"/>
                        <stop offset="100%" stop-color="#1abc9c"/>
                      </linearGradient>
                    </defs>
                    <text x="0" y="46" font-family="Georgia, 'Times New Roman', serif"
                          font-size="50" font-style="italic" font-weight="700"
                          fill="url(#qGrad)">Q</text>
                    <circle cx="33" cy="5" r="3.5" fill="url(#qGrad)"/>
                    <line x1="33" y1="9"  x2="33" y2="21" stroke="url(#qGrad)" stroke-width="2" stroke-linecap="round"/>
                    <line x1="26" y1="13" x2="40" y2="10" stroke="url(#qGrad)" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="33" y1="21" x2="27" y2="30" stroke="url(#qGrad)" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="33" y1="21" x2="39" y2="30" stroke="url(#qGrad)" stroke-width="1.8" stroke-linecap="round"/>
                    <text x="46" y="42" font-family="'Gill Sans', Calibri, sans-serif"
                          font-size="23" font-weight="400" fill="#1a1a2e">Metric</text>
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(certificateHTML);
      printWindow.document.close();

      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 800);
    } catch (err) {
      console.error('Certificate generation failed:', err);
      showToast('Failed to generate certificate. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      setIsDownloading(true);

      const printWindow = window.open('', '_blank');

      if (!printWindow) {
        throw new Error('Unable to open print window');
      }

      const collectedData = data['Collected Data']?.[0];
      const questionData = collectedData?.QuestionData || [];
      const bloomsData = collectedData?.BloomsData || {};
      const moduleData = collectedData?.ModuleData || [];
      const coData = collectedData?.COData || {};
      const finalScore = collectedData?.FinalScore || 0;
      const bloomLevelMap = data?.bloomLevelMap || {};
      const sequence = normalizeSequenceConfig(data?.Sequence);
      const coRecommendationsRaw = collectedData?.CORecommendations || [];
      const moduleRecommendationsRaw = collectedData?.ModuleRecommendations || [];

      // ✨ NEW: Extract DomainInsights
      const domainInsights = collectedData?.DomainInsights || null;

      const coRecommendations = normalizeCoRecommendations(coRecommendationsRaw);
      const moduleRecommendations = normalizeModuleRecommendations(moduleRecommendationsRaw);
      const questionRecommendations = collectedData?.QuestionRecommendations || [];

      const totalQuestions = questionRecommendations.length;
      const matchingQuestions = questionRecommendations.filter(q => q.remark === 'Matches Expected Blooms Level').length;
      const higherQuestions = questionRecommendations.filter(q => q.remark === 'Higher than Expected Blooms Level').length;
      const lowerQuestions = questionRecommendations.filter(q => q.remark === 'Lower than Expected Blooms Level').length;
      const matchPercentage = totalQuestions > 0 ? (matchingQuestions / totalQuestions * 100).toFixed(1) : 0;

      const coRows = Object.keys(sequence?.COs || {}).map(co => {
        const coDataItem = sequence.COs[co];
        return `
          <tr>
            <td class="text-center">${co}</td>
            <td class="text-center">${coDataItem.weight || 0}%</td>
            <td class="text-center">${coDataItem.blooms?.[0] || 'N/A'}</td>
          </tr>
        `;
      }).join('');

      const moduleRows = Object.keys(sequence?.ModuleHours || {}).map(module => {
        const hours = sequence.ModuleHours[module];
        return `
          <tr>
            <td class="text-center">${module}</td>
            <td class="text-center">${hours || 0}</td>
          </tr>
        `;
      }).join('');

      const bloomLevelMapRows = Object.keys(bloomLevelMap).map(level => `
        <tr>
          <td>${level}</td>
          <td class="text-center">${bloomLevelMap[level]}</td>
        </tr>
      `).join('');

      const bloomDataRows = Object.keys(bloomsData).map(level => {
        const bloomData = bloomsData[level];
        const variance = (bloomData.marks || 0) - (bloomData.weights || 0);
        return `
          <tr>
            <td>${bloomData.name || `Level ${level}`}</td>
            <td class="text-center">${bloomData.level}</td>
            <td class="text-center">${(bloomData.weights || 0).toFixed(1)}%</td>
            <td class="text-center">${(bloomData.marks || 0).toFixed(1)}%</td>
            <td class="text-center ${variance < 0 ? 'negative' : 'positive'}">
              ${variance > 0 ? '+' : ''}${variance.toFixed(1)}%
            </td>
            <td class="text-center">${bloomData.No_Of_Questions || 0}</td>
          </tr>
        `;
      }).join('');

      const moduleAnalysisRows = moduleData.map((module, index) => {
        const variance = (module.actual || 0) - (module.expected || 0);
        return `
          <tr>
            <td class="text-center">Module ${index + 1}</td>
            <td class="text-center">${(module.expected || 0).toFixed(1)}%</td>
            <td class="text-center">${(module.actual || 0).toFixed(1)}%</td>
            <td class="text-center ${variance < 0 ? 'negative' : 'positive'}">
              ${variance > 0 ? '+' : ''}${variance.toFixed(1)}%
            </td>
          </tr>
        `;
      }).join('');

      const coAnalysisRows = Object.keys(coData).map(co => `
        <tr>
          <td class="text-center">CO${co}</td>
          <td class="text-center">${(coData[co] || 0).toFixed(1)}%</td>
          <td class="text-center positive">Complete</td>
        </tr>
      `).join('');

      const questionRows = questionRecommendations.map((rec, index) => `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${rec.QuestionData || 'N/A'}</td>
          <td class="text-center">${rec.marks || 0}</td>
          <td class="text-center">${rec.co || 'N/A'}</td>
          <td class="text-center">${rec.extractedVerb || 'N/A'}</td>
          <td class="text-center">${rec.highestVerb || 'N/A'}</td>
          <td class="text-center ${rec.qScore === 1 ? 'status-match' : rec.qScore === 2 ? 'status-higher' : 'status-lower'}">
            ${rec.qScore}
          </td>
          <td class="text-center ${rec.remark === 'Matches Expected Blooms Level' ? 'status-match' : rec.remark === 'Higher than Expected Blooms Level' ? 'status-higher' : 'status-lower'}">
            ${rec.remark || 'No remarks'}
          </td>
        </tr>
      `).join('');

      const coRecommendationRows = coRecommendations.map(rec => {
        const variance = (rec.actual || 0) - (rec.expected || 0);
        return `
          <tr>
            <td class="text-center">${rec.co}</td>
            <td class="text-center">${(rec.expected || 0).toFixed(1)}%</td>
            <td class="text-center">${(rec.actual || 0).toFixed(1)}%</td>
            <td class="text-center ${variance < 0 ? 'negative' : 'positive'}">
              ${variance > 0 ? '+' : ''}${variance.toFixed(1)}%
            </td>
            <td>${rec.suggestion}</td>
          </tr>
        `;
      }).join('');

      const moduleRecommendationRows = moduleRecommendations.map(rec => {
        const variance = (rec.actual || 0) - (rec.expected || 0);
        return `
          <tr>
            <td class="text-center">${rec.module}</td>
            <td class="text-center">${(rec.expected || 0).toFixed(1)}%</td>
            <td class="text-center">${(rec.actual || 0).toFixed(1)}%</td>
            <td class="text-center ${variance < 0 ? 'negative' : 'positive'}">
              ${variance > 0 ? '+' : ''}${variance.toFixed(1)}%
            </td>
            <td>${rec.suggestion}</td>
          </tr>
        `;
      }).join('');

      // ═══════════════════════════════════════════════════════════
      // ✨ NEW: Build Domain Insights HTML for PDF
      // ═══════════════════════════════════════════════════════════
      let domainInsightsHtml = '';

      if (domainInsights && domainInsights.overall) {
        const LEVEL_NAMES_PDF = {
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

        const buildLevelRowsPDF = (levelObj, names) =>
          Object.entries(levelObj).map(([key, val]) => `
            <tr>
              <td class="text-center">${key}</td>
              <td>${names[key] || key}</td>
              <td class="text-center">${val.count}</td>
              <td class="text-center">${val.percentage}%</td>
            </tr>
          `).join('');

        const needsReviewRowsPDF = (domainInsights.needsReview || []).map(q => `
          <tr>
            <td class="text-center">${q.questionNumber}</td>
            <td>${q.questionText || ''}</td>
            <td class="text-center">${q.verb || '—'}</td>
            <td class="text-center">${q.suggestedDomain || '—'} · ${q.suggestedLevelName || q.suggestedLevel || '—'}</td>
            <td class="text-center">${q.score ? Math.round(q.score * 100) + '%' : '—'}</td>
          </tr>
        `).join('');

        domainInsightsHtml = `
          <div class="section">
            <div class="section-title">Learning Domain Insights</div>
            <p style="font-size: 10pt; color: #666; margin-bottom: 15px;">
              Cognitive · Affective · Psychomotor — ${domainInsights.totalQuestions} questions analyzed
            </p>

            <!-- Overall Distribution -->
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th class="text-center">Questions</th>
                  <th class="text-center">Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cognitive (Bloom's)</td>
                  <td class="text-center">${domainInsights.overall.cognitive.count}</td>
                  <td class="text-center">${domainInsights.overall.cognitive.percentage}%</td>
                </tr>
                <tr>
                  <td>Affective (Krathwohl's)</td>
                  <td class="text-center">${domainInsights.overall.affective.count}</td>
                  <td class="text-center">${domainInsights.overall.affective.percentage}%</td>
                </tr>
                <tr>
                  <td>Psychomotor (Simpson's)</td>
                  <td class="text-center">${domainInsights.overall.psychomotor.count}</td>
                  <td class="text-center">${domainInsights.overall.psychomotor.percentage}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cognitive Breakdown -->
          <div class="section">
            <div class="section-title">Cognitive Domain — Bloom's Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th class="text-center">Level</th>
                  <th>Name</th>
                  <th class="text-center">Questions</th>
                  <th class="text-center">Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${buildLevelRowsPDF(domainInsights.cognitive, LEVEL_NAMES_PDF.cognitive)}
              </tbody>
            </table>
          </div>

          ${domainInsights.overall.affective.count > 0 ? `
          <div class="section">
            <div class="section-title">Affective Domain — Krathwohl's Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th class="text-center">Level</th>
                  <th>Name</th>
                  <th class="text-center">Questions</th>
                  <th class="text-center">Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${buildLevelRowsPDF(domainInsights.affective, LEVEL_NAMES_PDF.affective)}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${domainInsights.overall.psychomotor.count > 0 ? `
          <div class="section">
            <div class="section-title">Psychomotor Domain — Simpson's Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th class="text-center">Level</th>
                  <th>Name</th>
                  <th class="text-center">Questions</th>
                  <th class="text-center">Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${buildLevelRowsPDF(domainInsights.psychomotor, LEVEL_NAMES_PDF.psychomotor)}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${(domainInsights.needsReview && domainInsights.needsReview.length > 0) ? `
          <div class="section">
            <div class="section-title" style="color: #b45309;">⚠️ Questions Needing Manual Review (${domainInsights.needsReview.length})</div>
            <p style="font-size: 10pt; color: #666; margin-bottom: 15px;">
              The following questions were classified with confidence below 80%. Manual verification is recommended.
            </p>
            <table>
              <thead>
                <tr>
                  <th class="text-center">Q#</th>
                  <th>Question</th>
                  <th class="text-center">Verb</th>
                  <th class="text-center">Suggested</th>
                  <th class="text-center">Confidence</th>
                </tr>
              </thead>
              <tbody>
                ${needsReviewRowsPDF}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="divider"></div>
        `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Assessment Analysis Report</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1a1a1a;
                    background: #ffffff;
                    padding: 40px 60px;
                    font-size: 11pt;
                    position: relative;
                }
                
                body::before {
                    content: 'QMetric';
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 120pt;
                    font-weight: 700;
                    color: rgba(0, 0, 0, 0.03);
                    z-index: -1;
                    white-space: nowrap;
                    pointer-events: none;
                }
                
                .report-container {
                    max-width: 1100px;
                    margin: 0 auto;
                }
                
                .header {
                    border-bottom: 2px solid #1a1a1a;
                    padding-bottom: 30px;
                    margin-bottom: 50px;
                }
                
                .header h1 {
                    font-size: 28pt;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin-bottom: 8px;
                    letter-spacing: -0.5px;
                }
                
                .header-subtitle {
                    font-size: 11pt;
                    color: #666;
                    margin-bottom: 20px;
                }
                
                .header-meta {
                    display: flex;
                    justify-content: space-between;
                    font-size: 9pt;
                    color: #666;
                    margin-top: 20px;
                }
                
                .section {
                    margin-bottom: 50px;
                }
                
                .section-title {
                    font-size: 14pt;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin-bottom: 20px;
                    letter-spacing: -0.3px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px 40px;
                    margin-bottom: 30px;
                }
                
                .info-item {
                    border-bottom: 1px solid #e5e5e5;
                    padding-bottom: 8px;
                }
                
                .info-label {
                    font-size: 9pt;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                
                .info-value {
                    font-size: 11pt;
                    color: #1a1a1a;
                    font-weight: 500;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 10pt;
                }
                
                table thead {
                    border-bottom: 2px solid #1a1a1a;
                }
                
                table th {
                    padding: 12px 8px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 9pt;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #1a1a1a;
                }
                
                table td {
                    padding: 10px 8px;
                    border-bottom: 1px solid #f0f0f0;
                    color: #1a1a1a;
                }
                
                table tbody tr:hover {
                    background-color: #fafafa;
                }
                
                .text-center {
                    text-align: center;
                }
                
                .status-match { color: #22c55e; font-weight: 500; }
                .status-higher { color: #3b82f6; font-weight: 500; }
                .status-lower { color: #ef4444; font-weight: 500; }
                .positive { color: #22c55e; }
                .negative { color: #ef4444; }
                .warning { color: #f59e0b; }
                
                .score-section {
                    text-align: center;
                    padding: 50px 0;
                    border-top: 2px solid #1a1a1a;
                    border-bottom: 2px solid #1a1a1a;
                    margin: 50px 0;
                }
                
                .score-label {
                    font-size: 10pt;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #666;
                    margin-bottom: 15px;
                }
                
                .score-value {
                    font-size: 60pt;
                    font-weight: 300;
                    color: #1a1a1a;
                    line-height: 1;
                    letter-spacing: -2px;
                }
                
                .score-description {
                    font-size: 10pt;
                    color: #666;
                    margin-top: 15px;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 30px;
                    margin: 40px 0;
                }
                
                .stat-card {
                    text-align: center;
                    padding: 20px;
                    border: 1px solid #e5e5e5;
                }
                
                .stat-value {
                    font-size: 32pt;
                    font-weight: 300;
                    color: #1a1a1a;
                    line-height: 1;
                    margin-bottom: 8px;
                }
                
                .stat-label {
                    font-size: 9pt;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .analysis-box {
                    background: #fafafa;
                    padding: 25px;
                    margin: 30px 0;
                    border-left: 3px solid #1a1a1a;
                }
                
                .analysis-box h4 {
                    font-size: 11pt;
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: #1a1a1a;
                }
                
                .analysis-box p {
                    margin: 8px 0;
                    font-size: 10pt;
                    color: #1a1a1a;
                    line-height: 1.7;
                }
                
                .footer {
                    margin-top: 60px;
                    padding-top: 30px;
                    border-top: 1px solid #e5e5e5;
                    text-align: center;
                    color: #666;
                    font-size: 9pt;
                }
                
                .divider {
                    height: 1px;
                    background: #e5e5e5;
                    margin: 40px 0;
                }
                
                @media print {
                    body { padding: 20px; }
                    .header { padding-bottom: 20px; margin-bottom: 30px; }
                    .section { margin-bottom: 30px; page-break-inside: auto; }
                    .section-title { page-break-after: avoid; }
                    table { page-break-inside: auto; }
                    table tr { page-break-inside: avoid; }
                    .score-section { padding: 30px 0; margin: 30px 0; page-break-inside: avoid; }
                    .stats-grid { margin: 20px 0; page-break-inside: avoid; }
                    .info-grid { page-break-inside: avoid; }
                    .analysis-box { page-break-inside: avoid; margin: 20px 0; }
                    .divider { margin: 20px 0; page-break-after: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>Question Paper Assessment Analysis Report</h1>
                    <div class="header-subtitle">Course Outcome & Cognitive Level Evaluation</div>
                    <div class="header-meta">
                        <span>Generated ${new Date().toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                        <span>Report ID: ${data._id?.slice(-8) || 'N/A'}</span>
                    </div>
                </div>

                <!-- Course Information -->
                <div class="section">
                    <div class="section-title">Course Information</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Institution</div>
                            <div class="info-value">${data['College Name'] || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Department</div>
                            <div class="info-value">${data['Branch'] || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Course</div>
                            <div class="info-value">${data['Course Name'] || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Code</div>
                            <div class="info-value">${data['Course Code'] || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Instructor</div>
                            <div class="info-value">${data['Course Teacher'] || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Academic Period</div>
                            <div class="info-value">Year ${data['Year Of Study'] || 'N/A'}, Sem ${data['Semester'] || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                <!-- Final Score -->
                <div class="score-section">
                    <div class="score-label">Overall Assessment Score</div>
                    <div class="score-value">${finalScore.toFixed(1)}%</div>
                    <div class="score-description">Based on alignment, distribution, and taxonomy analysis</div>

                    <div style="margin-top: 30px; display: inline-block; padding: 20px 40px; border-radius: 8px; ${finalScore >= 80
                      ? 'background: #f0fdf4; border: 2px solid #86efac;'
                      : finalScore >= 60
                        ? 'background: #eff6ff; border: 2px solid #93c5fd;'
                        : finalScore >= 40
                          ? 'background: #fefce8; border: 2px solid #fde047;'
                          : 'background: #fef2f2; border: 2px solid #fca5a5;'
                    }">
                        <div style="font-size: 24pt; font-weight: 700; margin-bottom: 8px; ${finalScore >= 80
                          ? 'color: #16a34a;'
                          : finalScore >= 60
                            ? 'color: #2563eb;'
                            : finalScore >= 40
                              ? 'color: #ca8a04;'
                              : 'color: #dc2626;'
                        }">
                            ${finalScore >= 80 ? 'Excellent' : finalScore >= 60 ? 'Good' : finalScore >= 40 ? 'Moderate' : 'Poor'}
                        </div>
                        <div style="font-size: 10pt; color: #4b5563; max-width: 600px;">
                            ${finalScore >= 80
                              ? 'Strong alignment and balanced distribution. Minor refinements may enhance quality further.'
                              : finalScore >= 60
                                ? 'Reasonable alignment with some areas needing attention. Review under-represented modules/COs.'
                                : finalScore >= 40
                                  ? 'Significant improvements needed. Revise question cognitive levels and balance distribution.'
                                  : 'Comprehensive restructuring required. Major misalignment in cognitive levels and/or distribution.'
                            }
                        </div>
                    </div>
                </div>

                <!-- Key Metrics -->
                <div class="section">
                    <div class="section-title">Key Metrics</div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${totalQuestions}</div>
                            <div class="stat-label">Total Questions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${matchingQuestions}</div>
                            <div class="stat-label">Aligned Questions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${higherQuestions}</div>
                            <div class="stat-label">Higher Level</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${lowerQuestions}</div>
                            <div class="stat-label">Lower Level</div>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <!-- Course Outcomes -->
                <div class="section">
                    <div class="section-title">Course Outcomes Configuration</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="text-center">Outcome</th>
                                <th class="text-center">Weight</th>
                                <th class="text-center">Target Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${coRows}
                        </tbody>
                    </table>
                </div>

                <!-- Modules -->
                <div class="section">
                    <div class="section-title">Module Distribution</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="text-center">Module</th>
                                <th class="text-center">Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${moduleRows}
                        </tbody>
                    </table>
                </div>

                <div class="divider"></div>
            
                <!-- Bloom's Mapping -->
                <div class="section">
                    <div class="section-title">Bloom's Taxonomy Mapping</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Cognitive Level</th>
                                <th class="text-center">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bloomLevelMapRows}
                        </tbody>
                    </table>
                </div>
    
                <!-- Question Analysis -->
                <div class="section">
                    <div class="section-title">Detailed Question-wise Analysis</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="text-center">#</th>
                                <th>Question</th>
                                <th class="text-center">Marks</th>
                                <th class="text-center">CO</th>
                                <th class="text-center">Type</th>
                                <th class="text-center">Module</th>
                                <th class="text-center">Bloom's Verbs</th>
                                <th class="text-center">Level</th>
                                <th class="text-center">Bloom's Highest Verb</th>
                                <th class="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${questionData.map((question, index) => `
                              <tr>
                                <td class="text-center">${index + 1}</td>
                                <td>${question.Question || 'N/A'}</td>
                                <td class="text-center">${question.Marks || 0}</td>
                                <td class="text-center">${question.CO || 'N/A'}</td>
                                <td class="text-center">${question['QT'] || 'N/A'}</td>
                                <td class="text-center">${question.Module || 'N/A'}</td>
                                <td class="text-center">${question['Bloom\'s Verbs'] || 'N/A'}</td>
                                <td class="text-center">${question['Bloom\'s Taxonomy Level'] || 'N/A'}</td>
                                <td class="text-center">${question['Bloom\'s Highest Verb'] || 'N/A'}</td>
                                <td class="text-center ${question.Remark === 'Matches Expected Blooms Level' ? 'status-match' : question.Remark === 'Higher than Expected Blooms Level' ? 'status-higher' : 'status-lower'}">${question.Remark || 'No remarks'}</td>
                              </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="divider"></div>

                <!-- Module Analysis -->
                <div class="section">
                    <div class="section-title">Module Coverage Analysis</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="text-center">Module</th>
                                <th class="text-center">Expected</th>
                                <th class="text-center">Actual</th>
                                <th class="text-center">Variance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${moduleAnalysisRows}
                        </tbody>
                    </table>
                </div>

                <!-- Bloom's Analysis -->
                <div class="section">
                    <div class="section-title">Bloom's Taxonomy Analysis</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Level</th>
                                <th class="text-center">#</th>
                                <th class="text-center">Expected</th>
                                <th class="text-center">Actual</th>
                                <th class="text-center">Variance</th>
                                <th class="text-center">Questions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bloomDataRows}
                        </tbody>
                    </table>
                </div>

                <!-- ✨ NEW: Learning Domain Insights -->
                ${domainInsightsHtml}

                <!-- CO Coverage -->
                <div class="section">
                    <div class="section-title">Course Outcome Coverage</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="text-center">Outcome</th>
                                <th class="text-center">Coverage</th>
                                <th class="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${coAnalysisRows}
                        </tbody>
                    </table>
                </div>
                <div class="divider"></div>
                      
                <!-- Question Recommendations -->
                <div class="section">
                    <div class="section-title">Question Recommendations</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="text-center">#</th>
                                <th>Question</th>
                                <th class="text-center">Marks</th>
                                <th class="text-center">CO</th>
                                <th class="text-center">Extracted Verb</th>
                                <th class="text-center">Highest Verb</th>
                                <th class="text-center">Q-Score</th>
                                <th class="text-center">Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${questionRows}
                        </tbody>
                    </table>
                </div>

                <div class="divider"></div>

                ${coRecommendations.length > 0 ? `
                <div class="divider"></div>
                <div class="section">
                    <div class="section-title">Course Outcome Recommendations</div>
                    <table style="width: 100%; table-layout: fixed;">
                        <thead>
                            <tr>
                                <th class="text-center">CO</th>
                                <th class="text-center">Expected</th>
                                <th class="text-center">Actual</th>
                                <th class="text-center">Variance</th>
                                <th>Recommendation</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${coRecommendationRows}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                ${moduleRecommendations.length > 0 ? `
                <div class="section">
                    <div class="section-title">Module Recommendations</div>
                    <table style="width: 100%; table-layout: fixed;">
                        <thead>
                            <tr>
                                <th class="text-center">Module</th>
                                <th class="text-center">Expected</th>
                                <th class="text-center">Actual</th>
                                <th class="text-center">Variance</th>
                                <th>Recommendation</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${moduleRecommendationRows}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <div class="divider"></div>

                <!-- Analysis -->
                <div class="section">
                    <div class="section-title">Performance Analysis</div>
                    <div class="analysis-box">
                        <h4>Assessment Quality</h4>
                        <p>${finalScore >= 80
                          ? 'The assessment demonstrates strong alignment with learning objectives and cognitive levels.'
                          : finalScore >= 60
                            ? 'The assessment shows reasonable alignment with room for improvement in question design and distribution.'
                            : 'Significant adjustments are required to align with expected standards and cognitive level distribution.'
                        }</p>
                    </div>
                    <div class="analysis-box">
                        <h4>Alignment Status</h4>
                        <p>${matchPercentage}% of questions match their expected Bloom's taxonomy levels, with ${higherQuestions} questions at higher cognitive levels and ${lowerQuestions} below target. ${matchPercentage >= 80
                          ? 'This indicates strong cognitive level alignment across the assessment.'
                          : matchPercentage >= 60
                            ? 'Consider reviewing questions that fall below expected cognitive levels.'
                            : 'A substantial revision of question design is recommended to improve alignment.'
                        }</p>
                    </div>
                </div>

                <div class="footer">
                    <p>This report provides comprehensive analysis of assessment quality based on Course Outcome alignment, Module distribution, and Bloom's Taxonomy compliance.</p>
                    <p style="margin-top: 10px;">Generated on ${new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                </div>
            </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 250);
      };

    } catch (err) {
      console.error('PDF generation failed:', err);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const printCharts = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const content = chartsRef.current ? chartsRef.current.innerHTML : '<p>No charts available</p>';

      const html = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Graphical Report</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #111 }
            .chart-container { max-width: 900px; margin: 0 auto; }
            .chart-wrapper { margin-bottom: 24px; }
            .gauge { text-align:center; }
          </style>
        </head>
        <body>
          <h1 style="text-align:center">Graphical Report</h1>
          <div class="chart-container">${content}</div>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    } catch (err) {
      console.error('Print charts failed', err);
      showToast('Printing charts failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900 font-medium">Loading analysis data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Unable to Load Report</h2>
          <p className="text-gray-900 text-center mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-gray-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">No Data Available</h2>
          <p className="text-gray-900 text-center mb-4">No analysis data found.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const collectedData = data['Collected Data']?.[0];
  const finalScore = collectedData?.FinalScore || 0;
  const questionData = collectedData?.QuestionData || [];
  const bloomsData = collectedData?.BloomsData || {};
  const coData = collectedData?.COData || {};

  const sequence = normalizeSequenceConfig(data?.Sequence);
  const bloomLevelMap = data?.bloomLevelMap || {};

  // Current evaluations include ModuleData directly. For older papers where
  // ModuleData is missing/empty, derive the same expected/actual structure from
  // Sequence.ModuleHours and the stored question marks.
  const storedModuleData = Array.isArray(collectedData?.ModuleData)
    ? collectedData.ModuleData
    : [];
  const moduleHours = sequence?.ModuleHours || {};
  const fallbackModuleData = Object.keys(moduleHours).map((moduleKey) => {
    const moduleNumber = Number.parseFloat(String(moduleKey).match(/\d+(?:\.\d+)?/)?.[0] || '0');
    const hours = Number(moduleHours[moduleKey]) || 0;
    const totalHours = Object.values(moduleHours).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const actual = questionData.reduce((sum, question) => {
      const questionModule = Number.parseFloat(String(question.Module || '').match(/\d+(?:\.\d+)?/)?.[0] || '0');
      return questionModule === moduleNumber ? sum + (Number(question.Marks) || 0) : sum;
    }, 0);
    return {
      expected: totalHours > 0 ? (hours / totalHours) * 100 : 0,
      actual,
    };
  });
  const moduleData = storedModuleData.length > 0 ? storedModuleData : fallbackModuleData;
  const questionRecommendations = collectedData?.QuestionRecommendations || [];
  const coRecommendationsRaw = collectedData?.CORecommendations || [];
  const moduleRecommendationsRaw = collectedData?.ModuleRecommendations || [];

  const coRecommendations = normalizeCoRecommendations(coRecommendationsRaw);
  const moduleRecommendations = normalizeModuleRecommendations(moduleRecommendationsRaw);

  const totalQuestions = questionRecommendations.length;
  const matchingQuestions = questionRecommendations.filter(q => q.remark === 'Matches Expected Blooms Level').length;
  const higherQuestions = questionRecommendations.filter(q => q.remark === 'Higher than Expected Blooms Level').length;
  const lowerQuestions = questionRecommendations.filter(q => q.remark === 'Lower than Expected Blooms Level').length;
  const matchPercentage = totalQuestions > 0 ? (matchingQuestions / totalQuestions * 100).toFixed(1) : 0;

  const isTeacher = user?.role === 'teacher';
  const isAffiliatedTeacher = isTeacher && Boolean(user?.collegeId);
  const reviewStatus = data?.reviewStatus || 'draft';
  const canSubmitForReview = isAffiliatedTeacher && ['draft', 'needs_revision'].includes(reviewStatus);
  const showPlainOk = !isAffiliatedTeacher;

  const handleSubmitForReview = async () => {
    if (!canSubmitForReview || isSubmittingReview) return;

    try {
      setIsSubmittingReview(true);
      const response = await apiClient.put(`/teacher/papers/${paperId}/submit`);
      if (response.data?.paper) {
        setData(response.data.paper);
      } else {
        setData((previous) => previous ? { ...previous, reviewStatus: 'pending' } : previous);
      }
      showToast('Paper submitted for review successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to submit paper for review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getScoreRemark = (score) => {
    if (score >= 80) {
      return {
        label: 'Excellent',
        description: 'Strong alignment and balanced distribution. Minor refinements may enhance quality further.',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (score >= 60) {
      return {
        label: 'Good',
        description: 'Reasonable alignment with some areas needing attention. Review under-represented modules/COs.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    } else if (score >= 40) {
      return {
        label: 'Moderate',
        description: 'Significant improvements needed. Revise question cognitive levels and balance distribution.',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        label: 'Poor',
        description: 'Comprehensive restructuring required. Major misalignment in cognitive levels and/or distribution.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
  };

  const scoreRemark = getScoreRemark(finalScore);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ── Toast notification banner ── */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {/* ── Back Navigation ── */}
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Papers
          </button>
        </div>

        {/* ── Header ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 mb-6 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-1">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-3">
                📊 QMetric Analysis
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Assessment Analysis Report</h1>
              <p className="text-gray-500 text-sm">Course Outcome &amp; Cognitive Level Evaluation</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {canSubmitForReview ? (
                <button
                  onClick={handleSubmitForReview}
                  disabled={isSubmittingReview}
                  className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 py-2.5 px-5 rounded-xl border border-green-200 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingReview ? 'Submitting…' : 'Submit for Review'}
                </button>
              ) : showPlainOk ? (
                <span className="flex items-center gap-2 bg-gray-100 text-gray-700 py-2.5 px-5 rounded-xl border border-gray-200 text-sm font-medium">
                  OK
                </span>
              ) : null}
              <button
                onClick={openAppendix}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-5 rounded-xl border border-gray-200 transition-colors text-sm font-medium"
              >
                <BookOpen className="h-4 w-4" />
                View Appendix
              </button>
              <button
                onClick={() => setShowVisualization(true)}
                disabled={isDownloading}
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 px-5 rounded-xl border border-indigo-200 transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                Visualize Score
              </button>
              <button
                onClick={downloadCertificate}
                disabled={isDownloading}
                className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 py-2.5 px-5 rounded-xl border border-amber-200 transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                {isDownloading ? 'Generating…' : 'Certificate'}
              </button>
              <button
                onClick={downloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-2.5 px-5 rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                {isDownloading ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Score Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
          <div className="text-center">
            <h2 className="text-base font-semibold text-gray-500 uppercase tracking-widest mb-6">Overall Assessment Score</h2>
            <div className="flex justify-center mb-6">
              <Gauge value={finalScore} size={240} />
            </div>
            <p className="text-gray-400 text-sm mb-5">Based on alignment, distribution, and taxonomy analysis</p>
            <div className={`inline-block rounded-xl px-8 py-4 border-2 ${scoreRemark.bgColor} ${scoreRemark.borderColor}`}>
              <div className={`text-2xl font-bold mb-1 ${scoreRemark.color}`}>{scoreRemark.label}</div>
              <div className="text-sm text-gray-600 max-w-xl">{scoreRemark.description}</div>
            </div>
          </div>
        </div>

        {/* ── Key Metrics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { value: totalQuestions, label: 'Total Questions', color: 'text-gray-800', border: 'border-gray-200', bg: 'bg-white' },
            { value: matchingQuestions, label: 'Aligned Questions', color: 'text-green-600', border: 'border-green-100', bg: 'bg-green-50/50' },
            { value: higherQuestions, label: 'Higher Level', color: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50/50' },
            { value: lowerQuestions, label: 'Lower Level', color: 'text-red-500', border: 'border-red-100', bg: 'bg-red-50/50' },
          ].map((m, i) => (
            <div key={i} className={`${m.bg} rounded-2xl shadow-sm border ${m.border} p-6 text-center`}>
              <div className={`text-4xl font-extrabold mb-1 ${m.color}`}>{m.value}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">{m.label}</div>
            </div>
          ))}
        </div>

        {(() => {
          const Card = ({ title, children, accent = 'blue' }) => (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 mb-6 overflow-hidden relative">
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent === 'blue' ? 'from-blue-400 to-indigo-400' :
                accent === 'amber' ? 'from-amber-400 to-orange-400' :
                  accent === 'teal' ? 'from-teal-400 to-emerald-400' :
                    'from-purple-400 to-pink-400'
                }`} />
              <h2 className="text-base font-bold text-gray-800 mb-4 mt-1">{title}</h2>
              {children}
            </div>
          );

          const Th = ({ children, center }) => (
            <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 ${center ? 'text-center' : 'text-left'}`}>
              {children}
            </th>
          );

          const Td = ({ children, center, className = '' }) => (
            <td className={`px-4 py-3 text-sm text-gray-700 ${center ? 'text-center' : ''} ${className}`}>
              {children}
            </td>
          );

          return (
            <>
              <Card title="Course Information" accent="blue">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    ['Institution', data['College Name']],
                    ['Department', data['Branch']],
                    ['Course', data['Course Name']],
                    ['Code', data['Course Code']],
                    ['Instructor', data['Course Teacher']],
                    ['Academic Period', `Year ${data['Year Of Study'] || 'N/A'}, Sem ${data['Semester'] || 'N/A'}`],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-gray-100 pb-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
                      <div className="text-sm font-semibold text-gray-800">{value || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Course Outcomes Configuration" accent="teal">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b-2 border-gray-100">
                      <Th center>Outcome</Th><Th center>Weight</Th><Th center>Target Level</Th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.keys(sequence?.COs || {}).map(co => {
                        const d = sequence.COs[co];
                        return (
                          <tr key={co} className="hover:bg-slate-50 transition-colors">
                            <Td center><span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-md font-semibold text-xs">{co}</span></Td>
                            <Td center>{d.weight || 0}%</Td>
                            <Td center>{d.blooms?.[0] || 'N/A'}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Module Distribution" accent="purple">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b-2 border-gray-100">
                      <Th center>Module</Th><Th center>Hours</Th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.keys(sequence?.ModuleHours || {}).map(mod => (
                        <tr key={mod} className="hover:bg-slate-50 transition-colors">
                          <Td center><span className="px-2 py-0.5 bg-purple-50 border border-purple-100 text-purple-700 rounded-md font-semibold text-xs">{mod}</span></Td>
                          <Td center>{sequence.ModuleHours[mod] || 0}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Bloom's Taxonomy Mapping" accent="teal">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b-2 border-gray-100">
                      <Th>Cognitive Level</Th><Th center>Value</Th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.keys(bloomLevelMap).map(level => (
                        <tr key={level} className="hover:bg-slate-50 transition-colors">
                          <Td>{level}</Td>
                          <Td center>{bloomLevelMap[level]}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title={`Detailed Question-wise Analysis (${questionData.length} questions)`} accent="blue">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b-2 border-gray-100">
                      <Th>#</Th><Th>Question</Th><Th center>Marks</Th>
                      <Th center>CO</Th><Th center>Module</Th>
                      <Th center>Level</Th><Th center>Status</Th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {questionData.map((q, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <Td>{i + 1}</Td>
                          <Td>{q.Question || 'N/A'}</Td>
                          <Td center>{q.Marks || 0}</Td>
                          <Td center>{q.CO || 'N/A'}</Td>
                          <Td center>{q.Module || 'N/A'}</Td>
                          <Td center>{q["Bloom's Taxonomy Level"] || 'N/A'}</Td>
                          <td className={`px-4 py-3 text-center text-xs font-semibold ${q.Remark === 'Matches Expected Blooms Level' ? 'text-green-600' :
                            q.Remark === 'Higher than Expected Blooms Level' ? 'text-blue-600' : 'text-red-500'
                            }`}>{q.Remark || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Bloom's Taxonomy Analysis" accent="purple">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b-2 border-gray-100">
                      <Th>Level</Th><Th center>#</Th><Th center>Expected</Th>
                      <Th center>Actual</Th><Th center>Variance</Th><Th center>Questions</Th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.keys(bloomsData).map(level => {
                        const bd = bloomsData[level];
                        const variance = (bd.marks || 0) - (bd.weights || 0);
                        return (
                          <tr key={level} className="hover:bg-slate-50 transition-colors">
                            <Td>{bd.name || `Level ${level}`}</Td>
                            <Td center>{bd.level}</Td>
                            <Td center>{(bd.weights || 0).toFixed(1)}%</Td>
                            <Td center>{(bd.marks || 0).toFixed(1)}%</Td>
                            <td className={`px-4 py-3 text-center text-sm font-semibold ${variance < 0 ? 'text-red-500' : 'text-green-600'
                              }`}>{variance > 0 ? '+' : ''}{variance.toFixed(1)}%</td>
                            <Td center>{bd.No_Of_Questions || 0}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* ── Learning Domain Insights ── */}
              {collectedData?.DomainInsights && (
                <DomainInsightsSection insights={collectedData.DomainInsights} />
              )}

              <Card title="Module Coverage Analysis" accent="teal">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b-2 border-gray-100">
                      <Th center>Module</Th><Th center>Expected</Th>
                      <Th center>Actual</Th><Th center>Variance</Th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {moduleData.map((mod, index) => {
                        const variance = (mod.actual || 0) - (mod.expected || 0);
                        return (
                          <tr key={index} className="hover:bg-slate-50 transition-colors">
                            <Td center><span className="px-2 py-0.5 bg-teal-50 border border-teal-100 text-teal-700 rounded-md font-semibold text-xs">Module {index + 1}</span></Td>
                            <Td center>{(mod.expected || 0).toFixed(1)}%</Td>
                            <Td center>{(mod.actual || 0).toFixed(1)}%</Td>
                            <td className={`px-4 py-3 text-center text-sm font-semibold ${variance < 0 ? 'text-red-500' : 'text-green-600'
                              }`}>{variance > 0 ? '+' : ''}{variance.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Course Outcome Coverage" accent="blue">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b-2 border-gray-100">
                      <Th center>Outcome</Th><Th center>Coverage</Th><Th center>Status</Th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.keys(coData).map(co => (
                        <tr key={co} className="hover:bg-slate-50 transition-colors">
                          <Td center><span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-md font-semibold text-xs">{co}</span></Td>
                          <Td center>{(coData[co] || 0).toFixed(1)}%</Td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Complete</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {showVisualization && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto p-6 mx-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Graphical Report</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={printCharts} className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">Print Charts</button>
                        <button onClick={() => setShowVisualization(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">Close</button>
                      </div>
                    </div>
                    <div ref={chartsRef} className="space-y-6">
                      <div className="flex justify-center"><Gauge value={finalScore} size={240} /></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <BloomsAnalysisChart bloomsData={bloomsData} />
                        <ModuleAnalysisChart moduleData={moduleData} />
                      </div>
                      <div className="mt-6"><COCoverageChart coRecommendations={coRecommendations} coData={coData} /></div>
                      <QuestionDistributionChart questionData={questionData} />
                    </div>
                  </div>
                </div>
              )}

              <Card title="Question Recommendations" accent="amber">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b-2 border-gray-100">
                      <Th center>#</Th><Th>Question</Th><Th center>Marks</Th>
                      <Th center>CO</Th><Th center>Extracted Verb</Th>
                      <Th center>Highest Verb</Th><Th center>Q-Score</Th><Th center>Remark</Th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {questionRecommendations.map((rec, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          <Td center>{index + 1}</Td>
                          <Td>{rec.QuestionData || 'N/A'}</Td>
                          <Td center>{rec.marks || 0}</Td>
                          <Td center>{rec.co || 'N/A'}</Td>
                          <Td center>{rec.extractedVerb || 'N/A'}</Td>
                          <Td center>{rec.highestVerb || 'N/A'}</Td>
                          <td className={`px-4 py-3 text-center text-sm font-bold ${rec.qScore === 1 ? 'text-green-600' : rec.qScore === 2 ? 'text-blue-600' : 'text-red-500'
                            }`}>{rec.qScore}</td>
                          <td className={`px-4 py-3 text-center text-xs font-semibold ${rec.remark === 'Matches Expected Blooms Level' ? 'text-green-600' :
                            rec.remark === 'Higher than Expected Blooms Level' ? 'text-blue-600' : 'text-red-500'
                            }`}>{rec.remark || 'No remarks'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {(coRecommendations.length > 0 || moduleRecommendations.length > 0) && (
                <Card title="Recommendations" accent="amber">
                  <div className="space-y-6">
                    {coRecommendations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Course Outcome Recommendations</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b-2 border-amber-100 bg-amber-50/50">
                              <Th center>CO</Th><Th center>Expected</Th><Th center>Actual</Th><Th center>Variance</Th><Th>Recommendation</Th>
                            </tr></thead>
                            <tbody className="divide-y divide-amber-50">
                              {coRecommendations.map((rec, i) => {
                                const expected = Number(rec.expected || 0);
                                const actual = Number(rec.actual || 0);
                                const variance = actual - expected;
                                return (
                                  <tr key={i} className="hover:bg-amber-50/40 transition-colors">
                                    <Td center><span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-md font-semibold text-xs">{rec.co}</span></Td>
                                    <Td center>{expected.toFixed(1)}%</Td>
                                    <Td center>{actual.toFixed(1)}%</Td>
                                    <td className={`px-4 py-3 text-center text-sm font-semibold ${variance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                      {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                                    </td>
                                    <Td>{rec.suggestion || ''}</Td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {moduleRecommendations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Module Recommendations</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b-2 border-blue-100 bg-blue-50/50">
                              <Th center>Module</Th><Th center>Expected</Th><Th center>Actual</Th><Th center>Variance</Th><Th>Recommendation</Th>
                            </tr></thead>
                            <tbody className="divide-y divide-blue-50">
                              {moduleRecommendations.map((rec, i) => {
                                const expected = Number(rec.expected || 0);
                                const actual = Number(rec.actual || 0);
                                const variance = actual - expected;
                                return (
                                  <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                                    <Td center>{rec.module}</Td>
                                    <Td center>{expected.toFixed(1)}%</Td>
                                    <Td center>{actual.toFixed(1)}%</Td>
                                    <td className={`px-4 py-3 text-center text-sm font-semibold ${variance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                      {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                                    </td>
                                    <Td>{rec.suggestion || ''}</Td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <Card title="Performance Analysis" accent="blue">
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-400 bg-blue-50/60 rounded-r-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-1 text-sm">Assessment Quality</h3>
                    <p className="text-sm text-gray-600">
                      {finalScore >= 80
                        ? 'The assessment demonstrates strong alignment with learning objectives and cognitive levels.'
                        : finalScore >= 60
                          ? 'The assessment shows reasonable alignment with room for improvement in question design and distribution.'
                          : 'Significant adjustments are required to align with expected standards and cognitive level distribution.'}
                    </p>
                  </div>
                  <div className="border-l-4 border-purple-400 bg-purple-50/60 rounded-r-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-1 text-sm">Alignment Status</h3>
                    <p className="text-sm text-gray-600">
                      {matchPercentage}% of questions match their expected Bloom's taxonomy levels, with {higherQuestions} questions
                      at higher cognitive levels and {lowerQuestions} below target.{
                        matchPercentage >= 80
                          ? ' This indicates strong cognitive level alignment across the assessment.'
                          : matchPercentage >= 60
                            ? ' Consider reviewing questions that fall below expected cognitive levels.'
                            : ' A substantial revision of question design is recommended to improve alignment.'
                      }
                    </p>
                  </div>
                </div>
              </Card>
            </>
          );
        })()}

      </div>
    </div>
  );

};

export default ResultPage;