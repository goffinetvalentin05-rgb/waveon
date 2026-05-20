import { fetchAppShellProfile } from "@/lib/pronoclash/app-shell-profile";
import { JoinLeagueClient } from "./JoinLeagueClient";

export default async function JoinLeaguePage() {
  const shell = await fetchAppShellProfile();
  return (
    <JoinLeagueClient
      username={shell.username}
      email={shell.email}
      isAdmin={shell.isAdmin}
    />
  );
}
