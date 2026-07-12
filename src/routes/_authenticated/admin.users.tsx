import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, GraduationCap, Shield, User as UserIcon, Settings2, CheckCircle2, Crown, Zap, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type Role = "owner" | "admin" | "teacher" | "student";

interface ProfileRow { id: string; full_name: string | null; pending_teacher: boolean }
interface RoleRow { user_id: string; role: Role }

function UsersPage() {
  const { isAdmin, isOwner, loading } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/admin" });
  }, [loading, isAdmin, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,pending_teacher").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const roleMap = new Map<string, Role>();
      (roles ?? []).forEach((r: RoleRow) => {
        const cur = roleMap.get(r.user_id);
        if (!cur || (r.role === "admin") || (r.role === "teacher" && cur === "student")) {
          roleMap.set(r.user_id, r.role);
        }
      });
      return (profs ?? []).map((p: ProfileRow) => ({
        ...p,
        role: (roleMap.get(p.id) ?? "student") as Role,
      }));
    },
    enabled: isAdmin,
  });

  const pending = (data ?? []).filter(u => u.pending_teacher && u.role !== "teacher" && u.role !== "admin");
  const others = (data ?? []).filter(u => !pending.includes(u));

  const changeRole = async (userId: string, newRole: Role) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) { toast.error(error.message); return; }
    if (newRole !== "teacher") {
      await supabase.from("profiles").update({ pending_teacher: false }).eq("id", userId);
    }
    if (newRole === "teacher") {
      await supabase.from("profiles").update({ pending_teacher: false }).eq("id", userId);
    }
    toast.success(t("save"));
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const approve = async (userId: string) => changeRole(userId, "teacher");

  const revoke = async (userId: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "teacher");
    await supabase.from("user_roles").insert({ user_id: userId, role: "student" });
    await supabase.from("teacher_course_access").delete().eq("teacher_id", userId);
    await supabase.from("teacher_book_access").delete().eq("teacher_id", userId);
    toast.success(t("save"));
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  if (!isAdmin) return null;

  return (
    <div>
      <Link to="/admin">
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
          {t("managePanel")}
        </Button>
      </Link>

      <h1 className="text-3xl font-extrabold">{t("manageUsers")}</h1>

      {isLoading && <p className="mt-6 text-muted-foreground">{t("loading")}</p>}

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-accent-foreground">{t("pendingTeachers")}</h2>
          <div className="space-y-2">
            {pending.map(u => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                    <GraduationCap className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-semibold">{u.full_name || "—"}</div>
                    <Badge variant="outline" className="mt-1 text-xs">{t("pendingApproval")}</Badge>
                  </div>
                </div>
                <Button size="sm" className="bg-hero text-primary-foreground gap-1" onClick={() => approve(u.id)}>
                  <CheckCircle2 className="h-4 w-4" />{t("approve")}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">{t("allUsers")}</h2>
        {others.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">{t("noUsers")}</div>
        )}
        <div className="space-y-2">
          {others.map(u => (
            <UserRow key={u.id} userId={u.id} fullName={u.full_name} role={u.role}
              onRoleChange={changeRole} onRevoke={() => revoke(u.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function UserRow({ userId, fullName, role, onRoleChange, onRevoke }: {
  userId: string; fullName: string | null; role: Role;
  onRoleChange: (id: string, r: Role) => void; onRevoke: () => void;
}) {
  const { t } = useI18n();
  const Icon = role === "admin" ? Shield : role === "teacher" ? GraduationCap : UserIcon;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-semibold">{fullName || "—"}</div>
          <Badge variant="secondary" className="mt-1 text-xs">
            {role === "admin" ? t("adminRole") : role === "teacher" ? t("teacherRole") : t("studentRole")}
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={role} onValueChange={(v) => onRoleChange(userId, v as Role)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="student">{t("studentRole")}</SelectItem>
            <SelectItem value="teacher">{t("teacherRole")}</SelectItem>
            <SelectItem value="admin">{t("adminRole")}</SelectItem>
          </SelectContent>
        </Select>
        {role === "teacher" && (
          <>
            <AccessDialog teacherId={userId} kind="course">
              <Button variant="outline" size="sm" className="gap-1"><Settings2 className="h-4 w-4" />{t("courseAccess")}</Button>
            </AccessDialog>
            <AccessDialog teacherId={userId} kind="book">
              <Button variant="outline" size="sm" className="gap-1"><Settings2 className="h-4 w-4" />{t("bookAccess")}</Button>
            </AccessDialog>
            <Button variant="ghost" size="sm" onClick={onRevoke} className="text-destructive">{t("revoke")}</Button>
          </>
        )}
      </div>
    </div>
  );
}

function AccessDialog({ teacherId, kind, children }: { teacherId: string; kind: "course" | "book"; children: React.ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: [kind === "course" ? "all-courses" : "all-books", open],
    queryFn: async () => {
      if (kind === "course") {
        const { data } = await supabase.from("courses").select("id,title").order("sort_order");
        return data ?? [];
      }
      const { data } = await supabase.from("books").select("id,title,course_id, courses(title)").order("sort_order");
      return (data ?? []).map((b) => ({
        id: b.id as string,
        title: `${(b.courses as { title: string } | null)?.title ?? ""} — ${b.title as string}`,
      }));
    },
    enabled: open,
  });

  const { data: granted } = useQuery({
    queryKey: ["teacher-access", teacherId, kind, open],
    queryFn: async () => {
      if (kind === "course") {
        const { data } = await supabase.from("teacher_course_access").select("course_id").eq("teacher_id", teacherId);
        return new Set((data ?? []).map((r: { course_id: string }) => r.course_id));
      }
      const { data } = await supabase.from("teacher_book_access").select("book_id").eq("teacher_id", teacherId);
      return new Set((data ?? []).map((r: { book_id: string }) => r.book_id));
    },
    enabled: open,
  });

  const toggle = async (id: string, checked: boolean) => {
    if (kind === "course") {
      if (checked) await supabase.from("teacher_course_access").insert({ teacher_id: teacherId, course_id: id });
      else await supabase.from("teacher_course_access").delete().eq("teacher_id", teacherId).eq("course_id", id);
    } else {
      if (checked) await supabase.from("teacher_book_access").insert({ teacher_id: teacherId, book_id: id });
      else await supabase.from("teacher_book_access").delete().eq("teacher_id", teacherId).eq("book_id", id);
    }
    qc.invalidateQueries({ queryKey: ["teacher-access", teacherId, kind] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kind === "course" ? t("courseAccess") : t("bookAccess")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("noUsers")}</p>}
          {(items ?? []).map((it) => (
            <label key={it.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-muted">
              <Checkbox
                checked={granted?.has(it.id) ?? false}
                onCheckedChange={(c) => toggle(it.id, Boolean(c))}
              />
              <span className="text-sm">{it.title}</span>
            </label>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
