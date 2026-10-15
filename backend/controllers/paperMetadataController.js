'use strict';

const mongoose = require('mongoose');
const logger = require('../config/logger');
const PaperInfo = require('../Model/PaperInfo');

// Canonical maps — lowercased raw values → display value
const DIFFICULTY_CANON = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const QUESTION_TYPE_CANON = {
  mcq: 'MCQ',
  'multiple choice': 'MCQ',
  'multiple choice question': 'MCQ',
  'short answer': 'Short Answer',
  shortanswer: 'Short Answer',
  'short answer question': 'Short Answer',
  essay: 'Essay',
  'case study': 'Case Study',
  casestudy: 'Case Study',
  'true/false': 'True/False',
  truefalse: 'True/False',
  'true or false': 'True/False',
};

function isObjectId(v) {
  return typeof v === 'string' && mongoose.Types.ObjectId.isValid(v);
}

/**
 * Pull the question array out of a PaperInfo document, handling both shapes:
 *   NEW: "Collected Data" = [evaluationResult], questions at [0].QuestionData
 *   OLD: "Collected Data" = [question, question, ...]
 */
function extractQuestions(paper) {
  const collected = paper['Collected Data'] || [];
  if (!Array.isArray(collected) || collected.length === 0) return [];
  const first = collected[0];
  if (first && typeof first === 'object' && Array.isArray(first.QuestionData)) {
    return first.QuestionData;
  }
  if (first && typeof first === 'object' && (first.Question || first['Question No'])) {
    return collected;
  }
  return [];
}

/**
 * Count values into { displayValue: count }, normalizing case via canonicalMap.
 * `canonicalMap` shape: { lowercaseRaw: displayValue }
 */
function tally(questions, fieldName, canonicalMap) {
  const out = {};
  if (canonicalMap) {
    for (const v of Object.values(canonicalMap)) out[v] = 0;
  }
  for (const q of questions) {
    const raw = q[fieldName] ?? q[fieldName.toLowerCase()] ?? '';
    const trimmed = String(raw).trim();
    if (!trimmed) {
      out.Unknown = (out.Unknown || 0) + 1;
      continue;
    }
    const key = canonicalMap
      ? canonicalMap[trimmed.toLowerCase()] || trimmed
      : trimmed;
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function withPercentages(counts, total) {
  const out = {};
  for (const [k, v] of Object.entries(counts)) {
    out[k] = {
      count: v,
      percentage: total > 0 ? Number(((v / total) * 100).toFixed(1)) : 0,
    };
  }
  return out;
}

/**
 * GET /reviewer/papers/:id/metadata
 */
async function getPaperMetadata(req, res) {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res.status(400).json({ error: true, message: 'Invalid paper ID' });
    }

    const paperQuery =
      req.user.role === 'super_admin'
        ? { _id: id }
        : { _id: id, collegeId: req.user.collegeId };

    const paper = await PaperInfo.findOne(paperQuery).lean();
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }

    const questions = extractQuestions(paper);
    const total = questions.length;

    const difficultyCounts = tally(questions, 'Difficulty', DIFFICULTY_CANON);
    const difficulty = withPercentages(difficultyCounts, total);

    const qtCounts = tally(questions, 'Question Type', QUESTION_TYPE_CANON);
    const questionTypes = withPercentages(qtCounts, total);

    const weightMap = { Easy: 1, Medium: 2, Hard: 3 };
    let weightedSum = 0;
    let weightedCount = 0;
    for (const [k, v] of Object.entries(difficultyCounts)) {
      const w = weightMap[k];
      if (w !== undefined) {
        weightedSum += w * v;
        weightedCount += v;
      }
    }
    const averageDifficulty = weightedCount > 0
      ? Number((weightedSum / weightedCount).toFixed(2))
      : null;

    const bloomCounts = { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0 };
    for (const q of questions) {
      const lvl = Number.parseInt(q["Bloom's Taxonomy Level"], 10);
      if (lvl >= 1 && lvl <= 6) bloomCounts[`level${lvl}`]++;
    }

    const moduleCounts = {};
    for (const q of questions) {
      const m = q.Module;
      if (m && m !== 'N/A') {
        const key = `module${String(m).match(/\d+/)?.[0] || 'other'}`;
        moduleCounts[key] = (moduleCounts[key] || 0) + 1;
      }
    }

    return res.json({
      error: false,
      paperId: id,
      totalQuestions: total,
      difficulty,
      questionTypes,
      averageDifficulty,
      blooms: bloomCounts,
      modules: moduleCounts,
    });
  } catch (err) {
    logger.error('[paperMetadata.getPaperMetadata]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

/**
 * GET /college-admin/metadata-analytics
 */
async function getMetadataAnalytics(req, res) {
  try {
    const { startDate, endDate, branch } = req.query;
    const collegeId = req.user.collegeId;
    if (!collegeId) {
      return res.status(400).json({ error: true, message: 'No college assigned' });
    }

    const match = { collegeId: new mongoose.Types.ObjectId(collegeId) };
    if (startDate || endDate) {
      match.createdAt = {};

      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          return res.status(400).json({ error: true, message: 'Invalid startDate.' });
        }
        match.createdAt.$gte = parsedStart;
      }

      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ error: true, message: 'Invalid endDate.' });
        }

        // A date-only endDate means the entire day. Use an exclusive next-day
        // boundary so papers created later that day are included.
        if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          parsedEnd.setUTCHours(0, 0, 0, 0);
          parsedEnd.setUTCDate(parsedEnd.getUTCDate() + 1);
          match.createdAt.$lt = parsedEnd;
        } else {
          match.createdAt.$lt = parsedEnd;
        }
      }
    }
    if (branch) match.Branch = branch;

    const papers = await PaperInfo.find(match).select({ 'Collected Data': 1 }).lean();

    const agg = {
      totalPapers: papers.length,
      totalQuestions: 0,
      difficultyTotals: { Easy: 0, Medium: 0, Hard: 0, Unknown: 0 },
      questionTypeTotals: {},
    };

    for (const p of papers) {
      const qs = extractQuestions(p);
      agg.totalQuestions += qs.length;
      for (const q of qs) {
        const rawD = String(q.Difficulty || '').trim();
        const dKey = DIFFICULTY_CANON[rawD.toLowerCase()];
        if (dKey) agg.difficultyTotals[dKey]++;
        else agg.difficultyTotals.Unknown++;

        const rawQt = String(q['Question Type'] || '').trim();
        const qtKey = QUESTION_TYPE_CANON[rawQt.toLowerCase()] || (rawQt || 'Unknown');
        agg.questionTypeTotals[qtKey] = (agg.questionTypeTotals[qtKey] || 0) + 1;
      }
    }

    const avgQuestionsPerPaper = papers.length > 0
      ? Number((agg.totalQuestions / papers.length).toFixed(1))
      : 0;

    return res.json({
      error: false,
      analytics: {
        ...agg,
        avgQuestionsPerPaper,
        dateRange: { startDate: startDate || null, endDate: endDate || null },
      },
    });
  } catch (err) {
    logger.error('[paperMetadata.getMetadataAnalytics]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

module.exports = { getPaperMetadata, getMetadataAnalytics };