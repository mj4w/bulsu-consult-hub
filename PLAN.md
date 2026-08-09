# Student Consultation Scheduler

## 1. Project Goal

Build a responsive consultation booking platform for Bulacan State University users using:

- Next.js
- Supabase
- Glassmorphism UI
- Email authentication restricted to `@ms.bulsu.edu.ph`
- Student and instructor dashboards
- Appointment approval, cancellation, rescheduling, and notifications

The system should work smoothly on desktop, tablet, and mobile devices.

## 2. User Roles

### Student

Students can:

- Register or sign in using a `@ms.bulsu.edu.ph` email
- Complete their profile with:
  - Full name
  - Program
  - Section
  - Phone number
- Browse instructor availability
- Select a consultation concern:
  - Research
  - Grades
  - Projects
  - Others
- Book an appointment
- View appointment status:
  - Pending
  - Approved
  - Declined
  - Cancelled
  - Rescheduling requested
  - Completed
- Cancel or request rescheduling
- Receive email and in-app notifications

### Instructor

Instructors can:

- Sign in using a `@ms.bulsu.edu.ph` email
- Create and manage availability schedules
- Set consultation format:
  - Face-to-face
  - Online
  - Both
- Limit availability to specific programs
- Review booking requests
- Approve or decline appointments
- Add remarks or meeting details
- View upcoming consultations
- Receive cancellation and rescheduling notifications

## 3. Core Appointment Workflow

1. The student opens the instructor directory.
2. The student selects an instructor.
3. The student views available dates and time slots.
4. The student selects a consultation concern.
5. The student confirms their personal information.
6. The appointment is created with `Pending` status.
7. The instructor receives a notification.
8. The instructor approves or declines the request.
9. The student receives an email and in-app notification.

### Example scenario

Student 1 requests a **Research** consultation with Instructor 1 on **August 10, 2026, from 5:00 PM to 8:00 PM**. Instructor 1 can approve or decline the request.

## 4. Cancellation and Rescheduling Rules

- Students may cancel at least one day before the appointment.
- Students may request rescheduling at least one day before the appointment.
- Cancellation and rescheduling controls are disabled within the restricted period.
- The instructor receives a notification when a student cancels.
- The instructor receives a notification when a student requests rescheduling.
- Rescheduling creates a request requiring instructor approval.
- The original appointment remains traceable for audit purposes.
- The deadline should be configurable instead of permanently hardcoded.

## 5. Suggested Database Structure

### `profiles`

- `id`
- `user_id`
- `role`
- `full_name`
- `email`
- `program`
- `section`
- `phone_number`
- `created_at`
- `updated_at`

### `instructor_availability`

- `id`
- `instructor_id`
- `start_datetime`
- `end_datetime`
- `consultation_mode`
- `is_active`
- `created_at`

### `availability_programs`

- `id`
- `availability_id`
- `program`

### `appointments`

- `id`
- `student_id`
- `instructor_id`
- `availability_id`
- `concern_type`
- `concern_details`
- `status`
- `requested_start`
- `requested_end`
- `consultation_mode`
- `instructor_remarks`
- `meeting_link`
- `location`
- `created_at`
- `updated_at`

### `appointment_history`

- `id`
- `appointment_id`
- `action`
- `performed_by`
- `remarks`
- `created_at`

### `notifications`

- `id`
- `user_id`
- `appointment_id`
- `type`
- `title`
- `message`
- `is_read`
- `created_at`

## 6. Authentication and Security

- Use Supabase Auth.
- Allow only emails ending with `@ms.bulsu.edu.ph`.
- Validate the domain on both client and server.
- Use Supabase Row Level Security policies.
- Students can access only their own appointments.
- Instructors can access only appointments assigned to them.
- Students cannot modify instructor availability.
- Appointment status changes should be logged.
- Protect role-management functions from normal users.

## 7. Main Pages

### Public pages

- Landing page
- Login
- Registration
- Forgot password
- Email verification

### Student pages

- Student dashboard
- Instructor directory
- Instructor profile
- Availability calendar
- Book appointment
- My appointments
- Appointment details
- Notifications
- Profile settings

### Instructor pages

- Instructor dashboard
- Availability management
- Appointment requests
- Appointment calendar
- Appointment details
- Notifications
- Profile settings

