'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  RemoveFormatting,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type Command = { cmd: string; arg?: string; icon: typeof Bold; label: string };

const COMMANDS: Command[] = [
  { cmd: 'bold', icon: Bold, label: 'Bold' },
  { cmd: 'italic', icon: Italic, label: 'Italic' },
  { cmd: 'underline', icon: Underline, label: 'Underline' },
  { cmd: 'strikeThrough', icon: Strikethrough, label: 'Strikethrough' },
];

const BLOCKS: Command[] = [
  { cmd: 'formatBlock', arg: 'h2', icon: Heading2, label: 'Heading 2' },
  { cmd: 'formatBlock', arg: 'h3', icon: Heading3, label: 'Heading 3' },
  { cmd: 'formatBlock', arg: 'blockquote', icon: Quote, label: 'Quote' },
  { cmd: 'insertUnorderedList', icon: List, label: 'Bulleted list' },
  { cmd: 'insertOrderedList', icon: ListOrdered, label: 'Numbered list' },
];

/**
 * Minimal WYSIWYG editor over a contentEditable div — the stored value is the
 * same HTML string the public terms page renders, so what an agent sees here
 * is what players see there. Uses document.execCommand rather than pulling in
 * a rich-text dependency; fine for this admin-only surface.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  // Keep the DOM in sync with external value changes (e.g. switching locale
  // or "use inherited version") without clobbering the cursor while typing.
  useEffect(() => {
    const el = ref.current;
    if (!el || focused) return;
    if (el.innerHTML !== value) el.innerHTML = value;
  }, [value, focused]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const insertLink = () => {
    const url = window.prompt('Link URL');
    if (url) exec('createLink', url);
  };

  const Btn = ({ cmd, arg, icon: Icon, label }: Command) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => exec(cmd, arg)}
      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    >
      <Icon size={15} />
    </button>
  );

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 focus-within:border-blue-400">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        {COMMANDS.map((c) => (
          <Btn key={c.cmd} {...c} />
        ))}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        {BLOCKS.map((c) => (
          <Btn key={c.label} {...c} />
        ))}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button
          type="button"
          title="Link"
          aria-label="Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <LinkIcon size={15} />
        </button>
        <button
          type="button"
          title="Clear formatting"
          aria-label="Clear formatting"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('removeFormat')}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <RemoveFormatting size={15} />
        </button>
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button
          type="button"
          title="Undo"
          aria-label="Undo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('undo')}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Undo size={15} />
        </button>
        <button
          type="button"
          title="Redo"
          aria-label="Redo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('redo')}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Redo size={15} />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          onChange(e.currentTarget.innerHTML);
        }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        className={cn(
          'min-h-[22rem] max-w-none px-4 py-3 text-sm leading-relaxed text-slate-700 outline-none',
          '[&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-500 [&_a]:underline',
          "empty:before:text-slate-300 empty:before:content-[attr(data-placeholder)]"
        )}
      />
    </div>
  );
}
