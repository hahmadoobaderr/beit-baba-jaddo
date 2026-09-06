import type { Metadata } from "next";
import { VoiceStudio } from "@/components/VoiceStudio";

export const metadata: Metadata = {
  title: "Studio — VoiceMood AI",
};

export default function StudioPage() {
  return <VoiceStudio />;
}
