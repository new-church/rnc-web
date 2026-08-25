/// <reference types="astro/client" />

import type { SessionContext } from "./lib/auth/session";

declare namespace App {
  interface Locals {
    adminSession?: SessionContext;
  }
}
