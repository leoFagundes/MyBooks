import type { ProfileRelation } from "@/features/profile/queries";
import type { FollowState, ReaderState } from "../types";

const STATES: Record<ProfileRelation, ReaderState> = {
  self: "self",
  following: "accepted",
  requested: "pending",
  none: "none",
  visitor: "visitor",
};

/** A relação com o perfil, como o botão Seguir a entende. */
export function relationToState(relation: ProfileRelation): ReaderState {
  return STATES[relation];
}

/** O próprio perfil e o visitante não seguem ninguém. */
export function asFollowState(state: ReaderState): FollowState {
  return state === "accepted" || state === "pending" ? state : "none";
}
