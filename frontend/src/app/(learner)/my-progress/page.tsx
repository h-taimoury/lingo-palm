import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";

export const metadata: Metadata = { title: "My progress" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-9 pb-20 sm:px-6">
      <PageHeader
        title="My progress"
        description="See the new meanings you’ve learned on LingoPalm, one day at a time."
      />
      <ProgressDashboard />
    </div>
  );
}
