const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters']
    },
    image: {
      type: String,
      default: null
    },
    category: {
      type: String,
      enum: [
        'Road Infrastructure',
        'Crime',
        'Railway',
        'Transport',
        'Corruption',
        'Education',
        'Health',
        'Environment',
        'Water Supply',
        'Electricity',
        'Other'
      ],
      default: 'Other'
    },
    assignedAgency: {
      type: String,
      default: 'General Administration'
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    },
    keywords: [{ type: String }],
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    supportCount: {
      type: Number,
      default: 1
    },
    supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDuplicate: {
      type: Boolean,
      default: false
    },
    similarTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      default: null
    },
    adminComment: {
      type: String,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

problemSchema.index({ title: 'text', description: 'text' });
problemSchema.index({ category: 1, status: 1 });
problemSchema.index({ createdBy: 1 });
problemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Problem', problemSchema);
