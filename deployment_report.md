# eKavach VAPT Role Enhancement — Deployment Report

**Date:** 2026-06-11  
**Server:** `your-domain.com` (localhost, production mode)  
**Backend:** Node.js Express on port 5000 (PM2-managed → process restarted)  
**Frontend:** React SPA served by Express static from `frontend/build/`  
**Database:** MongoDB `vapt_tracker` on localhost  

---

## Changes Deployed

### Backend (18 files modified)

| File | Change |
|------|--------|
| `config/permissions.js` | Added `USERS_CREATE`, `USERS_DELETE` permissions; assigned all VAPT perms to both `vapt_analyst` and `vapt_tl` |
| `middleware/auth.js` | `ROLE_ALIASES` maps `vapt_tl→vapt_analyst`; `checkOwnership`, `checkProjectAccess` include `vapt_tl` |
| `routes/users.js` | POST/DELETE include `vapt_analyst` + `vapt_tl` |
| `routes/mis.js` | Admin endpoints include `vapt_analyst` + `vapt_tl` |
| `routes/vaptCalendar.js` | `/recalculate` includes `vapt_tl` |
| `routes/auth.js` | `/admin-set-password` includes `vapt_tl` |
| `controllers/userController.js` | VAPT cannot create/update/delete Admin/Super Admin |
| `controllers/authController.js` | VAPT cannot reset Admin/Super Admin passwords |
| `controllers/misController.js` | `isGlobalViewer` includes both VAPT roles; update/delete owner-scoped |
| `controllers/recycleBinController.js` | `requireRecycleBinAccess` includes `vapt_tl` |
| `controllers/notificationController.js` | `isAdmin` checks include VAPT (3 functions) |
| `controllers/requestController.js` | Admin user lookup includes `vapt_tl` |
| `controllers/taskController.js` | Privileged roles + escalation notification include VAPT |
| `controllers/projectController.js` | View/update/delete access includes `vapt_tl` |
| `controllers/analyticsController.js` | User counts + team performance include `vapt_tl` |
| `controllers/reportController.js` | Update access includes `vapt_tl` |
| `controllers/findingController.js` | Delete access includes `vapt_tl` |

### Frontend (8 files modified)

| File | Change |
|------|--------|
| `App.js` | ProtectedRoute for `/admin/mis`, `/all-user-tasks` includes VAPT roles |
| `Layout.js` | Sidebar menu items include VAPT roles (All Users MIS, All User Tasks) |
| `AuthContext.js` | `canDeleteUser` allows VAPT to delete non-admin users |
| `Users.js` | Role definitions, edit/delete guards, ALLOWED_ROLES for VAPT |
| `AllUserTasks.js` | Assignable users + assign-to dropdown for VAPT |
| `MyTasks.js` | Assignable users (non-admin scope) + assign-to dropdown for VAPT |
| `Dashboard.js` | `isAdmin` includes VAPT — full dashboard visibility |

---

## Permission Enforcement (Server-Side)

| Restriction | Enforced In |
|-------------|-------------|
| VAPT cannot create Admin/SA accounts | `userController.createUser` |
| VAPT cannot update Admin/SA accounts | `userController.updateUser` |
| VAPT cannot delete Admin/SA accounts | `userController.deleteUser` |
| VAPT cannot reset Admin/SA passwords | `authController.adminSetPassword` |
| VAPT cannot edit others' MIS entries | `misController.updateEntry` (owner + admin only) |
| VAPT cannot delete others' MIS entries | `misController.deleteEntry` (owner + admin only) |
| Private notes scoped to owner/shared | Note controller (pre-existing, no changes needed) |
| Audit log view/search/export | Route-level `authorize` (pre-existing, no changes needed) |
| Cache clear = admin only | `system.js` route (pre-existing, no changes needed) |

---

## Permission Matrix

See `permission_matrix.csv` for the full × module matrix.

---

## Backup

- **MongoDB dump:** `storage/backups/ekavach_backup_20260611_111029/` (19 collections)
- **Storage files:** Included in backup directory
- **Retention:** Manual cleanup required

---

## Test Accounts Created

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `CHANGE_SUPER_ADMIN_PASSWORD` |
| VAPT Analyst | `vapt.analyst@example.com` | `CHANGE_TEST_PASSWORD` |
| VAPT TL | `vapt.tl@example.com` | `CHANGE_TEST_PASSWORD` |
| Project Manager | `pm@example.com` | `CHANGE_TEST_PASSWORD` |
| Developer | `developer@example.com` | `CHANGE_TEST_PASSWORD` |
| Business Analyst | `ba@example.com` | `CHANGE_TEST_PASSWORD` |
| Read Only (Auditor/Client) | `readonly@example.com` | `CHANGE_TEST_PASSWORD` |

---

## Validation Results (12 Tests)

| # | Test | Result |
|---|------|--------|
| 1 | VAPT creating Admin account | ❌ Blocked ✓ |
| 2 | VAPT deleting Admin account | ❌ Blocked ✓ |
| 3 | VAPT viewing all users | ✅ Allowed ✓ |
| 4 | VAPT deleting non-Admin user | ✅ Allowed ✓ |
| 5 | VAPT viewing all MIS entries | ✅ Allowed ✓ |
| 6 | VAPT viewing audit logs | ✅ Allowed ✓ |
| 7 | VAPT updating Admin account | ❌ Blocked ✓ |
| 8 | VAPT resetting Admin password | ❌ Blocked ✓ |
| 9 | VAPT updating non-Admin user | ✅ Allowed ✓ |
| 10 | VAPT editing others' MIS entry | ❌ Blocked (owner-scoped) ✓ |
| 11 | Read-Only accessing admin endpoints | ❌ Blocked ✓ |
| 12 | VAPT clearing system cache | ❌ Blocked (admin-only) ✓ |

---

## Notes

- Nginx is installed but not currently running. The app is accessible directly on port 5000.
- Previous test accounts existed before this deployment. New test accounts with known passwords (`CHANGE_TEST_PASSWORD`) were created fresh.
- vapt_tl is aliased to vapt_analyst via `ROLE_ALIASES` in `middleware/auth.js` — any route authorizing `vapt_analyst` automatically matches `vapt_tl`.
- The two roles share identical permissions; the distinction exists for UI labeling only.
