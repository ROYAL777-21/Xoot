import { router } from "expo-router";
import { RewardsView } from "@/components/profile-rewards";
export default function Rewards() {
  return <RewardsView openCredits={() => router.push("/credits")} />;
}
