import { Router } from 'express';
import { isObjectIdOrHexString } from 'mongoose';
import { categories, statuses } from './Complaint.js';
import { complaintSummary } from './complaints.js';

const teams = ['Facilities', 'Lab Support', 'IT Support', 'Campus Administration'];

export function createAdminComplaintRouter(complaints) {
  const router = Router();

  router.use((req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access is required.' });
    }
    next();
  });

  router.get('/', async (_req, res) => {
    const records = await complaints.find()
      .sort({ createdAt: -1, _id: -1 }).populate('student', 'name email').lean();
    res.json({
      complaints: records.map((record) => ({
        ...complaintSummary(record),
        student: record.student,
      })),
      teams,
      statuses,
      categories,
    });
  });

  router.patch('/:id', async (req, res) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ message: 'Send an application/json request.' });
    }
    if (!isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: 'Invalid complaint ID.' });
    }

    const { status, assignedTeam, resolutionNote } = req.body ?? {};
    if (!statuses.includes(status) || (assignedTeam !== '' && !teams.includes(assignedTeam))) {
      return res.status(400).json({ message: 'Select a valid status and team.' });
    }
    if (typeof resolutionNote !== 'string' || resolutionNote.trim().length > 1000) {
      return res.status(400).json({ message: 'Use at most 1,000 characters for the note.' });
    }
    const note = resolutionNote.trim();
    if ((status === 'Resolved' || status === 'Rejected') && !note) {
      return res.status(400).json({ message: 'Add a note explaining the outcome.' });
    }

    const updated = await complaints.findByIdAndUpdate(req.params.id, {
      $set: { status, assignedTeam, resolutionNote: note },
    }, { returnDocument: 'after', runValidators: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Complaint not found.' });
    return res.json({ complaint: complaintSummary(updated) });
  });

  return router;
}
