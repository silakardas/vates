import { Extension, type RawCommands } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type GrammarMatch = {
  from: number;
  to: number;
  message: string;
  shortMessage: string;
  replacements: string[];
};

type LanguageToolMatch = {
  offset: number;
  length: number;
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
};

export interface GrammarCheckOptions {
  /** LanguageTool language code, e.g. "en-US", "tr", or "auto" */
  language: string;
  /** How long to wait after the user stops typing before checking, in ms */
  debounceMs: number;
  /** LanguageTool endpoint (self-hosted instances can override this) */
  apiUrl: string;
}

export interface GrammarCheckStorage {
  matches: GrammarMatch[];
  loading: boolean;
}

declare module "@tiptap/core" {
  interface Storage {
    grammarCheck: GrammarCheckStorage;
  }
  interface Commands<ReturnType> {
    grammarCheck: {
      applyGrammarFix: (from: number, to: number, replacement: string) => ReturnType;
    };
  }
}

const pluginKey = new PluginKey<DecorationSet>("grammarCheck");

export const GrammarCheck = Extension.create<GrammarCheckOptions, GrammarCheckStorage>({
  name: "grammarCheck",

  addOptions() {
    return {
      language: "en-US",
      debounceMs: 1200,
      apiUrl: "https://api.languagetool.org/v2/check",
    };
  },

  addStorage() {
    return {
      matches: [],
      loading: false,
    };
  },

  addCommands() {
    return {
      applyGrammarFix:
        (from: number, to: number, replacement: string) =>
        ({ chain }) => {
          return chain().insertContentAt({ from, to }, replacement).run();
        },
    } satisfies Partial<RawCommands>;
  },

  addProseMirrorPlugins() {
    // Arrow functions below close over the lexical `this`, so the extension
    // instance (and its storage/options) stays reachable without aliasing it.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let requestId = 0;

    const runCheck = async (view: import("@tiptap/pm/view").EditorView) => {
      const { doc } = view.state;
      // Use a blockSeparator so block boundaries cost exactly one character,
      // which keeps LanguageTool's char offsets aligned with ProseMirror
      // document positions (offset 0 in the text maps to position 1 in doc).
      const text = doc.textBetween(0, doc.content.size, "\n", " ");
      if (!text.trim()) {
        this.storage.matches = [];
        view.dispatch(view.state.tr.setMeta(pluginKey, DecorationSet.empty));
        return;
      }

      const currentRequest = ++requestId;
      this.storage.loading = true;

      try {
        const res = await fetch(this.options.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            text,
            language: this.options.language,
          }),
        });
        if (!res.ok) throw new Error(`LanguageTool request failed: ${res.status}`);
        const data = await res.json();

        // A slower response for a stale request should never clobber a
        // newer one that already landed.
        if (currentRequest !== requestId) return;

        const rawMatches: LanguageToolMatch[] = data.matches ?? [];
        const matches: GrammarMatch[] = rawMatches.map((m) => ({
          from: m.offset + 1,
          to: m.offset + 1 + m.length,
          message: m.message,
          shortMessage: m.shortMessage || m.message,
          replacements: m.replacements.slice(0, 5).map((r) => r.value),
        }));

        this.storage.matches = matches;
        this.storage.loading = false;

        const decorations = matches
          .filter((m) => m.to <= doc.content.size)
          .map((m, index) =>
            Decoration.inline(m.from, m.to, {
              class: "grammar-error",
              "data-match-index": String(index),
            })
          );

        view.dispatch(view.state.tr.setMeta(pluginKey, DecorationSet.create(doc, decorations)));
      } catch {
        this.storage.loading = false;
        // Fail silently: a network hiccup shouldn't interrupt writing.
      }
    };

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(pluginKey);
            if (meta) return meta;
            return tr.docChanged ? old.map(tr.mapping, tr.doc) : old;
          },
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state);
          },
        },
        view: (view) => {
          runCheck(view);
          return {
            update: (view, prevState) => {
              if (!view.state.doc.eq(prevState.doc)) {
                clearTimeout(timer);
                timer = setTimeout(() => runCheck(view), this.options.debounceMs);
              }
            },
            destroy: () => {
              clearTimeout(timer);
            },
          };
        },
      }),
    ];
  },
});

export default GrammarCheck;