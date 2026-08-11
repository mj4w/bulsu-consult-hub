# Student Consultation Scheduler

A web-based consultation scheduler for Bulacan State University students and instructors. The system allows students to request consultation appointments and enables instructors to publish availability, review requests, approve or decline appointments, and keep consultation records organized.

Built with **Next.js**, **Supabase**, **Tailwind CSS 4**, and a responsive glassmorphism-inspired interface.

## Overview

The project supports two main users:

- **Students** request consultations for research, grades, projects, or other academic concerns.
- **Instructors** manage consultation availability and review student requests.

The app is designed around the actual consultation workflow:

1. Instructor publishes available consultation windows.
2. Student selects a preferred time within an available window.
3. Student submits a focused consultation request.
4. Instructor approves or declines the request.
5. Approved slots become occupied and are removed from student availability.
6. Both dashboards update through realtime sync.

## Tech Stack

- **Next.js 16** with App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase Auth**
- **Supabase Postgres**
- **Supabase Realtime**
- **Framer Motion**
- **Lucide React**
- **Vercel deployment**

## Main Features

### Landing Page

- Informative overview for both students and instructors
- Responsive dark/light mode
- Animated workflow section
- Website app icon
- Microsoft sign-in call-to-action

### Authentication

- Microsoft sign-in for institutional users
- Student email restriction using `@ms.bulsu.edu.ph`
- Role-aware dashboard routing
- Instructor test portal support for non-Microsoft testing accounts

### Student Dashboard

- Personalized welcome using captured display name
- Required student profile setup
- Student number and email are locked from editing
- Calendar-based consultation availability
- Program-scoped availability filtering
- Request appointment from available instructor windows
- Pending and approved requests displayed directly on the calendar
- Approved consultation details modal
- Student can cancel or request schedule changes when allowed
- Past approved consultations are view-only
- Consultation history page with search
- Notification badge and realtime updates

### Instructor Dashboard

- Instructor-specific dashboard
- Calendar-style availability management
- Create availability by selecting time ranges
- Supports consultation format:
  - Online
  - F2F
  - Both
- Program scope filtering
- Request review page separated into pending and reviewed sections
- Approve or decline student requests
- Undo-safe interaction pattern for approval actions
- Approved consultations appear in instructor calendar
- Reschedule or cancel approved upcoming consultations
- Past approved consultations are view-only
- Realtime dashboard updates

### Scheduling Rules

- Approved consultations occupy their selected time slot.
- Other students no longer see occupied time as available.
- Multiple instructors can have availability on the same date.
- Student calendar supports multiple instructor schedules on the same day.
- Instructors are protected from overlapping approved consultation schedules.
- Student cancellation/editing is restricted near the consultation date.

## Project Structure

```txt
src/
  app/
    auth/
    dashboard/
      instructor/
      student/
    instructor-portal/
    onboarding/
    page.tsx
    layout.tsx
    icon.svg
  components/
    auth/
    brand/
    dashboard/
    landing/
    ui/
  lib/
supabase/
  migrations/
public/
```

## Environment Variables

Create a `.env.local` file from `.env.example`:

```bash
cp .env.example .env.local
```

Required values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
ENABLE_INSTRUCTOR_TEST_PORTAL=false
```

For local instructor testing, you can temporarily set:

```env
ENABLE_INSTRUCTOR_TEST_PORTAL=true
```

Keep this disabled in production unless the instructor test portal is intentionally allowed.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

If port `3000` is already in use, Next.js may use another port such as `3001`.

## Supabase Setup

This project uses Supabase for:

- Authentication
- User profiles
- Instructor availability
- Consultation requests
- Realtime dashboard updates

Run the SQL migration files inside:

```txt
supabase/migrations/
```

Important migration areas:

- `profiles`
- email domain enforcement
- role inference
- instructor test accounts
- instructor availability
- consultation requests
- realtime publication
- request update/cancel rules
- overlap prevention

If you are applying migrations manually in the Supabase SQL editor, run them in filename order.

## Microsoft Auth Setup

The production and local callback URLs must be configured correctly in both Microsoft Entra and Supabase.

Local callback:

```txt
http://localhost:3000/auth/callback
```

Production callback:

```txt
https://your-vercel-domain.vercel.app/auth/callback
```

In Supabase:

1. Go to **Authentication**.
2. Open **URL Configuration**.
3. Set the correct **Site URL**.
4. Add both local and production callback URLs under **Redirect URLs**.

In Microsoft Entra:

1. Register the app.
2. Use a single-tenant setup if only BulSU users should sign in.
3. Add the Supabase auth callback URL:

```txt
https://your-project-ref.supabase.co/auth/v1/callback
```

4. Copy the Microsoft client ID and secret into the Supabase Microsoft provider settings.

## Vercel Deployment

Before deploying:

1. Push the latest code to GitHub.
2. Connect the repository to Vercel.
3. Add the same environment variables in Vercel.
4. Set Supabase production redirect URLs.
5. Set Microsoft Entra redirect URLs.
6. Deploy.

Recommended production setting:

```env
ENABLE_INSTRUCTOR_TEST_PORTAL=false
```

## Useful Scripts

Run lint:

```bash
npm run lint
```

Run production build:

```bash
npm run build
```

Start production server locally after build:

```bash
npm run start
```

## Common Troubleshooting

### Redirect goes back to `/` with a `?code=...`

Usually caused by mismatched redirect URLs.

Check:

- Supabase Site URL
- Supabase Redirect URLs
- Microsoft Entra redirect URI
- Vercel production URL

### `email rate limit exceeded`

This usually happens when testing email/password authentication repeatedly in Supabase. Wait for the limit to reset or use Microsoft sign-in for student accounts.

### Realtime does not update immediately

Check that the relevant tables are added to Supabase realtime publication and that the client has permission to read the updated rows through RLS policies.

### Instructor test portal should not be public

Set:

```env
ENABLE_INSTRUCTOR_TEST_PORTAL=false
```

in Vercel production.

## Current Design Direction

The UI uses a professional academic scheduler style:

- Dimmed light mode to reduce eye strain
- Dark mode support
- Glassmorphism cards
- Calendar-first interaction
- Role-specific dashboards
- Minimal icons for Online, F2F, and Both formats
- Responsive layouts for desktop and mobile

## Future Improvements

Potential enhancements:

- Manual meeting link field for Online consultations
- Optional automatic Google Meet or Zoom generation
- Email notifications
- Calendar export
- Recurring instructor availability
- Admin dashboard
- Analytics for consultation frequency and instructor workload

## Copyright

© 2026 Student Consultation Scheduler. All rights reserved.
