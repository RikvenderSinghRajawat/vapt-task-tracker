const ReviewRequest = require('../models/ReviewRequest');
const Finding = require('../models/Finding');
const Project = require('../models/Project');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { hasGlobalAccess, allocatedProjectIds } = require('../utils/rbac');

const terminalFindingStatuses = {
  close_finding: 'closed',
  reopen_finding: 'open'
};

async function canRequestFindingAction(user, finding) {
  if (!finding || finding.deletedAt) return false;
  if (hasGlobalAccess(user)) return true;

  const userId = user._id.toString();
  if (finding.assignee?.toString() === userId) return true;
  if ((finding.assignedDevelopers || []).some(id => id.toString() === userId)) return true;

  const project = await Project.findOne({ _id: finding.project, deletedAt: null });
  if (!project) return false;
  if (project.manager?.toString() === userId) return true;
  if ((project.teamMembers || []).some(member => member.user?.toString() === userId)) return true;
  return allocatedProjectIds(user).map(String).includes(finding.project.toString());
}

async function reviewerRecipients(project, requesterId) {
  const adminUsers = await User.find({
    deletedAt: null,
    isActive: true,
    role: { $in: ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'] }
  }).select('_id');

  const ids = adminUsers.map(user => user._id.toString());
  if (project?.manager) ids.push(project.manager.toString());
  return [...new Set(ids)].filter(id => id !== requesterId.toString());
}

const presentRequest = (request) => ({
  id: request._id?.toString() || request.id,
  type: request.type,
  status: request.status,
  projectId: request.project?._id?.toString() || request.project?.toString?.() || request.project,
  projectName: request.project?.name || '',
  findingId: request.finding?.findingId || request.finding?._id?.toString() || request.finding?.toString?.() || '',
  findingObjectId: request.finding?._id?.toString() || request.finding?.toString?.() || '',
  findingTitle: request.finding?.title || '',
  requestedBy: request.requestedBy?.name || request.requestedBy?.email || '',
  requestedByEmail: request.requestedBy?.email || '',
  requestedById: request.requestedBy?._id?.toString() || request.requestedBy?.toString?.() || '',
  reason: request.reason || '',
  checklist: request.checklist || {},
  createdAt: request.createdAt,
  reviewedBy: request.reviewedBy?.name || request.reviewedBy?.email || '',
  reviewedAt: request.reviewedAt,
  reviewReason: request.reviewReason || ''
});

exports.createFindingRequest = async (req, res, next) => {
  try {
    const { type, projectId, findingId, reason, checklist } = req.body;
    if (!['close_finding', 'reopen_finding', 'help_request'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid request type' });
    }
    if (!projectId || !findingId) {
      return res.status(400).json({ success: false, message: 'projectId and findingId are required' });
    }

    const finding = await Finding.findOne({ _id: findingId, project: projectId, deletedAt: null });
    if (!finding) return res.status(404).json({ success: false, message: 'Finding not found' });

    if (!(await canRequestFindingAction(req.user, finding))) {
      return res.status(403).json({ success: false, message: 'Not authorized to create a request for this finding' });
    }

    const request = await ReviewRequest.create({
      type,
      project: projectId,
      finding: findingId,
      requestedBy: req.user._id,
      reason: reason || '',
      checklist: checklist || {}
    });

    const project = await Project.findById(projectId);
    const recipients = await reviewerRecipients(project, req.user._id);
    await Promise.all(recipients.map(recipient => Notification.create({
      recipient,
      type: 'review_request',
      title: type === 'help_request' ? 'Help requested on finding' : 'Finding review request',
      message: `${req.user.name || req.user.email} requested ${type.replace('_', ' ')} for ${finding.title}`,
      priority: finding.severity === 'critical' ? 'urgent' : 'normal',
      relatedEntity: { type: 'review_request', id: request._id },
      actionUrl: '/dashboard',
      redirectUrl: '/dashboard',
      entityType: 'review_request',
      entityId: request._id.toString(),
      deliveryMethods: { inApp: true, email: false }
    }).catch(() => null)));

    await AuditLog.create({
      user: req.user._id,
      action: `request_${type}`,
      entityType: 'review_request',
      entityId: request._id.toString(),
      entityName: finding.title,
      details: { projectId, findingId, reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    const populated = await ReviewRequest.findById(request._id)
      .populate('project', 'name code manager')
      .populate('finding', 'findingId title severity status')
      .populate('requestedBy', 'name email role');

    res.status(201).json({ success: true, message: 'Request submitted successfully', data: presentRequest(populated) });
  } catch (error) {
    next(error);
  }
};

exports.getPendingRequests = async (req, res, next) => {
  try {
    const query = { status: 'pending', deletedAt: null };
    if (!hasGlobalAccess(req.user)) {
      query.project = { $in: allocatedProjectIds(req.user) };
    }

    const requests = await ReviewRequest.find(query)
      .populate('project', 'name code manager')
      .populate('finding', 'findingId title severity status')
      .populate('requestedBy', 'name email role')
      .sort('-createdAt');

    const data = requests.map(presentRequest);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

async function reviewRequest(req, res, next, status) {
  try {
    const review = await ReviewRequest.findOne({ _id: req.params.id, status: 'pending', deletedAt: null });
    if (!review) return res.status(404).json({ success: false, message: 'Pending request not found' });

    if (!hasGlobalAccess(req.user)) {
      const projectIds = allocatedProjectIds(req.user).map(String);
      if (!projectIds.includes(review.project.toString())) {
        return res.status(403).json({ success: false, message: 'Not authorized to review this request' });
      }
    }

    const finding = await Finding.findById(review.finding);
    if (!finding || finding.deletedAt) return res.status(404).json({ success: false, message: 'Finding not found' });

    review.status = status;
    review.reviewedBy = req.user._id;
    review.reviewedAt = new Date();
    review.reviewReason = req.body.reason || req.body.rejectedBy || req.body.approvedBy || '';

    if (status === 'approved' && terminalFindingStatuses[review.type]) {
      finding.status = terminalFindingStatuses[review.type];
      if (review.type === 'close_finding') {
        finding.closedBy = req.user._id;
        finding.closedAt = new Date();
        finding.sla_status = 'resolved';
      } else if (review.type === 'reopen_finding') {
        finding.closedBy = undefined;
        finding.closedAt = undefined;
      }
      finding.history = finding.history || [];
      finding.history.push({
        action: `approved_${review.type}`,
        performedBy: req.user._id,
        performedAt: new Date(),
        reviewRequest: review._id
      });
      await finding.save();
      review.resolution = { findingStatus: finding.status };
    }

    await review.save();

    await Notification.create({
      recipient: review.requestedBy,
      type: `request_${status}`,
      title: `Request ${status}`,
      message: `Your ${review.type.replace('_', ' ')} request was ${status}.`,
      priority: status === 'approved' ? 'normal' : 'high',
      relatedEntity: { type: 'review_request', id: review._id },
      actionUrl: `/projects/${review.project}/findings/${review.finding}`,
      redirectUrl: `/projects/${review.project}/findings/${review.finding}`,
      entityType: 'finding',
      entityId: review.finding?.toString(),
      deliveryMethods: { inApp: true, email: false }
    }).catch(() => {});

    await AuditLog.create({
      user: req.user._id,
      action: `${status}_review_request`,
      entityType: 'review_request',
      entityId: review._id.toString(),
      entityName: review.type,
      details: { requestType: review.type, finding: review.finding, reason: review.reviewReason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    const populated = await ReviewRequest.findById(review._id)
      .populate('project', 'name code manager')
      .populate('finding', 'findingId title severity status')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    res.status(200).json({ success: true, message: `Request ${status}`, data: presentRequest(populated) });
  } catch (error) {
    next(error);
  }
}

exports.approveRequest = (req, res, next) => reviewRequest(req, res, next, 'approved');
exports.rejectRequest = (req, res, next) => reviewRequest(req, res, next, 'rejected');
