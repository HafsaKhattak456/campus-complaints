import { isObjectIdOrHexString } from 'mongoose';
import { Router } from 'express';
import { categories } from './Complaint.js';

export function complaintSummary(complaint) {
  const { _id, category, location, description, status, createdAt, assignedTeam = '', resolutionNote = '', feedback = null } = complaint;
  return { id: String(_id), category, location, description, status, createdAt, assignedTeam, resolutionNote, feedback };
}

export function createComplaintRouter(complaints) {
  const router = Router();

  router.use((req, res, next) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Student access is required.' });
    }
    next();
  });

  router.get('/categories', (_req, res) => res.json({ categories }));

  router.get('/', async (req, res) => {
    const records = await complaints.find({ student: req.user.id })
      .sort({ createdAt: -1, _id: -1 }).lean();
    res.json({ complaints: records.map(complaintSummary) });
  });

  router.post('/', async (req, res) => {
    const { category, location, description } = req.body ?? {};
    const cleanLocation = typeof location === 'string' ? location.trim() : '';
    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    if (!categories.includes(category)) {
      return res.status(400).json({ message: 'Select a complaint category.' });
    }
    if (!cleanLocation || cleanLocation.length > 120) {
      return res.status(400).json({ message: 'Enter a location of 1–120 characters.' });
    }
    if (cleanDescription.length < 10 || cleanDescription.length > 1000) {
      return res.status(400).json({ message: 'Enter a description of 10–1,000 characters.' });
    }

    const complaint = await complaints.create({
      student: req.user.id,
      category,
      location: cleanLocation,
      description: cleanDescription,
      status: 'Pending',
    });
    return res.status(201).json({ complaint: complaintSummary(complaint) });
  });

  router.post('/:id/feedback', async (req, res) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ message: 'Send an application/json request.' });
    }
    if (!isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: 'Invalid complaint ID.' });
    }
    const { rating, comment = '' } = req.body ?? {};
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Choose a rating from 1 to 5.' });
    }
    if (typeof comment !== 'string' || comment.trim().length > 500) {
      return res.status(400).json({ message: 'Use at most 500 characters for feedback.' });
    }

    const ownerFilter = { _id: req.params.id, student: req.user.id };
    const updated = await complaints.findOneAndUpdate({
      ...ownerFilter, status: 'Resolved', feedback: null,
    }, {
      $set: { feedback: { rating, comment: comment.trim(), submittedAt: new Date() } },
    }, { returnDocument: 'after', runValidators: true }).lean();

    if (!updated) {
      const owned = await complaints.exists(ownerFilter);
      if (!owned) return res.status(404).json({ message: 'Complaint not found.' });
      return res.status(409).json({ message: 'Feedback can be submitted once per resolved complaint.' });
    }

    return res.status(201).json({ complaint: complaintSummary(updated) });
  });

  return router;
}
