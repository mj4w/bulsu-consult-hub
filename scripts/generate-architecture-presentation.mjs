import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outputPath = join(
  process.cwd(),
  "docs",
  "Student_Consultation_Scheduler_Architecture.pptx",
);

const SLIDE_W = 12192000;
const SLIDE_H = 6858000;
const EMU = 914400;

const theme = {
  bg: "111827",
  bg2: "17233D",
  panel: "1D2A44",
  panel2: "23324F",
  blue: "2563EB",
  blue2: "60A5FA",
  green: "10B981",
  amber: "F59E0B",
  purple: "8B5CF6",
  white: "F8FAFC",
  muted: "B6C3D8",
  line: "334155",
};

const slides = [
  {
    type: "title",
    title: "Student Consultation Scheduler",
    subtitle:
      "Architecture, core functions, scheduling workflow, and implementation approach",
    footer: "Bulacan State University | 2026",
  },
  {
    type: "cards",
    kicker: "Project purpose",
    title: "A focused consultation workflow for students and instructors.",
    intro:
      "The application reduces manual back-and-forth by making availability, requests, approvals, notifications, and consultation history visible in one place.",
    cards: [
      ["Students", "Browse available instructor windows, choose a preferred time, and submit a clear consultation concern."],
      ["Instructors", "Publish availability, review student requests, approve or decline, and manage upcoming consultations."],
      ["System", "Protect schedules from duplicate bookings and keep both dashboards updated in realtime."],
    ],
  },
  {
    type: "architecture",
    kicker: "High-level architecture",
    title: "Next.js handles the interface. Supabase handles auth, data, and realtime sync.",
    boxes: [
      ["Browser", "Student and instructor dashboards"],
      ["Next.js App", "Routes, UI, server checks, role routing"],
      ["Supabase", "Auth, Postgres, RLS, Realtime"],
      ["Microsoft Entra", "Institutional Microsoft sign-in"],
      ["Vercel", "Production hosting and environment variables"],
    ],
  },
  {
    type: "cards",
    kicker: "Application modules",
    title: "The app is separated by user role and workflow stage.",
    intro:
      "Each route has a clear responsibility, which keeps the student and instructor experiences from becoming mixed or confusing.",
    cards: [
      ["/", "Landing page explaining purpose, users, workflow, and sign-in."],
      ["/dashboard/student", "Student calendar, profile status, upcoming consultation, request flow, notifications."],
      ["/dashboard/instructor", "Instructor availability calendar, approved schedules, active window metrics."],
      ["/dashboard/instructor/requests", "Pending and reviewed request management with pagination."],
      ["/dashboard/student/history", "Searchable consultation history for students."],
      ["/instructor-portal", "Optional non-Microsoft instructor test login."],
    ],
  },
  {
    type: "flow",
    kicker: "Authentication and roles",
    title: "Sign-in determines where the user belongs.",
    steps: [
      ["1", "User signs in", "Students use Microsoft. Test instructors may use the instructor portal."],
      ["2", "Profile is created or repaired", "Supabase stores role, email, full name, and required profile details."],
      ["3", "Role is inferred", "Student numbers are numeric email prefixes. Instructor accounts use instructor role records."],
      ["4", "Dashboard is protected", "Unauthenticated users are blocked and role mismatch redirects are enforced."],
    ],
  },
  {
    type: "data",
    kicker: "Database design",
    title: "Core tables support profile identity, availability, and consultation requests.",
    rows: [
      ["profiles", "User identity, role, full name, email, program, section, contact details."],
      ["instructor_availability", "Instructor time windows, format, program scope, active status."],
      ["consultation_requests", "Student request, selected time, purpose, status, decision notes."],
      ["test_teacher_accounts", "Controlled non-Microsoft instructor testing support."],
      ["Realtime publication", "Keeps dashboards synchronized after inserts, updates, and deletes."],
    ],
  },
  {
    type: "flow",
    kicker: "Student core flow",
    title: "Students request a specific time inside an instructor window.",
    steps: [
      ["1", "Complete profile", "Student number and email are locked; program and section are required."],
      ["2", "Browse calendar", "Availability is filtered by program and visible instructor windows."],
      ["3", "Select time", "Preferred time must be inside the instructor availability range."],
      ["4", "Submit request", "Purpose and format are saved as a pending consultation request."],
      ["5", "Track result", "Pending and approved requests appear in calendar and history."],
    ],
  },
  {
    type: "flow",
    kicker: "Instructor core flow",
    title: "Instructors manage availability and review requests.",
    steps: [
      ["1", "Create availability", "Drag/select a time range and set format plus program scope."],
      ["2", "Review pending requests", "Requests show student name, date, time, purpose, and format."],
      ["3", "Approve or decline", "Actions are protected with conflict checks and clear feedback."],
      ["4", "Manage upcoming schedules", "Approved upcoming consultations can be rescheduled or cancelled."],
      ["5", "View past schedules", "Past approved consultations are view-only for record safety."],
    ],
  },
  {
    type: "rules",
    kicker: "Scheduling rules",
    title: "The system protects availability from conflicts and unclear states.",
    rules: [
      ["No duplicate approved slot", "Once a request is approved, the occupied time is removed from student availability."],
      ["Multiple instructors supported", "Students can see different instructor schedules on the same date."],
      ["Past schedules are locked", "Past approved consultations become view-only."],
      ["One-day cancellation guard", "Students cannot freely cancel or edit close to the consultation date."],
      ["Instructor delete behavior", "Deleting availability does not silently erase approved consultation records."],
    ],
  },
  {
    type: "cards",
    kicker: "Realtime and notifications",
    title: "Realtime updates keep both sides synchronized.",
    intro:
      "Supabase realtime subscriptions update calendars, request lists, notification badges, and dashboard counters after changes.",
    cards: [
      ["Student notified", "Approved, declined, rescheduled, or cancelled consultation results appear in notifications."],
      ["Instructor notified", "New student requests and pending counts appear without manual page refresh."],
      ["Calendar sync", "Availability changes, occupied slots, and request statuses update across dashboards."],
    ],
  },
  {
    type: "cards",
    kicker: "Security and deployment",
    title: "Production setup depends on correct auth, RLS, and environment configuration.",
    intro:
      "The app is hosted on Vercel and uses Supabase policies to restrict database access by role and ownership.",
    cards: [
      ["Domain control", "Students are restricted to @ms.bulsu.edu.ph accounts."],
      ["RLS policies", "Users can only access records allowed by their role and relationship to the request."],
      ["Redirect URLs", "Supabase and Microsoft Entra must both include local and production callback URLs."],
      ["Environment variables", "Vercel must include Supabase URL, publishable key, and test portal setting."],
    ],
  },
  {
    type: "rules",
    kicker: "Supabase database safety",
    title: "Database security is handled through least-privilege access and strict server-side rules.",
    rules: [
      ["Enable Row Level Security", "Every user-facing table should have RLS enabled so the anon key cannot read or modify unrestricted data."],
      ["Write precise policies", "Students only access their own requests; instructors only access their availability and assigned requests."],
      ["Never expose service role keys", "The service role key must stay server-side only and should never be placed in browser code or Vercel public variables."],
      ["Validate at the database layer", "Use constraints, triggers, and overlap checks so invalid schedules cannot bypass the UI."],
      ["Limit realtime exposure", "Only publish tables and columns that users are allowed to observe through RLS-protected subscriptions."],
      ["Audit and recover", "Keep migrations versioned, review Supabase logs, and use backups before destructive schema or data changes."],
    ],
  },
  {
    type: "timeline",
    kicker: "How to make it possible",
    title: "Implementation roadmap",
    items: [
      ["Phase 1", "Set up Next.js, Tailwind CSS, Supabase client, layout, and theme system."],
      ["Phase 2", "Implement Microsoft authentication, profile creation, role routing, and protected dashboards."],
      ["Phase 3", "Build instructor availability calendar and student request calendar."],
      ["Phase 4", "Add approval workflow, conflict prevention, occupied slot reduction, and realtime updates."],
      ["Phase 5", "Add notification badges, consultation history, responsive polish, and Vercel deployment."],
    ],
  },
  {
    type: "closing",
    title: "Outcome",
    subtitle:
      "The system gives students a structured way to request consultations and gives instructors a controlled way to manage academic availability.",
    bullets: [
      "Clearer request process",
      "Less manual schedule coordination",
      "Protected approved slots",
      "Realtime visibility for both roles",
      "Searchable consultation records",
    ],
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function emu(value) {
  return Math.round(value * EMU);
}

function shape({ x, y, w, h, fill, line = "transparent", radius = "roundRect", alpha, shadow = false }) {
  const fillXml = fill
    ? `<a:solidFill><a:srgbClr val="${fill}">${alpha ? `<a:alpha val="${alpha}"/>` : ""}</a:srgbClr></a:solidFill>`
    : "<a:noFill/>";
  const lineXml = line === "transparent"
    ? "<a:ln><a:noFill/></a:ln>"
    : `<a:ln w="12700"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln>`;
  const shadowXml = shadow
    ? '<a:effectLst><a:outerShdw blurRad="91440" dist="38100" dir="5400000" algn="tl" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="25000"/></a:srgbClr></a:outerShdw></a:effectLst>'
    : "";

  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${nextId()}" name="Shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm>
      <a:prstGeom prst="${radius}"><a:avLst/></a:prstGeom>
      ${fillXml}${lineXml}${shadowXml}
    </p:spPr>
    <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
  </p:sp>`;
}

function textBox({ x, y, w, h, text, size = 2200, color = theme.white, bold = false, align = "l" }) {
  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${nextId()}" name="Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
    <p:txBody><a:bodyPr wrap="square" anchor="t"/><a:lstStyle/>${String(text)
      .split("\n")
      .map((line) => `<a:p><a:pPr algn="${align}"/><a:r><a:rPr lang="en-US" sz="${size}"${bold ? ' b="1"' : ""}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Aptos"/></a:rPr><a:t>${escapeXml(line)}</a:t></a:r></a:p>`)
      .join("")}</p:txBody>
  </p:sp>`;
}

let shapeId = 1;
function nextId() {
  shapeId += 1;
  return shapeId;
}

function slideBase(content) {
  shapeId = 1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${theme.bg}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_W}" cy="${SLIDE_H}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_W}" cy="${SLIDE_H}"/></a:xfrm></p:grpSpPr>
    ${shape({ x: -0.4, y: -0.4, w: 14.2, h: 8.3, fill: theme.bg, radius: "rect" })}
    ${shape({ x: 8.1, y: -0.3, w: 6.8, h: 5.2, fill: theme.blue, radius: "ellipse", alpha: "11000" })}
    ${shape({ x: -1.2, y: 4.9, w: 6.2, h: 4.2, fill: theme.purple, radius: "ellipse", alpha: "9000" })}
    ${content}
  </p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function header(kicker, title) {
  return [
    textBox({ x: 0.55, y: 0.42, w: 4.2, h: 0.32, text: kicker, size: 1350, color: theme.blue2, bold: true }),
    textBox({ x: 0.55, y: 0.82, w: 9.9, h: 1.15, text: title, size: 3000, color: theme.white, bold: true }),
  ].join("");
}

function titleSlide(slide) {
  return slideBase([
    shape({ x: 0.55, y: 0.55, w: 12.2, h: 6.4, fill: theme.panel, line: theme.line, radius: "roundRect", shadow: true }),
    shape({ x: 0.95, y: 1.0, w: 0.9, h: 0.9, fill: theme.blue, radius: "roundRect" }),
    textBox({ x: 1.14, y: 1.18, w: 0.52, h: 0.45, text: "✓", size: 2600, color: theme.white, bold: true, align: "c" }),
    textBox({ x: 0.95, y: 2.0, w: 10.6, h: 1.45, text: slide.title, size: 4300, color: theme.white, bold: true }),
    textBox({ x: 1.0, y: 3.55, w: 8.7, h: 0.9, text: slide.subtitle, size: 1950, color: theme.muted }),
    shape({ x: 1.0, y: 5.35, w: 4.1, h: 0.55, fill: theme.blue, radius: "roundRect" }),
    textBox({ x: 1.22, y: 5.49, w: 3.7, h: 0.25, text: slide.footer, size: 1200, color: theme.white, bold: true }),
  ].join(""));
}

function cardsSlide(slide) {
  const cardW = slide.cards.length > 3 ? 3.85 : 3.85;
  const startY = slide.cards.length > 3 ? 2.75 : 3.15;
  const cardH = slide.cards.length > 3 ? 1.2 : 1.65;
  const items = slide.cards.map((card, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 0.65 + col * 4.15;
    const y = startY + row * 1.45;
    return [
      shape({ x, y, w: cardW, h: cardH, fill: theme.panel, line: theme.line, radius: "roundRect", shadow: true }),
      textBox({ x: x + 0.25, y: y + 0.22, w: cardW - 0.5, h: 0.35, text: card[0], size: 1550, color: theme.white, bold: true }),
      textBox({ x: x + 0.25, y: y + 0.64, w: cardW - 0.5, h: cardH - 0.75, text: card[1], size: 1050, color: theme.muted }),
    ].join("");
  }).join("");

  return slideBase([
    header(slide.kicker, slide.title),
    textBox({ x: 0.65, y: 2.05, w: 10.5, h: 0.45, text: slide.intro, size: 1500, color: theme.muted }),
    items,
  ].join(""));
}

function architectureSlide(slide) {
  const xs = [0.65, 3.15, 5.65, 8.15, 10.65];
  const colors = [theme.blue, theme.purple, theme.green, theme.amber, theme.blue2];
  const boxes = slide.boxes.map((box, index) => [
    shape({ x: xs[index], y: 3.0, w: 2.15, h: 1.65, fill: theme.panel, line: colors[index], radius: "roundRect", shadow: true }),
    textBox({ x: xs[index] + 0.18, y: 3.25, w: 1.8, h: 0.35, text: box[0], size: 1400, color: theme.white, bold: true, align: "c" }),
    textBox({ x: xs[index] + 0.18, y: 3.75, w: 1.8, h: 0.55, text: box[1], size: 950, color: theme.muted, align: "c" }),
    index < slide.boxes.length - 1 ? textBox({ x: xs[index] + 2.15, y: 3.56, w: 0.45, h: 0.25, text: "→", size: 1900, color: theme.blue2, bold: true, align: "c" }) : "",
  ].join("")).join("");

  return slideBase([
    header(slide.kicker, slide.title),
    shape({ x: 0.65, y: 2.35, w: 12.05, h: 3.05, fill: theme.panel2, line: theme.line, radius: "roundRect" }),
    boxes,
    textBox({ x: 1.0, y: 5.72, w: 11.2, h: 0.55, text: "Data security is handled through Supabase Auth, row-level security policies, and role-based application routing.", size: 1450, color: theme.muted, align: "c" }),
  ].join(""));
}

function flowSlide(slide) {
  const items = slide.steps.map((item, index) => {
    const y = 2.25 + index * 0.86;
    return [
      shape({ x: 0.85, y, w: 0.5, h: 0.5, fill: theme.blue, radius: "ellipse" }),
      textBox({ x: 0.99, y: y + 0.11, w: 0.22, h: 0.16, text: item[0], size: 950, color: theme.white, bold: true, align: "c" }),
      shape({ x: 1.62, y: y - 0.08, w: 10.5, h: 0.68, fill: theme.panel, line: theme.line, radius: "roundRect" }),
      textBox({ x: 1.86, y: y + 0.05, w: 3.0, h: 0.25, text: item[1], size: 1350, color: theme.white, bold: true }),
      textBox({ x: 4.5, y: y + 0.05, w: 7.2, h: 0.28, text: item[2], size: 1120, color: theme.muted }),
    ].join("");
  }).join("");

  return slideBase([header(slide.kicker, slide.title), items].join(""));
}

function dataSlide(slide) {
  const rows = slide.rows.map((row, index) => {
    const y = 2.05 + index * 0.78;
    return [
      shape({ x: 0.7, y, w: 11.9, h: 0.58, fill: index % 2 === 0 ? theme.panel : theme.panel2, line: theme.line, radius: "roundRect" }),
      textBox({ x: 0.95, y: y + 0.13, w: 2.8, h: 0.18, text: row[0], size: 1200, color: theme.blue2, bold: true }),
      textBox({ x: 3.65, y: y + 0.13, w: 8.4, h: 0.18, text: row[1], size: 1120, color: theme.muted }),
    ].join("");
  }).join("");

  return slideBase([header(slide.kicker, slide.title), rows].join(""));
}

function rulesSlide(slide) {
  const rows = slide.rules.map((rule, index) => {
    const x = 0.75 + (index % 2) * 6.05;
    const y = 2.2 + Math.floor(index / 2) * 1.32;
    return [
      shape({ x, y, w: 5.55, h: 1.05, fill: theme.panel, line: theme.line, radius: "roundRect", shadow: true }),
      shape({ x: x + 0.22, y: y + 0.25, w: 0.32, h: 0.32, fill: index % 2 === 0 ? theme.green : theme.blue, radius: "ellipse" }),
      textBox({ x: x + 0.72, y: y + 0.2, w: 4.5, h: 0.25, text: rule[0], size: 1250, color: theme.white, bold: true }),
      textBox({ x: x + 0.72, y: y + 0.55, w: 4.55, h: 0.28, text: rule[1], size: 960, color: theme.muted }),
    ].join("");
  }).join("");

  return slideBase([header(slide.kicker, slide.title), rows].join(""));
}

function timelineSlide(slide) {
  const items = slide.items.map((item, index) => {
    const x = 0.78 + index * 2.42;
    return [
      shape({ x, y: 2.25, w: 1.9, h: 2.95, fill: theme.panel, line: theme.line, radius: "roundRect", shadow: true }),
      textBox({ x: x + 0.2, y: 2.55, w: 1.5, h: 0.25, text: item[0], size: 1250, color: theme.blue2, bold: true, align: "c" }),
      shape({ x: x + 0.75, y: 3.05, w: 0.4, h: 0.4, fill: index % 2 === 0 ? theme.blue : theme.purple, radius: "ellipse" }),
      textBox({ x: x + 0.2, y: 3.75, w: 1.5, h: 0.9, text: item[1], size: 930, color: theme.muted, align: "c" }),
    ].join("");
  }).join("");

  return slideBase([header(slide.kicker, slide.title), items].join(""));
}

function closingSlide(slide) {
  const bullets = slide.bullets.map((bullet, index) => {
    const y = 3.25 + index * 0.45;
    return [
      shape({ x: 1.08, y: y + 0.07, w: 0.18, h: 0.18, fill: theme.green, radius: "ellipse" }),
      textBox({ x: 1.45, y, w: 7.2, h: 0.22, text: bullet, size: 1400, color: theme.white }),
    ].join("");
  }).join("");

  return slideBase([
    shape({ x: 0.7, y: 0.75, w: 11.9, h: 5.85, fill: theme.panel, line: theme.line, radius: "roundRect", shadow: true }),
    textBox({ x: 1.0, y: 1.35, w: 9.6, h: 0.85, text: slide.title, size: 4100, color: theme.white, bold: true }),
    textBox({ x: 1.0, y: 2.35, w: 9.7, h: 0.5, text: slide.subtitle, size: 1600, color: theme.muted }),
    bullets,
    textBox({ x: 1.0, y: 5.8, w: 5.6, h: 0.28, text: "© 2026 Student Consultation Scheduler", size: 1150, color: theme.muted }),
  ].join(""));
}

function renderSlide(slide) {
  if (slide.type === "title") return titleSlide(slide);
  if (slide.type === "cards") return cardsSlide(slide);
  if (slide.type === "architecture") return architectureSlide(slide);
  if (slide.type === "flow") return flowSlide(slide);
  if (slide.type === "data") return dataSlide(slide);
  if (slide.type === "rules") return rulesSlide(slide);
  if (slide.type === "timeline") return timelineSlide(slide);
  return closingSlide(slide);
}

function contentTypes() {
  const slideOverrides = slides
    .map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slideOverrides}
</Types>`;
}

function rels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function presentationXml() {
  const slideIds = slides
    .map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${slideIds}</p:sldIdLst>
  <p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
}

function presentationRels() {
  const slideRels = slides
    .map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideRels}
</Relationships>`;
}

function slideMaster() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_W}" cy="${SLIDE_H}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_W}" cy="${SLIDE_H}"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`;
}

function slideMasterRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;
}

function slideLayout() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_W}" cy="${SLIDE_H}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_W}" cy="${SLIDE_H}"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
</p:sldLayout>`;
}

function emptyRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;
}

function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Student Consultation Scheduler">
  <a:themeElements>
    <a:clrScheme name="Scheduler"><a:dk1><a:srgbClr val="${theme.bg}"/></a:dk1><a:lt1><a:srgbClr val="${theme.white}"/></a:lt1><a:dk2><a:srgbClr val="${theme.bg2}"/></a:dk2><a:lt2><a:srgbClr val="${theme.muted}"/></a:lt2><a:accent1><a:srgbClr val="${theme.blue}"/></a:accent1><a:accent2><a:srgbClr val="${theme.green}"/></a:accent2><a:accent3><a:srgbClr val="${theme.purple}"/></a:accent3><a:accent4><a:srgbClr val="${theme.amber}"/></a:accent4><a:accent5><a:srgbClr val="${theme.blue2}"/></a:accent5><a:accent6><a:srgbClr val="${theme.line}"/></a:accent6><a:hlink><a:srgbClr val="${theme.blue2}"/></a:hlink><a:folHlink><a:srgbClr val="${theme.purple}"/></a:folHlink></a:clrScheme>
    <a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Scheduler"><a:fillStyleLst><a:solidFill><a:srgbClr val="${theme.panel}"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="12700"><a:solidFill><a:srgbClr val="${theme.line}"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:srgbClr val="${theme.bg}"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`;
}

