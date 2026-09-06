import type { Metadata } from "next";

import { Features } from "@/components/home/Features";
import { Footer } from "@/components/home/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { GuestNav } from "@/components/navigation/GuestNav";
import { SignUpSection } from "@/components/home/SignUpSection";
import { LearnerNav } from "@/components/navigation/LearnerNav";
import { getOptionalCurrentUser } from "@/lib/auth/getOptionalCurrentUser";

export const metadata: Metadata = {
  title: "Learn English through authentic video",
  description:
    "Learn exact English meanings from authentic videos, curated interactive subtitles, and focused vocabulary review.",
};

export default async function HomePage() {
  const user = await getOptionalCurrentUser("/");

  return (
    <div className="min-h-dvh bg-background">
      {user ? <LearnerNav user={user} /> : <GuestNav />}
      <main>
        <HeroSection isAuthenticated={Boolean(user)} />
        <HowItWorks />
        <Features />
        <SignUpSection user={user} />
      </main>
      <Footer isAuthenticated={Boolean(user)} />
    </div>
  );
}
