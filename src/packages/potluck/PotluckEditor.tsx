import {
  useDocHandle,
  useDocument,
} from "@automerge/automerge-repo-react-hooks";
import {
  PlusIcon,
  TrashIcon,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { ArrowLeft, ArrowLeftRight, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ObjRef, PathRef, TextSpanRef } from "../../sdk/context/core/objRefs";
import { useSharedContext } from "../../sdk/context/core/hooks";
import { ToolProps } from "../../sdk/types";
import { useSelection } from "../../sdk/context/selection";
import { Codemirror } from "../../lib/codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { Decoration, EditorView } from "@codemirror/view";
import { AutomergeUrl } from "@automerge/automerge-repo";
import * as Automerge from "@automerge/automerge";
import { outdent } from "../../lib/outdents";
import { Extension } from "../../sdk/context/extensions";
import { deepEqual } from "../../lib/deepEqual";

type DisplayMode = "hide" | "replace" | "after" | "before";

type PotluckSearch = {
  pattern: string;
  extension?: string;
  // Per computed field display preference keyed by field name
  displayModes?: Record<string, DisplayMode>;
};

// Using shared `Extension` field; slot carries display mode and value carries text

export type DocWithPotluckSearches = {
  potluckSearches: PotluckSearch[];
};

export const PotluckEditor = ({ docUrl }: ToolProps) => {
  const docHandle = useDocHandle<DocWithPotluckSearches>(docUrl);
  const [doc, changeDoc] = useDocument<DocWithPotluckSearches>(docUrl);

  const addSearch = () => {
    changeDoc((doc) => {
      if (!doc.potluckSearches) {
        doc.potluckSearches = [];
      }

      doc.potluckSearches.push({
        pattern: "",
        extension: outdent`
          (groups, textSpanRef) => {
            
          }
        `,
        displayModes: {},
      });
    });
  };

  const potluckSearches = doc?.potluckSearches ?? [];

  if (!docHandle || !potluckSearches) {
    return null;
  }

  const deleteSearchAt = (index: number) => {
    changeDoc((doc) => {
      doc.potluckSearches.splice(index, 1);
    });
  };

  return (
    <div className="w-full h-full p-2 flex flex-col gap-2 bg-gray-100">
      {potluckSearches.map((search, index) => {
        const searchRef = new PathRef<PotluckSearch>(docHandle, [
          "potluckSearches",
          index,
        ]);
        return (
          <PotluckSearch
            searchRef={searchRef}
            index={index}
            docUrl={docUrl}
            key={index}
            onDelete={() => deleteSearchAt(index)}
          />
        );
      })}

      <button
        className="text-gray-600 hover:bg-gray-200 p-2 rounded-md w-full flex items-center justify-center gap-2 uppercase "
        onClick={addSearch}
      >
        <PlusIcon className="w-4 h-4" />
        <span>Add Search</span>
      </button>
    </div>
  );
};

export const PotluckSearch = ({
  searchRef,
  onDelete,
  index,
  docUrl,
}: {
  searchRef: ObjRef<PotluckSearch>;
  onDelete: () => void;
  index: number;
  docUrl: AutomergeUrl;
}) => {
  const { setSelection } = useSelection();
  const context = useSharedContext();
  const [isExtensionOpen, setIsExtensionOpen] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [computedValues, setComputedValues] = useState<
    Array<Record<string, string>>
  >([]);
  const displayModes = searchRef.value.displayModes ?? {};

  const onChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchRef.change((search) => {
      search.pattern = e.target.value;
    });
  };

  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const lastAppliedSelectionKeysRef = useRef<string[]>([]);

  useEffect(() => {
    const pattern = searchRef.value.pattern;

    const onChange = () => {
      const matchKeys = new Set<string>();

      if (pattern === "") {
        setMatches([]);
        return;
      }

      let regExp: RegExp | null = null;
      try {
        regExp = new RegExp(pattern, "g");
      } catch (e) {
        setError("Invalid regular expression");
        setMatches([]);
        return;
      }

      const nextMatches = context.getAll().flatMap((objRef) =>
        findMatches(objRef, regExp).filter((m) => {
          if (matchKeys.has(m.textSpan.toId())) {
            return false;
          }
          matchKeys.add(m.textSpan.toId());
          return true;
        })
      );

      setMatches((matches) => {
        console.log("matches changed", matches, nextMatches);
        return deepEqual(matches, nextMatches) ? matches : nextMatches;
      });

      setError(null);
    };

    onChange();

    context.subscribe(onChange);

    return () => {
      context.unsubscribe(onChange);
    };
  }, [searchRef.value.pattern]);

  // Single selection sync effect based on focus/hover state
  useEffect(() => {
    let desired = [] as TextSpanRef[];
    if (hoveredIndex !== null && matches[hoveredIndex]) {
      desired = [matches[hoveredIndex].textSpan];
    } else if (isInputFocused) {
      desired = matches.map((m) => m.textSpan);
    }

    const desiredKeys = desired.map((r) => r.toId()).sort();
    const currentKeys = lastAppliedSelectionKeysRef.current;
    const sameLength = currentKeys.length === desiredKeys.length;
    let equal = sameLength;
    if (sameLength) {
      for (let i = 0; i < currentKeys.length; i++) {
        if (currentKeys[i] !== desiredKeys[i]) {
          equal = false;
          break;
        }
      }
    }

    if (!equal) {
      lastAppliedSelectionKeysRef.current = desiredKeys;
      setSelection(desired);
    }
  }, [isInputFocused, hoveredIndex, matches, setSelection]);

  const path = useMemo(
    () => ["potluckSearches", index, "extension"] as Automerge.Prop[],
    [index]
  );

  // Evaluate extension function per match and collect computed fields
  useEffect(() => {
    const src = (searchRef.value.extension ?? "").trim();
    setExtensionError(null);

    if (!src) {
      setComputedValues(matches.map(() => ({})));
      return;
    }

    let fn: any;
    try {
      // Wrap to support arrow/function expressions
      // eslint-disable-next-line no-eval
      fn = (0, eval)(`(${src})`);
    } catch (e: any) {
      setExtensionError(`Extension syntax error: ${e?.message ?? String(e)}`);
      setComputedValues([]);
      return;
    }

    if (typeof fn !== "function") {
      setExtensionError("Extension must evaluate to a function");
      setComputedValues([]);
      return;
    }

    try {
      const results = matches.map((m) => {
        let result: any;
        try {
          result = fn(m.groups ?? {}, m.textSpan);
        } catch (e: any) {
          throw new Error(`Runtime error: ${e?.message ?? String(e)}`);
        }
        if (!result || typeof result !== "object")
          return {} as Record<string, string>;
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(result)) {
          out[k] = v == null ? "" : String(v);
        }
        return out;
      });
      setComputedValues(results);
    } catch (e: any) {
      setExtensionError(e?.message ?? String(e));
      setComputedValues([]);
    }
  }, [matches, searchRef.value.extension]);

  // Attach matches and computed fields to the shared context as fields.
  // Use a stable fingerprint to avoid re-applying identical overlays repeatedly.
  // Also retract previous overlay on cleanup to avoid accumulation.
  useEffect(() => {
    const retract = context.change((ctx) => {
      matches.forEach((m, idx) => {
        const computed = computedValues?.[idx] ?? {};
        ctx.add(m.textSpan);
        Object.entries(computed).forEach(([name, value]) => {
          const mode: DisplayMode = displayModes[name] ?? "after";
          ctx
            .add(m.textSpan)
            .with(Extension({ slot: mode, value: value ?? "" }));
        });
      });
    });
    return () => {
      retract();
    };
  }, [context, matches, computedValues, displayModes]);

  return (
    <div className="flex items-start gap-1">
      <button
        className="px-2 py-2 text-gray-500 hover:bg-gray-200 rounded"
        onClick={() => {
          if (!searchRef.value.extension) {
            // ensure field exists so editor has a string to bind to
            searchRef.change((s) => {
              (s as PotluckSearch).extension = "";
            });
          }
          setIsExtensionOpen((o) => !o);
        }}
        title={isExtensionOpen ? "Hide extension" : "Show extension"}
      >
        {isExtensionOpen ? (
          <ChevronDown size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
      </button>

      <div className="flex-1">
        <div className="flex flex-col border border-gray-300 rounded-md bg-white">
          <div className="flex items-stretch">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1 text-[10px] uppercase tracking-wide text-gray-400 pointer-events-none">
                Search
              </span>
              <input
                type="text"
                className="font-mono text-gray-700 pt-5 pb-2 px-2 w-full outline-none"
                value={searchRef.value.pattern}
                onChange={onChangeSearch}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
            </div>
            <button className="p-2 hover:bg-gray-200" onClick={onDelete}>
              <TrashIcon className="text-gray-500" size={20} />
            </button>
          </div>

          {isExtensionOpen && (
            <div className="border-t border-gray-300">
              <div className="relative">
                <span className="absolute left-2 top-1 text-[10px] uppercase tracking-wide text-gray-400 pointer-events-none">
                  Extension
                </span>
                <div className="pt-5 px-2">
                  <Codemirror
                    docUrl={docUrl}
                    path={path}
                    onChangeSelection={() => {}}
                    decorations={Decoration.none}
                    extensions={[
                      javascript(),
                      EditorView.lineWrapping,
                      EditorView.theme({
                        ".cm-editor": { height: "auto" },
                        ".cm-scroller": { overflow: "hidden" },
                        "&": {
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          fontSize: "12px",
                        },
                      }),
                    ]}
                  />
                </div>
                {extensionError && (
                  <p className="text-red-400 px-2 pb-2">{extensionError}</p>
                )}
              </div>
            </div>
          )}

          {(() => {
            if (matches.length === 0) return null;

            const groupKeys = Array.from(
              matches.reduce((acc, m) => {
                Object.keys(m.groups ?? {}).forEach((k) => acc.add(k));
                return acc;
              }, new Set<string>())
            );

            const computedKeys = Array.from(
              (computedValues ?? []).reduce((acc, obj) => {
                Object.keys(obj ?? {}).forEach((k) => acc.add(k));
                return acc;
              }, new Set<string>())
            );

            return (
              <div className="border-t border-gray-300">
                <table className="table-auto w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2 border-b border-gray-200 w-1/3">
                        match
                      </th>
                      {groupKeys.map((key) => (
                        <th
                          key={key}
                          className="text-left p-2 border-b border-gray-200"
                        >
                          {key}
                        </th>
                      ))}
                      {computedKeys.map((key) => (
                        <ComputedFieldHeader
                          key={`computed-${key}`}
                          fieldName={key}
                          mode={displayModes[key] ?? "after"}
                          onModeChange={(mode) => {
                            searchRef.change((s) => {
                              if (!(s as PotluckSearch).displayModes) {
                                (s as PotluckSearch).displayModes =
                                  {} as Record<string, DisplayMode>;
                              }
                              (s as PotluckSearch).displayModes![key] = mode;
                            });
                          }}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match, index) => {
                      const computed = computedValues?.[index] ?? {};
                      return (
                        <tr
                          key={index}
                          className="align-top hover:bg-gray-50 cursor-pointer"
                          onMouseEnter={() => {
                            setHoveredIndex(index);
                          }}
                          onMouseLeave={() => {
                            setHoveredIndex(null);
                          }}
                        >
                          <td className="p-2 border-b border-gray-100">
                            <div className="inline-block bg-white border border-gray-200 rounded shadow-sm px-1 max-w-[28rem] whitespace-pre-wrap break-words">
                              <span className="font-mono text-sm text-gray-800">
                                {match.textSpan.value}
                              </span>
                            </div>
                          </td>
                          {groupKeys.map((key) => (
                            <td
                              key={key}
                              className="p-2 border-b border-gray-100"
                            >
                              <span className="font-mono text-xs text-gray-700">
                                {match.groups?.[key] ?? ""}
                              </span>
                            </td>
                          ))}
                          {computedKeys.map((key) => {
                            const mode: DisplayMode =
                              displayModes[key] ?? "after";
                            const value = computed?.[key] ?? "";

                            return (
                              <td
                                key={`computed-${key}`}
                                className="p-2 border-b border-gray-100"
                              >
                                <span
                                  className={`font-mono text-xs text-gray-800`}
                                >
                                  {value}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

function ComputedFieldHeader({
  fieldName,
  mode,
  onModeChange,
}: {
  fieldName: string;
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLTableCellElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <th
      ref={ref}
      className="text-left p-2 border-b border-gray-200 relative"
      title={fieldName}
    >
      <div className="flex items-center gap-2">
        <span className="text-gray-500">{fieldName}</span>
        <button
          className="p-1 rounded hover:bg-gray-100"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle field display options"
        >
          {mode === "hide" ? (
            <EyeOff className="w-4 h-4 text-gray-600" />
          ) : (
            <Eye className="w-4 h-4 text-gray-800" />
          )}
        </button>
      </div>
      {open && (
        <FieldDisplayPopup
          mode={mode}
          onSelect={(next) => {
            onModeChange(next);
            setOpen(false);
          }}
        />
      )}
    </th>
  );
}

function FieldDisplayPopup({
  mode,
  onSelect,
}: {
  mode: DisplayMode;
  onSelect: (mode: DisplayMode) => void;
}) {
  const options: Array<{ key: DisplayMode; label: string; hint?: string }> = [
    { key: "hide", label: "Hidden" },
    { key: "replace", label: "Replace" },
    { key: "after", label: "After" },
    { key: "before", label: "Before" },
  ];

  return (
    <div className="absolute z-50 mt-1 right-2 top-full bg-white border border-gray-200 rounded shadow">
      <ul className="min-w-[220px] py-1">
        {options.map((opt) => {
          const Icon =
            opt.key === "hide"
              ? EyeOff
              : opt.key === "replace"
              ? ArrowLeftRight
              : opt.key === "after"
              ? ArrowRight
              : ArrowLeft;
          return (
            <li key={opt.key}>
              <button
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                  mode === opt.key ? "bg-gray-100" : ""
                }`}
                onClick={() => onSelect(opt.key)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-800">{opt.label}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Match = {
  groups: Record<string, string>;
  textSpan: TextSpanRef;
};

const findMatches = (objRef: ObjRef<unknown>, regex: RegExp): Match[] => {
  const value = objRef.value;

  if (typeof value !== "string") {
    return [];
  }

  const matches = [];
  let match;
  let lastIndex = -1;

  while ((match = regex.exec(value)) !== null) {
    if (match.index === lastIndex) {
      break; // Prevent infinite loop by breaking if no progress is made
    }
    lastIndex = match.index;

    const from = match.index;
    const to = from + match[0].length;

    if (from === to) {
      continue;
    }

    matches.push({
      groups: match.groups as Record<string, string>,
      textSpan: objRef.slice(from, to),
    });

    // If the match is an empty string, advance the regex lastIndex to prevent infinite loop
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }

  return matches;
};
