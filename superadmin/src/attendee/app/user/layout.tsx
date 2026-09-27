import React from "react";
// Replace Next.js absolute path import with a relative import
import AttendeeNav from "@/components/user/AttendeeNav";

export default function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <main className="pb-16">{children}</main>
      <AttendeeNav />
    </div>
  );
}