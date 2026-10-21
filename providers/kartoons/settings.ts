import { ProviderContext, SettingsField } from "../types";
import { applyCredentialReset } from "./headers";

export async function getSettingsSchema({ providerContext }: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  await applyCredentialReset(providerContext);
  return [{
    key: "kartoons_clear_credentials",
    type: "toggle",
    label: "Clear saved credentials",
    description: "Enable and save, then reopen Kartoons to clear your saved device link and link an account again. This option turns itself off after clearing.",
    defaultValue: false,
  }];
}
