export type Role = "admin" | "user";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_seen_app: string | null;
};
