const axios = require('axios');
const Problem = require('../models/Problem');

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:5001';

// Internal: call NLP predict endpoint
const callNLP = async (text) => {
  try {
    const { data } = await axios.post(`${NLP_URL}/predict`, { text }, { timeout: 6000 });
    return data;
  } catch (err) {
    console.warn('NLP service unavailable, using defaults:', err.message);
    return { category: 'Other', agency: 'General Administration', severity: 'Medium', keywords: [], confidence: 0 };
  }
};

// Internal: check duplicates via NLP service
const checkDuplicate = async (newText, existingProblems) => {
  if (!existingProblems || existingProblems.length === 0) {
    return { isDuplicate: false, similarProblemId: null, similarity: 0 };
  }
  try {
    const existing = existingProblems.map((p) => ({
      id: p._id.toString(),
      text: `${p.title} ${p.description}`
    }));
    const { data } = await axios.post(`${NLP_URL}/check-duplicate`, { text: newText, existing }, { timeout: 8000 });
    return data;
  } catch (err) {
    console.warn('Duplicate check failed:', err.message);
    return { isDuplicate: false, similarProblemId: null, similarity: 0 };
  }
};

// POST /api/problems/report
exports.reportProblem = async (req, res) => {
  try {
    const { title, description, location } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({ message: 'Title, description and location are required' });
    }

    const forceNew = req.body.forceNew === 'true' || req.body.forceNew === true;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const combinedText = `${title} ${description}`;

    // NLP classification
    const nlpResult = await callNLP(combinedText);

    let dupResult = { isDuplicate: false, similarProblemId: null, similarity: 0 };

    if (!forceNew) {
      // Fetch recent problems for duplicate detection (non-duplicates only)
      const recentProblems = await Problem.find({ isDuplicate: false })
        .select('_id title description')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      dupResult = await checkDuplicate(combinedText, recentProblems);
    }

    if (!forceNew && dupResult.isDuplicate && dupResult.similarProblemId) {
      const existing = await Problem.findByIdAndUpdate(
        dupResult.similarProblemId,
        { $inc: { supportCount: 1 }, $addToSet: { supporters: req.user.id } },
        { new: true }
      ).populate('createdBy', 'name');

      return res.status(200).json({
        success: true,
        isDuplicate: true,
        similarity: dupResult.similarity,
        message: `This issue has already been reported. ${existing.supportCount} people have reported or supported it.`,
        existingProblem: existing
      });
    }

    const problem = await Problem.create({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      image,
      category: nlpResult.category || 'Other',
      assignedAgency: nlpResult.agency || 'General Administration',
      severity: nlpResult.severity || 'Medium',
      keywords: nlpResult.keywords || [],
      createdBy: req.user.id,
      supportCount: 1,
      supporters: [req.user.id]
    });

    await problem.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      isDuplicate: false,
      message: 'Problem reported successfully',
      problem,
      nlpAnalysis: nlpResult
    });
  } catch (error) {
    console.error('reportProblem error:', error);
    res.status(500).json({ message: 'Server error while reporting problem' });
  }
};

// POST /api/problems/analyze  – live NLP preview without saving
exports.analyzeText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 5) {
      return res.status(400).json({ message: 'Text is too short to analyze' });
    }
    const result = await callNLP(text.trim());
    res.json({ success: true, analysis: result });
  } catch (error) {
    console.error('analyzeText error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/problems
exports.getProblems = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 10, search } = req.query;
    const query = {};
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [problems, total] = await Promise.all([
      Problem.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Problem.countDocuments(query)
    ]);

    res.json({
      success: true,
      problems,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('getProblems error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/problems/my
exports.getMyProblems = async (req, res) => {
  try {
    const problems = await Problem.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, problems });
  } catch (error) {
    console.error('getMyProblems error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/problems/stats
exports.getStats = async (req, res) => {
  try {
    const [total, pending, inProgress, resolved, categoryStats] = await Promise.all([
      Problem.countDocuments(),
      Problem.countDocuments({ status: 'Pending' }),
      Problem.countDocuments({ status: 'In Progress' }),
      Problem.countDocuments({ status: 'Resolved' }),
      Problem.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({ success: true, stats: { total, pending, inProgress, resolved, categoryStats } });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/problems/:id
exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('similarTo', 'title status');
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json({ success: true, problem });
  } catch (error) {
    console.error('getProblemById error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/problems/:id/status  (admin only)
exports.updateStatus = async (req, res) => {
  try {
    const { status, adminComment } = req.body;
    const valid = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const update = { status };
    if (adminComment) update.adminComment = adminComment.trim();
    if (status === 'Resolved') update.resolvedAt = new Date();

    const problem = await Problem.findByIdAndUpdate(req.params.id, update, { new: true }).populate('createdBy', 'name email');
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    res.json({ success: true, message: 'Status updated', problem });
  } catch (error) {
    console.error('updateStatus error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/problems/:id/support
exports.supportProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const alreadySupported = problem.supporters.some((s) => s.toString() === req.user.id.toString());
    if (alreadySupported) {
      return res.status(400).json({ message: 'You have already supported this problem' });
    }

    problem.supportCount += 1;
    problem.supporters.push(req.user.id);
    await problem.save();

    res.json({ success: true, message: 'Support added', supportCount: problem.supportCount });
  } catch (error) {
    console.error('supportProblem error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