function appProps() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>${slides.length}</Slides>
</Properties>`;
}

function coreProps() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Student Consultation Scheduler Architecture</dc:title>
  <dc:creator>Student Consultation Scheduler</dc:creator>
  <cp:lastModifiedBy>Student Consultation Scheduler</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-08-15T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-08-15T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;
}

function buildFiles() {
  const files = {
    "[Content_Types].xml": contentTypes(),
    "_rels/.rels": rels(),
    "docProps/app.xml": appProps(),
    "docProps/core.xml": coreProps(),
    "ppt/presentation.xml": presentationXml(),
    "ppt/_rels/presentation.xml.rels": presentationRels(),
    "ppt/slideMasters/slideMaster1.xml": slideMaster(),
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": slideMasterRels(),
    "ppt/slideLayouts/slideLayout1.xml": slideLayout(),
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": emptyRels(),
    "ppt/theme/theme1.xml": themeXml(),
  };

  slides.forEach((slide, index) => {
    files[`ppt/slides/slide${index + 1}.xml`] = renderSlide(slide);
    files[`ppt/slides/_rels/slide${index + 1}.xml.rels`] = emptyRels();
  });

  return files;
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name, "utf8");
    const data = Buffer.from(content, "utf8");
    const crc = crc32(data);
    const localHeader = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBuffer.length), u16(0), nameBuffer,
    ]);

    localParts.push(localHeader, data);

    const centralHeader = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBuffer.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), nameBuffer,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(Object.keys(files).length), u16(Object.keys(files).length),
    u32(centralDirectory.length), u32(offset), u16(0),
  ]);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, createZip(buildFiles()));
console.log(`Created ${outputPath}`);
