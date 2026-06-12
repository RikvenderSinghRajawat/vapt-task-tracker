const Project = require('../models/Project');
const Finding = require('../models/Finding');
const User = require('../models/User');
const { findingScope, projectScope } = require('../utils/rbac');
const { ACTIVE_SEVERITY_STATUSES, CLOSED_SEVERITY_STATUSES, isActiveStatus, isClosedStatus } = require('../utils/severity');

const buildFindingFilter = (req) => findingScope(req.user);
const buildProjectFilter = (req) => projectScope(req.user);

exports.getDashboardStats = async (req, res, next) => {
  try {
    const findingFilter = buildFindingFilter(req);
    const projectFilter = buildProjectFilter(req);

    const totalProjects = await Project.countDocuments(projectFilter);
    const activeProjects = await Project.countDocuments({ ...projectFilter, status: 'in_progress' });
    const completedProjects = await Project.countDocuments({ ...projectFilter, status: 'completed' });

    const totalFindings = await Finding.countDocuments(findingFilter);

    const activeFindingFilter = { ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES } };
    const criticalFindings = await Finding.countDocuments({ ...activeFindingFilter, severity: 'critical' });
    const highFindings = await Finding.countDocuments({ ...activeFindingFilter, severity: 'high' });
    const mediumFindings = await Finding.countDocuments({ ...activeFindingFilter, severity: 'medium' });
    const lowFindings = await Finding.countDocuments({ ...activeFindingFilter, severity: 'low' });

    const openFindings = await Finding.countDocuments({ ...findingFilter, status: 'open' });
    const closedFindings = await Finding.countDocuments({ ...findingFilter, status: { $in: CLOSED_SEVERITY_STATUSES } });

    let totalUsers = 0, activeUsers = 0;
    if (req.user.role === 'admin' || req.user.role === 'vapt_analyst' || req.user.role === 'vapt_tl') {
      totalUsers = await User.countDocuments({ deletedAt: null });
      activeUsers = await User.countDocuments({ isActive: true, deletedAt: null });
    }

    const resolvedFindings = await Finding.find({
      ...findingFilter, status: { $in: CLOSED_SEVERITY_STATUSES },
      closedAt: { $exists: true }, createdAt: { $exists: true }
    });

    let avgResolutionTime = 0;
    if (resolvedFindings.length > 0) {
      const totalTime = resolvedFindings.reduce((sum, f) => sum + (new Date(f.closedAt) - new Date(f.createdAt)), 0);
      avgResolutionTime = Math.round(totalTime / resolvedFindings.length / (1000 * 60 * 60));
    }

    const overdueFindings = await Finding.countDocuments({
      ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES }, dueDate: { $lt: new Date() }
    });

    // SLA compliance data
    const slaBreachedFindings = await Finding.countDocuments({
      ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES }, sla_status: 'breached'
    });
    const slaAtRiskFindings = await Finding.countDocuments({
      ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES }, sla_status: 'at_risk'
    });
    const slaOnTrackFindings = await Finding.countDocuments({
      ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES }, sla_status: 'on_track'
    });
    const slaResolvedFindings = await Finding.countDocuments({
      ...findingFilter, status: { $in: CLOSED_SEVERITY_STATUSES }, sla_status: 'resolved'
    });
    const activeSlaFindings = await Finding.countDocuments({
      ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES }
    });
    const slaComplianceRate = activeSlaFindings > 0
      ? Math.round(((activeSlaFindings - slaBreachedFindings) / activeSlaFindings) * 100)
      : 100;

    // Recent critical findings (non-closed), scoped by role, sorted newest first
    const recentCriticalFindings = await Finding.find({
      ...findingFilter,
      severity: 'critical',
      status: { $in: ACTIVE_SEVERITY_STATUSES }
    })
      .populate('project', 'name code')
      .sort('-createdAt')
      .limit(5)
      .lean();

    const mappedRecentCritical = recentCriticalFindings.map(f => ({
      id: f._id,
      findingId: f.findingId,
      title: f.title,
      severity: f.severity,
      status: f.status,
      projectName: f.project?.name || 'Unknown',
      projectCode: f.project?.code || '',
      createdAt: f.createdAt,
      dueDate: f.dueDate
    }));

    res.status(200).json({
      success: true,
      data: {
        projects: { total: totalProjects, active: activeProjects, completed: completedProjects },
        findings: {
          total: totalFindings,
          critical: criticalFindings,
          high: highFindings,
          medium: mediumFindings,
          low: lowFindings,
          open: openFindings,
          closed: closedFindings,
          overdue: overdueFindings,
          recentCritical: mappedRecentCritical
        },
        users: (req.user.role === 'admin' || req.user.role === 'vapt_analyst' || req.user.role === 'vapt_tl') ? { total: totalUsers, active: activeUsers } : {},
        metrics: { 
          avgResolutionTime, 
          slaBreachRate: totalFindings > 0 ? Math.round((overdueFindings / totalFindings) * 100) : 0 
        },
        sla: {
          onTrack: slaOnTrackFindings,
          atRisk: slaAtRiskFindings,
          breached: slaBreachedFindings,
          resolved: slaResolvedFindings,
          active: activeSlaFindings,
          complianceRate: slaComplianceRate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSeverityDistribution = async (req, res, next) => {
  try {
    const query = { ...buildFindingFilter(req), status: { $in: ACTIVE_SEVERITY_STATUSES } };

    const distribution = await Finding.aggregate([
      { $match: query },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const severityCounts = new Map([['critical', 0], ['high', 0], ['medium', 0], ['low', 0], ['info', 0]]);
    distribution.forEach(item => {
      if (severityCounts.has(item._id)) severityCounts.set(item._id, item.count);
    });
    const result = Object.fromEntries(severityCounts);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getFindingsTrend = async (req, res, next) => {
  try {
    const { period = '6months' } = req.query;
    const query = buildFindingFilter(req);

    let startDate;
    const now = new Date();
    if (period === '1month') startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    else if (period === '3months') startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    else startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const findings = await Finding.find({ ...query, createdAt: { $gte: startDate } });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend = {};
    findings.forEach(f => {
      const d = new Date(f.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!trend[key]) { // eslint-disable-line security/detect-object-injection -- key is date-derived
        trend[key] = { created: 0, closed: 0, critical: 0, high: 0, medium: 0, low: 0 }; // eslint-disable-line security/detect-object-injection -- key is date-derived
      }
      // eslint-disable-next-line security/detect-object-injection -- key is date-derived
      trend[key].created++;
      if (isClosedStatus(f.status)) {
        // eslint-disable-next-line security/detect-object-injection -- key is date-derived
        trend[key].closed++;
      }
      if (isActiveStatus(f.status) && trend[key][f.severity] !== undefined) { // eslint-disable-line security/detect-object-injection -- guarded by !== undefined
        // eslint-disable-next-line security/detect-object-injection -- guarded by !== undefined check
        trend[key][f.severity]++;
      }
    });

    const sorted = Object.entries(trend).sort((a, b) => {
      const [mA, yA] = a[0].split(' '), [mB, yB] = b[0].split(' ');
      return new Date(yA, monthNames.indexOf(mA)) - new Date(yB, monthNames.indexOf(mB));
    });

    res.status(200).json({ success: true, data: sorted.map(([label, data]) => ({ label, ...data })) });
  } catch (error) {
    next(error);
  }
};

exports.getProjectPerformance = async (req, res, next) => {
  try {
    const projectFilter = buildProjectFilter(req);

    const projects = await Project.find(projectFilter)
      .populate('manager', 'name email')
      .select('name code status progress statistics manager startDate endDate allocatedUsers');

    const performance = await Promise.all(projects.map(async (p) => {
      const activeFilter = { project: p._id, deletedAt: null, status: { $in: ACTIVE_SEVERITY_STATUSES } };
      const totalOpen = await Finding.countDocuments({ project: p._id, deletedAt: null });
      const critical = await Finding.countDocuments({ ...activeFilter, severity: 'critical' });
      const high = await Finding.countDocuments({ ...activeFilter, severity: 'high' });
      const medium = await Finding.countDocuments({ ...activeFilter, severity: 'medium' });
      const low = await Finding.countDocuments({ ...activeFilter, severity: 'low' });
      const closedFindings = await Finding.countDocuments({ project: p._id, deletedAt: null, status: { $in: CLOSED_SEVERITY_STATUSES } });
      return {
        id: p._id,
        name: p.name, code: p.code, status: p.status, progress: p.progress,
        manager: p.manager?.name || 'Unassigned', statistics: p.statistics,
        allocatedUsers: (p.allocatedUsers || []).length,
        daysSinceStart: Math.floor((Date.now() - new Date(p.startDate)) / (1000 * 60 * 60 * 24)),
        total: totalOpen,
        critical, high, medium, low,
        resolved: closedFindings
      };
    }));

    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    next(error);
  }
};

exports.getTeamPerformance = async (req, res, next) => {
  try {
    if (!['admin', 'vapt_analyst', 'vapt_tl'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access team analytics' });
    }

    const users = await User.find({
      isActive: true, deletedAt: null,
      $or: [{ allocatedProjects: { $exists: true, $ne: [] } }, { invitedProjects: { $exists: true, $ne: [] } }]
    }).select('name email role allocatedProjects invitedProjects');

    const performance = await Promise.all(
      users.map(async (user) => {
        const userProjIds = [...(user.allocatedProjects || []), ...(user.invitedProjects || [])];
        const assignedFindings = await Finding.countDocuments({ assignee: user._id, deletedAt: null, project: { $in: userProjIds } });
        const closedFindings = await Finding.countDocuments({ assignee: user._id, status: { $in: CLOSED_SEVERITY_STATUSES }, deletedAt: null });
        const criticalFindings = await Finding.countDocuments({
          assignee: user._id, severity: 'critical',
          status: { $in: ACTIVE_SEVERITY_STATUSES }, deletedAt: null
        });
        const overdueFindings = await Finding.countDocuments({
          assignee: user._id, status: { $in: ACTIVE_SEVERITY_STATUSES },
          dueDate: { $lt: new Date() }, deletedAt: null
        });
        return {
          user: { id: user._id, name: user.name, email: user.email, role: user.role, allocatedProjects: userProjIds.length },
          findings: { assigned: assignedFindings, closed: closedFindings, critical: criticalFindings, overdue: overdueFindings, closureRate: assignedFindings > 0 ? Math.round((closedFindings / assignedFindings) * 100) : 0 }
        };
      })
    );

    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    next(error);
  }
};

exports.getAdvancedAnalytics = async (req, res, next) => {
  try {
    const findingFilter = buildFindingFilter(req);
    const projectFilter = buildProjectFilter(req);

    const activeFilter = { ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES } };

    const severityDist = await Finding.aggregate([
      { $match: activeFilter },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const statusDist = await Finding.aggregate([
      { $match: findingFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const findingsForTrend = await Finding.find({ ...findingFilter, createdAt: { $gte: sixMonthsAgo } });
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = {};
    findingsForTrend.forEach(f => {
      const d = new Date(f.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!trendMap[key]) { // eslint-disable-line security/detect-object-injection -- key is date-derived
        trendMap[key] = { created: 0, closed: 0, critical: 0, high: 0, medium: 0, low: 0 }; // eslint-disable-line security/detect-object-injection -- key is date-derived
      }
      // eslint-disable-next-line security/detect-object-injection -- key is date-derived
      trendMap[key].created++;
      const sev = String(f.severity || '').toLowerCase();
      if (isClosedStatus(f.status)) {
        // eslint-disable-next-line security/detect-object-injection -- key is date-derived
        trendMap[key].closed++;
      }
      if (isActiveStatus(f.status) && ['critical', 'high', 'medium', 'low'].includes(sev)) {
        // eslint-disable-next-line security/detect-object-injection -- guarded by whitelist includes() check
        trendMap[key][sev]++;
      }
    });
    const monthlyTrend = Object.entries(trendMap)
      .sort((a, b) => {
        const [mA, yA] = a[0].split(' '), [mB, yB] = b[0].split(' ');
        return new Date(yA, monthNames.indexOf(mA)) - new Date(yB, monthNames.indexOf(mB));
      })
      .map(([label, data]) => ({ label, ...data }));

    const projectStats = { total: await Project.countDocuments(projectFilter) };

    const recentFindings = await Finding.find(activeFilter)
      .populate('project', 'name code').populate('assignee', 'name email')
      .sort('-createdAt').limit(10);

    const totalForSla = await Finding.countDocuments(findingFilter);
    const activeForSla = await Finding.countDocuments({
      ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES }
    });
    const overDueFindings = await Finding.countDocuments({
      ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES },
      sla_deadline: { $lt: new Date() }
    });
    const breachedFindings = await Finding.countDocuments({
      ...findingFilter, status: { $in: ACTIVE_SEVERITY_STATUSES },
      sla_status: 'breached'
    });

    // Compliance rate = (total - breached - overdue) / total * 100
    const complianceRate = totalForSla > 0
      ? Math.round(((totalForSla - breachedFindings - overDueFindings) / totalForSla) * 100)
      : 100;

    res.status(200).json({
      success: true,
      data: {
        severityDistribution: severityDist.reduce((a, i) => ({ ...a, [i._id]: i.count }), { critical: 0, high: 0, medium: 0, low: 0, info: 0 }),
        statusDistribution: statusDist.reduce((a, i) => ({ ...a, [i._id]: i.count }), {}),
        monthlyTrend,
        projectStats,
        recentFindings,
        slaStats: {
          total: totalForSla,
          active: activeForSla,
          overdue: overDueFindings,
          breached: breachedFindings,
          compliant: Math.max(0, activeForSla - overDueFindings - breachedFindings),
          complianceRate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getFindingAgeDistribution = async (req, res, next) => {
  try {
    const query = buildFindingFilter(req);
    const findings = await Finding.find(query).select('createdAt status closedAt').lean();

    const buckets = [
      { bucket: '0-7d', open: 0, closed: 0 },
      { bucket: '8-15d', open: 0, closed: 0 },
      { bucket: '16-30d', open: 0, closed: 0 },
      { bucket: '31-60d', open: 0, closed: 0 },
      { bucket: '60d+', open: 0, closed: 0 },
    ];
    const now = Date.now();

    findings.forEach((f) => {
      const created = f.createdAt ? new Date(f.createdAt).getTime() : null;
      if (!created) return;
      const isClosed = isClosedStatus(f.status);
      const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      const idx = ageDays <= 7 ? 0 : ageDays <= 15 ? 1 : ageDays <= 30 ? 2 : ageDays <= 60 ? 3 : 4;
      // eslint-disable-next-line security/detect-object-injection -- idx is numeric (0-4), key is literal 'closed'/'open'
      buckets[idx][isClosed ? 'closed' : 'open']++;
    });

    res.status(200).json({ success: true, data: buckets });
  } catch (error) {
    next(error);
  }
};

exports.getSLACompliance = async (req, res, next) => {
  try {
    const query = buildFindingFilter(req);

    const findings = await Finding.find({
      ...query, status: { $in: ACTIVE_SEVERITY_STATUSES }
    }).populate('project', 'name code sla');

    const compliance = { total: findings.length, onTrack: 0, atRisk: 0, overdue: 0, breached: 0 };

    findings.forEach(finding => {
      const deadline = finding.sla_deadline ? new Date(finding.sla_deadline) : (finding.dueDate ? new Date(finding.dueDate) : null);
      if (!deadline) { compliance.onTrack++; return; }
      const now = Date.now(), dl = deadline.getTime();
      if (dl < now) compliance.breached++;
      else if (dl - now <= 24 * 60 * 60 * 1000) compliance.overdue++;
      else if (dl - now <= 3 * 24 * 60 * 60 * 1000) compliance.atRisk++;
      else compliance.onTrack++;
    });

    res.status(200).json({ success: true, data: compliance });
  } catch (error) {
    next(error);
  }
};
