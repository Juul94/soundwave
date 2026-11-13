/** Result of an admin Server Action. */
export type ActionResult = { ok: boolean; error?: string; message?: string };

/** State returned by the login and password form actions. */
export type FormState = { error?: string; message?: string } | undefined;
