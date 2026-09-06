import type { Metadata } from "next";
import { GenerationHistory } from "@/components/GenerationHistory";

export const metadata: Metadata = {
  title: "History — VoiceMood AI",
};

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Recent Generations</h1>
      <GenerationHistory />
    </div>
  );
}
