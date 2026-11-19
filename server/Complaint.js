import mongoose from 'mongoose';

export const categories = [
  'Classroom Maintenance', 'Laboratory Equipment', 'Electricity',
  'Internet Connectivity', 'Cleanliness', 'Administrative Issues', 'Other',
];

export const statuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

const feedbackSchema = new mongoose.Schema({
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  comment: { type: String, trim: true, maxlength: 500 },
  submittedAt: { type: Date, required: true },
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: categories, required: true },
  location: { type: String, trim: true, required: true, maxlength: 120 },
  description: { type: String, trim: true, required: true, minlength: 10, maxlength: 1000 },
  status: {
    type: String, enum: statuses,
    required: true, default: 'Pending',
  },
  feedback: feedbackSchema,
  assignedTeam: { type: String, default: '' },
  resolutionNote: { type: String, maxlength: 1000, default: '' },
}, { timestamps: true });

complaintSchema.index({ student: 1, createdAt: -1, _id: -1 });

export const Complaint = mongoose.model('Complaint', complaintSchema);
