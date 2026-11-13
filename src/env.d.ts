/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    // inline import() keeps this file a global declaration (a top-level import would make it a module)
    adminSession?: import("./lib/auth/session").SessionContext;
  }
}
