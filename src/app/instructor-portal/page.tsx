import { InstructorPortal } from "@/components/auth/InstructorPortal";
import { notFound } from "next/navigation";

export default function InstructorPortalPage() {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_INSTRUCTOR_TEST_PORTAL === "true";

  if (!enabled) {
    notFound();
  }

  return <InstructorPortal />;
}
