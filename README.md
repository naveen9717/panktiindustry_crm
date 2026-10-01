# CRM - Customer Relationship Management

A modern, production-ready CRM web application built with Next.js 16, TypeScript, and PostgreSQL.

## Features

- **Role-Based Access Control (RBAC)**: Master Admin and Team Member roles
- **Customer/Lead Management**: Full CRUD with assignment, status tracking, and remarks
- **Payment Tracking**: Record and monitor customer payments
- **Dashboard Analytics**: KPI cards, charts, and performance metrics
- **CSV Import/Export**: Bulk import and export customer data
- **Activity Logging**: Audit trail for all actions
- **Secure Authentication**: JWT-based sessions with HTTP-only cookies
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom shadcn-style components
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Notifications**: Sonner

## Getting Started

### Prerequisites

- Node.js 20.9+
- SQLite (for development) or PostgreSQL (for production)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crm_panktiindustry
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your settings:
```env
# For development (SQLite):
DATABASE_URL="file:./dev.db"

# For production (PostgreSQL):
# DATABASE_URL="postgresql://user:password@host:5432/crm_panktiindustry"

AUTH_SECRET="your-super-secret-key-change-this-in-production"
```

5. Set up the database:
```bash
npm run db:setup
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

### Development Credentials

> **WARNING**: These are development-only credentials. Do not use in production.

| Role | Email | Password |
|------|-------|----------|
| Master Admin | panktiindustry@gmail.com | Panktiindustry@123456 |
| Team Member | mike@example.com | Member@123456 |

## Database Schema

### User
- id, firstName, lastName, email, passwordHash, phone
- role (MASTER_ADMIN, TEAM_MEMBER)
- status (ACTIVE, INACTIVE, DELETED)
- profileImage, lastLoginAt, createdAt, updatedAt

### Customer
- id, name, email, phone, address, state, city
- leadStatus (NEW, CONTACTED, FOLLOW_UP, INTERESTED, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, CONVERTED, LOST, NOT_INTERESTED)
- source, remarks, assignedTeamMemberId, updatedById
- createdAt, updatedAt

### Payment
- id, customerId, teamMemberId, amount
- paymentDate, paymentMode, paymentStatus
- transactionId, remarks, createdAt, updatedAt

### ActivityLog
- id, userId, action, entityType, entityId
- description, ipAddress, createdAt

## CSV Import

The application supports importing leads from CSV files. The expected format is:

```csv
name,email,phone,address,state,city,leadStatus,remarks,assignedTeamMember
John Doe,john@example.com,9876543210,123 Main St,Mumbai,Maharashtra,NEW,Interested in services,Mike
```

### Import Process
1. Upload CSV file
2. Validate CSV data
3. Show preview with valid/invalid rows
4. Display validation errors
5. Confirm import
6. Insert valid records
7. Display import summary

### Duplicate Detection
- Duplicate detection is enabled by default
- Uses email and phone as duplicate identifiers
- Duplicate rows are skipped during import

## API Routes

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/change-password` - Change password

### Customers
- `GET /api/customers` - List customers (with filters)
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer details
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer
- `POST /api/customers/import` - Import customers from CSV
- `GET /api/customers/export` - Export customers to CSV

### Team Members
- `GET /api/team-members` - List team members
- `POST /api/team-members` - Create team member
- `PUT /api/team-members/[id]` - Update team member
- `DELETE /api/team-members/[id]` - Delete/deactivate team member

### Payments
- `GET /api/payments` - List payments (with filters)
- `POST /api/payments` - Create payment
- `PUT /api/payments/[id]` - Update payment
- `DELETE /api/payments/[id]` - Delete payment

### Settings
- `PUT /api/settings/profile` - Update profile

## Project Structure

```
src/
  app/
    (auth)/           # Auth pages (login, forgot-password, reset-password)
    (admin)/          # Admin pages
    (team)/           # Team member pages
    api/              # API route handlers
  components/
    auth/             # Auth form components
    customers/        # Customer components
    dashboard/        # Dashboard components
    layout/           # Layout components
    payments/         # Payment components
    settings/         # Settings components
    tables/           # Table components
    team-members/     # Team member components
    ui/               # UI primitives
  lib/
    auth/             # Auth utilities
    db/               # Database client
    permissions/      # RBAC permissions
    services/         # Business logic
    utils/            # Utility functions
    validations/      # Zod schemas
prisma/
  schema.prisma       # Database schema
  seed.ts             # Seed data
```

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT-based session management
- HTTP-only secure cookies
- Server-side authorization on all API routes
- Role-based route protection via proxy
- Input validation with Zod
- SQL injection protection via Prisma
- IDOR protection (team members can only access their own data)
- CSRF protection via SameSite cookies

## Cloudflare Deployment

This application is designed to be deployable on Cloudflare Workers with some adjustments:

1. Use Prisma Accelerate or a driver adapter for Cloudflare
2. Replace PostgreSQL with Cloudflare D1 or an external database
3. Use Cloudflare KV for session storage (or keep using cookies)
4. Build with `npm run build` and deploy with Wrangler

## License

MIT
