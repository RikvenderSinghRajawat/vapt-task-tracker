# Requirements Document - MIS Tracker

## Introduction
The MIS (Daily Work Log / Activity Tracker) feature provides a professional way for all eKavach users (Admin, VAPT, PM, Developers) to log their daily activities. This is distinct from task management; it focuses on recording actual time spent and effort distribution for productivity and audit purposes.

## Requirements

### 1. User Access & Personal MIS Dashboard
**User Story:** As a user, I want to access my personal MIS dashboard so that I can monitor my productivity and effort.

#### Acceptance Criteria
1. WHERE the sidebar menu is located, a "My MIS" link SHALL be visible to all authenticated users.
2. WHEN a user opens "My MIS", the system SHALL display a summary dashboard containing:
    - Today's and weekly entries count.
    - Total hours logged this week.
    - Current active projects count.
    - Most used task category (Activity Type).
    - Average productivity score (based on hours).
    - Timestamp of the last update.
3. IF the user is an Admin, they SHALL also see an "All Users MIS" sidebar option.

### 2. MIS Entry Management
**User Story:** As a user, I want to record my daily work activities with specific details so that my effort is accurately tracked.

#### Acceptance Criteria
1. WHEN creating an entry, the Title field SHALL be mandatory.
2. WHILE filling the entry form, the system SHALL provide optional fields: Project selection, Related Finding, Task link, Activity Type, Description, Time range, Work Status, Progress (0-100%), Blockers, Dependencies, Notes, Work Location (Office/Remote/Hybrid), Priority, and Tags.
3. WHEN the user provides Start and End times, the system SHALL auto-calculate the duration.
4. Activity Type SHALL include options: Development, VAPT, Code Review, Documentation, Meeting, Testing, Research, Deployment, Bug Fix, Remediation, Analysis, Support, Training, and Other.
5. Work Status SHALL include: Not Started, Started, In Progress, Paused, Waiting, Under Review, Completed, Blocked, Cancelled.

### 3. Personal History & UI/UX
**User Story:** As a user, I want to view and filter my MIS history in a professional timeline view.

#### Acceptance Criteria
1. WHERE the history is displayed, the system SHALL use a timeline card UI with glassmorphism/premium design effects.
2. WHEN viewing history, the user SHALL only see their own records.
3. THE system SHALL provide filters for: Date range, Project, Status, Activity Type, Priority, and Tags.
4. THE system SHALL support grouping by: Day, Week, and Month.
5. THE system SHALL support sorting by: Newest, Oldest, Duration, Project, and Status.

### 4. Admin Overview & User Detail
**User Story:** As an admin, I want to monitor the team's activity so that I can ensure workload balance and project progress.

#### Acceptance Criteria
1. IF the user is an Admin, the system SHALL provide a table of all users with metrics: Name, Email, Role, Department, Today's/Weekly entries, Total hours, and Last update.
2. WHEN an Admin clicks on a user, the system SHALL display a detailed view of that specific user's MIS history and analytics.
3. THE user detail view SHALL include: Timeline view, Projects worked, Hours distribution (charts), Activity trends, and Work categories breakdown.
4. Admin SHALL NOT be able to modify or delete other users' MIS entries.

### 5. Admin Analytics
**User Story:** As an admin, I want to see visual representations of team effort distribution.

#### Acceptance Criteria
1. THE system SHALL provide responsive charts for:
    - Hours by Project (Pie/Bar).
    - Hours by User (Bar).
    - Activity Type Distribution (Pie/Bar).
    - Daily Productivity Trend (Line/Area).
    - Weekly/Monthly workload (Bar/Line).
    - Top Active Users.

### 6. Data Retention & Cleanup
**User Story:** As a system administrator, I want to keep the database optimized by removing old logs.

#### Acceptance Criteria
1. THE system SHALL store MIS records for a maximum of 12 months.
2. WHEN a record is older than 12 months, the system SHALL automatically delete it via a background cleanup job.

### 7. Security & Integrity
**User Story:** As a user, I want my activity logs to be secure and private from other non-admin users.

#### Acceptance Criteria
1. IF a user is not an Admin, they SHALL NOT access entries belonging to other users.
2. THE system SHALL validate all API requests to ensure users only manipulate their own records.