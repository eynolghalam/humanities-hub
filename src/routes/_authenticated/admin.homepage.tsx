import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChevronLeft, Plus, Pencil, Trash2, Image as ImageIcon, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: HomepageEditor,
});

interface Setting { key: string; value_fa: string | null; value_en: string | null; value_ar: string | null }
interface Block {
  id: string; kind: string; icon: string | null; image_url: string | null;
  title_fa: string | null; title_en: string | null; title_ar: string | null;
  body_fa: string | null; body_en: string | null; body_ar: string | null;
  sort_order: number; visible: boolean;
}

const SETTING_KEYS: { key: string; labelKey: "appName" | "tagline" | "heroTitle" | "heroSub" | "heroBtnPrimary" | "heroBtnSecondary"; multiline?: boolean }[] = [
  { key: "app_name", labelKey: "appName" },
  { key: "tagline", labelKey: "tagline" },
  { key: "hero_title", labelKey: "heroTitle" },
  { key: "hero_sub", labelKey: "heroSub", multiline: true },
  { key: "cta_primary", labelKey: "heroBtnPrimary" },
  { key: "cta_secondary", labelKey: "heroBtnSecondary" },
];

function HomepageEditor() {
  const { isAdmin, loading } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/admin" });
  }, [loading, isAdmin, navigate]);

  const { data: settingsRaw } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      return (data ?? []) as Setting[];
    },
    enabled: isAdmin,
  });

  const settings = new Map<string, Setting>();
  (settingsRaw ?? []).forEach(s => settings.set(s.key, s));

  const { data: blocks } = useQuery({
    queryKey: ["admin-blocks"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_blocks").select("*").order("sort_order");
      return (data ?? []) as Block[];
    },
    enabled: isAdmin,
  });

  const saveSetting = async (key: string, fa: string, en: string, ar: string) => {
    const exists = settings.get(key);
    const payload = { key, value_fa: fa, value_en: en, value_ar: ar };
    const { error } = exists
      ? await supabase.from("site_settings").update(payload).eq("key", key)
      : await supabase.from("site_settings").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(t("save")); qc.invalidateQueries({ queryKey: ["admin-settings"] }); qc.invalidateQueries({ queryKey: ["site_settings"] }); }
  };

  const saveHeroImage = async (url: string | null) => {
    const exists = settings.get("hero_image_url");
    const payload = { key: "hero_image_url", value_fa: url, value_en: url, value_ar: url };
    const { error } = exists
      ? await supabase.from("site_settings").update(payload).eq("key", "hero_image_url")
      : await supabase.from("site_settings").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(t("save")); qc.invalidateQueries({ queryKey: ["admin-settings"] }); qc.invalidateQueries({ queryKey: ["site_settings"] }); }
  };

  const deleteBlock = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    const { error } = await supabase.from("homepage_blocks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t("save")); qc.invalidateQueries({ queryKey: ["admin-blocks"] }); qc.invalidateQueries({ queryKey: ["homepage_blocks"] }); }
  };

  const toggleVisible = async (b: Block) => {
    const { error } = await supabase.from("homepage_blocks").update({ visible: !b.visible }).eq("id", b.id);
    if (error) toast.error(error.message);
    else { qc.invalidateQueries({ queryKey: ["admin-blocks"] }); qc.invalidateQueries({ queryKey: ["homepage_blocks"] }); }
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

      <h1 className="text-3xl font-extrabold">{t("homepageEditor")}</h1>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold">{t("hero")} · {t("siteSettings")}</h2>
        <div className="space-y-6">
          {SETTING_KEYS.map(s => (
            <SettingRow
              key={s.key}
              labelText={t(s.labelKey)}
              setting={settings.get(s.key)}
              multiline={s.multiline}
              onSave={(fa, en, ar) => saveSetting(s.key, fa, en, ar)}
            />
          ))}
          <HeroImageRow currentUrl={settings.get("hero_image_url")?.value_fa ?? null} onSave={saveHeroImage} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("blocks")}</h2>
          <BlockDialog onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-blocks"] }); qc.invalidateQueries({ queryKey: ["homepage_blocks"] }); }}>
            <Button className="bg-hero text-primary-foreground gap-2"><Plus className="h-4 w-4" />{t("addBlock")}</Button>
          </BlockDialog>
        </div>
        <div className="space-y-2">
          {(blocks ?? []).map(b => (
            <div key={b.id} className={`flex items-center justify-between rounded-xl border p-4 ${b.visible ? "border-border bg-card" : "border-dashed border-border bg-muted/40"}`}>
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-semibold">{b.title_fa || b.title_en || b.title_ar || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.kind === "feature" ? t("kindFeature") : t("kindCustom")} · #{b.sort_order} {b.icon ? `· ${b.icon}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {b.visible ? t("visible") : t("hidden")}
                  <Switch checked={b.visible} onCheckedChange={() => toggleVisible(b)} />
                </div>
                <BlockDialog block={b} onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-blocks"] }); qc.invalidateQueries({ queryKey: ["homepage_blocks"] }); }}>
                  <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                </BlockDialog>
                <Button size="icon" variant="ghost" onClick={() => deleteBlock(b.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {(blocks?.length ?? 0) === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">{t("blocks")}</div>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingRow({ labelText, setting, multiline, onSave }: {
  labelText: string; setting: Setting | undefined; multiline?: boolean;
  onSave: (fa: string, en: string, ar: string) => void;
}) {
  const { t } = useI18n();
  const [fa, setFa] = useState(setting?.value_fa ?? "");
  const [en, setEn] = useState(setting?.value_en ?? "");
  const [ar, setAr] = useState(setting?.value_ar ?? "");
  useEffect(() => {
    setFa(setting?.value_fa ?? ""); setEn(setting?.value_en ?? ""); setAr(setting?.value_ar ?? "");
  }, [setting]);

  const Input1 = multiline ? Textarea : Input;

  return (
    <div>
      <Label className="text-sm font-semibold">{labelText}</Label>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{t("fieldFa")}</div>
          <Input1 value={fa} onChange={(e) => setFa(e.target.value)} dir="rtl" />
        </div>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{t("fieldAr")}</div>
          <Input1 value={ar} onChange={(e) => setAr(e.target.value)} dir="rtl" />
        </div>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{t("fieldEn")}</div>
          <Input1 value={en} onChange={(e) => setEn(e.target.value)} dir="ltr" />
        </div>
      </div>
      <Button size="sm" className="mt-2" onClick={() => onSave(fa, en, ar)}>{t("save")}</Button>
    </div>
  );
}

function HeroImageRow({ currentUrl, onSave }: { currentUrl: string | null; onSave: (url: string | null) => void }) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const path = `hero/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("homepage-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("homepage-images").getPublicUrl(path);
    onSave(data.publicUrl);
    setUploading(false);
  };

  return (
    <div>
      <Label className="text-sm font-semibold">{t("heroImage")}</Label>
      <div className="mt-2 flex items-center gap-3">
        {currentUrl ? (
          <img src={currentUrl} alt="" className="h-24 w-40 rounded-lg object-cover border border-border" />
        ) : (
          <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? t("uploading") : t("uploadImage")}
          </Button>
          {currentUrl && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onSave(null)}>
              {t("removeImage")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockDialog({ block, children, onSaved }: { block?: Block; children: React.ReactNode; onSaved: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(block?.kind ?? "feature");
  const [icon, setIcon] = useState(block?.icon ?? "BookOpen");
  const [imageUrl, setImageUrl] = useState(block?.image_url ?? "");
  const [sortOrder, setSortOrder] = useState(block?.sort_order ?? 0);
  const [visible, setVisible] = useState(block?.visible ?? true);
  const [titleFa, setTitleFa] = useState(block?.title_fa ?? "");
  const [titleEn, setTitleEn] = useState(block?.title_en ?? "");
  const [titleAr, setTitleAr] = useState(block?.title_ar ?? "");
  const [bodyFa, setBodyFa] = useState(block?.body_fa ?? "");
  const [bodyEn, setBodyEn] = useState(block?.body_en ?? "");
  const [bodyAr, setBodyAr] = useState(block?.body_ar ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImg = async (file: File) => {
    setUploading(true);
    const path = `blocks/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("homepage-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("homepage-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      kind, icon: icon || null, image_url: imageUrl || null,
      title_fa: titleFa, title_en: titleEn, title_ar: titleAr,
      body_fa: bodyFa, body_en: bodyEn, body_ar: bodyAr,
      sort_order: sortOrder, visible,
    };
    const { error } = block
      ? await supabase.from("homepage_blocks").update(payload).eq("id", block.id)
      : await supabase.from("homepage_blocks").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(t("save")); onSaved(); setOpen(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{block ? t("editBlock") : t("addBlock")}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>{t("blockKind")}</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">{t("kindFeature")}</SelectItem>
                  <SelectItem value="custom">{t("kindCustom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("icon")}</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="BookOpen" dir="ltr" />
            </div>
            <div>
              <Label>{t("sortOrder")}</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} dir="ltr" />
            </div>
          </div>

          <div>
            <Label>{t("image")}</Label>
            <div className="mt-2 flex items-center gap-3">
              {imageUrl && <img src={imageUrl} alt="" className="h-16 w-24 rounded object-cover" />}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? t("uploading") : t("uploadImage")}
              </Button>
              {imageUrl && (
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setImageUrl("")}>
                  {t("removeImage")}
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="fa">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="fa">{t("fieldFa")}</TabsTrigger>
              <TabsTrigger value="ar">{t("fieldAr")}</TabsTrigger>
              <TabsTrigger value="en">{t("fieldEn")}</TabsTrigger>
            </TabsList>
            <TabsContent value="fa" className="space-y-3">
              <div><Label>{t("title")}</Label><Input value={titleFa} onChange={(e) => setTitleFa(e.target.value)} dir="rtl" /></div>
              <div><Label>{t("bodyText")}</Label><Textarea value={bodyFa} onChange={(e) => setBodyFa(e.target.value)} dir="rtl" rows={4} /></div>
            </TabsContent>
            <TabsContent value="ar" className="space-y-3">
              <div><Label>{t("title")}</Label><Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" /></div>
              <div><Label>{t("bodyText")}</Label><Textarea value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} dir="rtl" rows={4} /></div>
            </TabsContent>
            <TabsContent value="en" className="space-y-3">
              <div><Label>{t("title")}</Label><Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" /></div>
              <div><Label>{t("bodyText")}</Label><Textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} dir="ltr" rows={4} /></div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3">
            <Switch checked={visible} onCheckedChange={setVisible} id="vis" />
            <Label htmlFor="vis">{visible ? t("visible") : t("hidden")}</Label>
          </div>

          <Button type="submit" disabled={saving} className="w-full bg-hero text-primary-foreground">
            {saving ? t("loading") : t("save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
