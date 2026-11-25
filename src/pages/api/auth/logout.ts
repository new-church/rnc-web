import type { APIRoute } from "astro";
import { signOutEverywhere } from "../../../lib/members/sign-in";

export const prerender = false;

/** Ends every session in this browser (member and admin). POST only, so a link on another site can't sign anyone out. */
export const POST: APIRoute = async ({ cookies, redirect }) => {
  await signOutEverywhere(cookies);
  return redirect("/", 303);
};
