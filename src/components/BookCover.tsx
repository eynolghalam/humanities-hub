import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen } from "lucide-react";

export function BookCover({ path, title }: { path?: string | null; title: string }) {
  const { data: url } = useQuery({
    queryKey: ["book-cover", path],
    enabled: !!path,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from("book-covers").createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
    {url ? <img src={url} alt={`جلد ${title}`} className="h-full w-full object-contain" loading="lazy" /> : <BookOpen className="h-6 w-6 text-muted-foreground" />}
  </div>;
}