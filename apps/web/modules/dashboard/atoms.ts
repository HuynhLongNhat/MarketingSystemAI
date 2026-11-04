
import { atomWithStorage } from "jotai/utils";

import type { ConversationStatus } from "@/lib/conversations-api";

import { STATUS_FILTER_KEY } from "./constants";

export const statusFilterAtom = atomWithStorage<
  ConversationStatus | "all"
>(STATUS_FILTER_KEY, "all");

