
import { atom } from "jotai";
import { atomFamily, atomWithStorage } from "jotai/utils";
import type { WidgetScreen } from "@/modules/widget/types";
import type { PublicWidgetSettings } from "@/lib/widget-api";
import { CONTACT_SESSION_KEY } from "../constants";

export const screenAtom = atom<WidgetScreen>("loading");

export const organizationIdAtom = atom<string | null>(null);

export const contactSessionIdAtomFamily = atomFamily(
  (organizationId: string) =>
    atomWithStorage<string | null>(
      `${CONTACT_SESSION_KEY}_pg_${organizationId}`,
      null,
    ),
);

export const errorMessageAtom = atom<string | null>(null);
export const loadingMessageAtom = atom<string | null>(null);

export const conversationIdAtom = atom<string | null>(null);

export const widgetSettingsAtom =
  atom<PublicWidgetSettings | null>(null);

export const vapiSecretsAtom = atom<{
  publicApiKey: string;
} | null>(null);

export const hasVapiSecretsAtom = atom(
  (get) => get(vapiSecretsAtom) !== null,
);