## 8. Dashboard Components

### Student dashboard

- Upcoming appointment card
- Pending requests
- Appointment calendar
- Quick booking button
- Recent notifications
- Appointment status summary

### Instructor dashboard

- Pending booking requests
- Today’s consultations
- Upcoming schedule
- Availability creation button
- Approval and decline actions
- Cancellation and rescheduling alerts

## 9. Glassmorphism UI Direction

The interface should use:

- Soft gradient backgrounds
- Frosted glass cards
- Semi-transparent panels
- Backdrop blur
- Subtle borders and shadows
- Rounded corners
- High-contrast text
- Accessible buttons and form controls
- Clear appointment status colors

Suggested colors:

- Blue and violet gradients for the primary theme
- Green for approved appointments
- Yellow for pending requests
- Red for cancelled or declined appointments
- Neutral gray for completed appointments

The design may include light and dark modes.

## 10. Responsive Design

### Mobile

- Stacked dashboard cards
- Bottom navigation or compact sidebar
- Touch-friendly calendar controls
- Full-width booking forms
- Appointment tables converted into cards
- Collapsible filters
- Accessible modal dialogs

### Desktop

- Sidebar navigation
- Multi-column dashboards
- Calendar and appointment list displayed side by side
- Larger glass panels and data tables

## 11. Notifications

### In-app notifications

Notify users when:

- An appointment is submitted
- An appointment is approved
- An appointment is declined
- An appointment is cancelled
- A rescheduling request is submitted
- A rescheduling request is approved or declined
- An appointment is approaching

### Email notifications

Send emails for:

- Approved appointments
- Declined appointments
- Cancellations
- Rescheduling requests
- Rescheduling decisions
- Optional appointment reminders

Supabase Edge Functions or a transactional email provider can handle email delivery.

## 12. Recommended Development Phases

### Phase 1: Project setup

- Initialize the Next.js project.
- Configure Supabase.
- Configure TypeScript.
- Set up Tailwind CSS and glassmorphism design tokens.
- Establish authentication and environment variables.

### Phase 2: Authentication and profiles

- Implement login and registration.
- Enforce the `@ms.bulsu.edu.ph` domain.
- Create student and instructor profiles.
- Add role-based routing.

### Phase 3: Instructor availability

- Create the availability form.
- Add date and time validation.
- Add consultation modes.
- Add program restrictions.
- Display schedules in a calendar.

### Phase 4: Student booking

- Build the instructor directory.
- Display filtered availability.
- Create the booking form.
- Add concern categories.
- Prevent conflicting bookings.

### Phase 5: Approval system

- Add the instructor request dashboard.
- Implement approve and decline actions.
- Add instructor remarks.
- Update student appointment statuses.

### Phase 6: Cancellation and rescheduling

- Add deadline validation.
- Disable actions when too late.
- Create the rescheduling request flow.
- Notify instructors and students.
- Add appointment history.

### Phase 7: Notifications

- Implement in-app notifications.
- Configure email notifications.
- Add optional appointment reminders.

### Phase 8: UI refinement

- Improve animations and transitions.
- Optimize mobile layouts.
- Add loading, empty, and error states.
- Improve accessibility.
- Add dark mode if desired.

### Phase 9: Testing and deployment

- Test authentication and role permissions.
- Test booking conflicts.
- Test approval and notification flows.
- Test cancellation deadlines.
- Test responsive layouts.
- Deploy the Next.js application.
- Configure Supabase production settings.

## 13. Important Business Rules

- Only verified `@ms.bulsu.edu.ph` accounts may use the system.
- Students can only book available instructor schedules.
- An instructor must approve a booking before it becomes confirmed.
- An availability slot cannot accept overlapping appointments.
- Program restrictions must be checked during booking.
- Cancellation and rescheduling deadlines must use the configured system timezone.
- All important appointment changes must be recorded in appointment history.

## 14. MVP Scope

The first version should include:

1. Domain-restricted authentication
2. Student and instructor profiles
3. Instructor availability creation
4. Program-based availability restrictions
5. Student appointment booking
6. Instructor approval and decline
7. Student appointment calendar
8. Cancellation and rescheduling deadline
9. In-app notifications
10. Responsive glassmorphism interface

Email reminders, advanced analytics, recurring schedules, and administrator management can be added after the MVP.
