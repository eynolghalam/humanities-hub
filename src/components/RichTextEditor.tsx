import { useEffect, useRef } from "react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignRight, AlignCenter, AlignLeft, Heading2, Heading3, Quote, Link2, Eraser, Undo2, Redo2,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  dir?: "rtl" | "ltr";
  className?: string;
}

type Cmd = { icon: React.ElementType; label: string; run: () => void };

/** Lightweight rich-text editor (bold / underline / lists / headings …) producing HTML. */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 140, dir = "rtl", className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value ?? "";
  }, [value]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const commands: Cmd[] = [
    { icon: Bold, label: "درشت", run: () => exec("bold") },
    { icon: Italic, label: "کج", run: () => exec("italic") },
    { icon: Underline, label: "زیرخط", run: () => exec("underline") },
    { icon: Strikethrough, label: "خط‌خورده", run: () => exec("strikeThrough") },
    { icon: Heading2, label: "عنوان بزرگ", run: () => exec("formatBlock", "<h2>") },
    { icon: Heading3, label: "عنوان کوچک", run: () => exec("formatBlock", "<h3>") },
    { icon: Quote, label: "نقل‌قول", run: () => exec("formatBlock", "<blockquote>") },
    { icon: List, label: "فهرست نقطه‌ای", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "فهرست شماره‌دار", run: () => exec("insertOrderedList") },
    { icon: AlignRight, label: "راست‌چین", run: () => exec("justifyRight") },
    { icon: AlignCenter, label: "وسط‌چین", run: () => exec("justifyCenter") },
    { icon: AlignLeft, label: "چپ‌چین", run: () => exec("justifyLeft") },
    {
      icon: Link2, label: "پیوند", run: () => {
        const url = window.prompt("آدرس پیوند:");
        if (url) exec("createLink", url);
      },
    },
    { icon: Eraser, label: "حذف قالب‌بندی", run: () => exec("removeFormat") },
    { icon: Undo2, label: "بازگردانی", run: () => exec("undo") },
    { icon: Redo2, label: "تکرار", run: () => exec("redo") },
  ];

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card ${className}`}>
      <div className="flex flex-wrap gap-0.5 border-b border-border bg-muted/40 p-1">
        {commands.map(({ icon: Icon, label, run }) => (
          <button
            key={label}
            type="button"
            title={label}
            onMouseDown={e => e.preventDefault()}
            onClick={run}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <input
          type="color"
          title="رنگ متن"
          onChange={e => exec("foreColor", e.target.value)}
          className="ml-1 h-7 w-7 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
        />
      </div>
      <div
        ref={ref}
        contentEditable
        dir={dir}
        data-placeholder={placeholder ?? ""}
        onInput={e => onChange((e.target as HTMLDivElement).innerHTML)}
        onBlur={e => onChange((e.target as HTMLDivElement).innerHTML)}
        style={{ minHeight }}
        className="rich-content w-full px-3 py-2 text-sm leading-loose outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
