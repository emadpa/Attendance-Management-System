# Attendance Management System - Copilot Instructions

## Project Architecture

This is a **modular 4-service architecture**:

- **`adminview/`** - React + Vite admin portal (organization management, employee oversight, leave approvals)
- **`empview/`** - React + Vite employee portal (attendance marking, leave requests, schedule viewing)
- **`backend/`** - Node.js/Express API server with Prisma ORM (PostgreSQL)
- **`modelserver/`** - Python server for facial recognition & biometric verification

### Key Design Patterns

**Frontend (React + Vite):**
- **Auth via Context API**: `AuthProvider` in `components/shared/AuthContext.jsx` manages login state and localStorage persistence
- **Layout Pattern**: Main `AdminLayout`/`Header` components wrap page content with navigation and global actions (see [AdminLayout.jsx](adminview/src/components/Admin/AdminLayout.jsx))
- **Shared Components**: Reusable UI components in `components/shared/` (Input, Modal, StatCard, Toggle, Toast, Textarea, Badge)
- **Routing**: React Router with `ProtectedRoute` wrappers that require auth before dashboard access
- **Styling**: Tailwind CSS (v4) + Framer Motion for animations, `cn()` utility for class merging

**Backend (Node/Express):**
- **Prisma ORM**: Database-first development via [schema.prisma](backend/prisma/schema.prisma)
- **API Routes**: RESTful `/api/admin/*` and `/api/employee/*` patterns
- **Auth**: Passport.js JWT strategy extracting bearer tokens from Authorization header
- **CORS**: Pre-configured for local dev (ports 5173-5174), whitelist new frontend ports here
- **Database Models**: Core entities are User, Organization, Department, Attendance, LeaveRequest, Schedule, Notification with proper relationships and enums (AttendanceStatus, LeaveStatus, Role)

## Development Workflow

### Start All Services Locally

From project root:
```bash
# Terminal 1: Backend (auto-reloads with nodemon)
cd backend && npm start  # Runs on :5000

# Terminal 2: Admin Frontend
cd adminview && npm run dev  # Runs on :5173

# Terminal 3: Employee Frontend  
cd empview && npm run dev  # Runs on :5174

# Terminal 4: Model Server
cd modelserver && python manage.py runserver  # Runs on :8000
```

### Database Management

```bash
cd backend
npm run db:generate  # Generate Prisma client after schema changes
npm run db:push     # Push schema changes to PostgreSQL
```

## Critical Development Patterns

### Frontend API Integration
- Use `axios` for HTTP requests (imported in [empview/src/components/api.js](empview/src/components/api.js))
- API base URL: `http://localhost:5000/api` for admin, may differ for employee routes
- Always handle `error.response?.data` structure in catch blocks (see verifyAttendance pattern)
- Pass auth tokens in `Authorization: Bearer <token>` header (Passport.js extracts via JWT strategy)

### Backend Route Structure
- Routes are modular in `routes/` folder (admin.js, employee.js) and mounted at `/api/*`
- Controllers should use Prisma for all DB operations
- Fetch related models with `include:` to avoid N+1 queries (see admin overview endpoint parallel Promise.all pattern)
- Enums from schema control attendance/leave/notification types - keep schema as source of truth

### React Component Conventions
- Functional components with hooks only
- Page components wrap with layout (e.g., `<AdminLayout title="..." children={...}>`)
- State lifted to nearest common parent or global Context for cross-tab needs
- Share UI patterns: e.g., `<StatCard>` for KPIs, `<Modal>` for confirmations

### Authentication Flow
- **Backend**: POST login endpoint validates credentials, returns JWT token
- **Frontend**: Login saves user object and token to localStorage after successful auth
- **Protected Routes**: Check `useAuth().user` in component; if null, redirect to /login
- Current admin auth is mock (localStorage only) - integrate with real backend endpoint for production

## File Organization Reference

- `adminview/src/components/Admin/*` - Admin-specific pages (Employees, Leaves, Schedules, Overview, etc.)
- `empview/src/components/*` - Employee pages (Dashboard, AttendanceMarking, LoginPage)
- `backend/routes/admin.js` - Admin API endpoints (overview, employees, leaves, schedules, notifications)
- `backend/prisma/schema.prisma` - Database schema with all entities and enums
- `backend/configs/passport.js` - JWT authentication strategy
- Build outputs: `adminview/dist/`, `empview/dist/`

## Cross-Service Communication

- **Frontend → Backend**: HTTP requests to `/api/*` endpoints
- **Frontend → ModelServer**: `http://localhost:8000/api/verify-attendance` for biometric verification (see [empview api.js](empview/src/components/api.js))
- **Backend → Database**: Prisma client queries to PostgreSQL
- No direct frontend-to-model-server calls; route through backend API

## Key Environment Variables

Backend requires: `DATABASE_URL`, `DIRECT_URL` (PostgreSQL connections), `JWT_SECRET`, mail config (see `configs/mail.js`)

Frontend uses hardcoded URLs for dev (localhost:5000, localhost:8000) - create `.env.local` files for production URLs.

## Testing & Linting

```bash
npm run lint      # Run ESLint in either frontend
npm run build     # Vite build for production
npm run preview   # Preview production build locally
```

## Important Notes

1. **Geofencing & Biometrics**: Organization settings control whether location/facial recognition is enforced - check schema `requireBiometrics`, `strictGeofence`, `allowedRadiusInMeters`
2. **Attendance Gates**: Model server implements multi-gate verification (location, biometrics, etc.) - see [modelserver/check_system.py](modelserver/check_system.py)
3. **Attendance Status Types**: Use exact enum values (PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE, MISSED_PUNCH) in queries
4. **Date Handling**: Backend converts dates to UTC midnight for `@db.Date` accuracy (see admin overview endpoint pattern)
5. **Real-time Features**: Consider WebSocket for attendance notifications and live status updates (not yet implemented)
