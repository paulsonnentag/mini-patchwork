import {
  useDocHandle,
  useDocument,
} from "@automerge/automerge-repo-react-hooks";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ObjRef, PathRef, TextSpanRef } from "../../sdk/context/core/objRefs";
import { useSharedContext } from "../../sdk/context/core/sharedContext";
import { ToolProps } from "../../sdk/types";

type PotluckSearch = {
  pattern: string;
};

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

      doc.potluckSearches.push({ pattern: "" });
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
            key={index}
            onDelete={() => deleteSearchAt(index)}
          />
        );
      })}

      <button
        className="border border-gray-400 border-dashed text-gray-400 p-2 rounded-md w-full flex items-center justify-center gap-2"
        onClick={addSearch}
      >
        <PlusIcon />
        <span>Search</span>
      </button>
    </div>
  );
};

export const PotluckSearch = ({
  searchRef,
  onDelete,
}: {
  searchRef: ObjRef<PotluckSearch>;
  onDelete: () => void;
}) => {
  const context = useSharedContext();

  const onChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchRef.change((search) => {
      search.pattern = e.target.value;
    });
  };

  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pattern = searchRef.value.pattern;

    const matchKeys = new Set<string>();

    const onChange = () => {
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

      const matches = context.getAllObjRefs().flatMap((objRef) =>
        findMatches(objRef, regExp).filter((m) => {
          if (matchKeys.has(m.textSpan.toKey())) {
            return false;
          }
          matchKeys.add(m.textSpan.toKey());
          return true;
        })
      );

      setMatches(matches);
      setError(null);
    };

    onChange();

    context.onChange(onChange);

    return () => {
      context.offChange(onChange);
    };
  }, [searchRef.value.pattern]);

  return (
    <div className="flex flex-col border border-gray-300 rounded-md bg-white">
      <div className="flex">
        <input
          type="text"
          className="font-mono text-gray-500 p-2 flex-1 outline-none"
          value={searchRef.value.pattern}
          onChange={onChangeSearch}
        />
        <button className="p-2 hover:bg-gray-200" onClick={onDelete}>
          <TrashIcon className="text-gray-500" />
        </button>
      </div>
      {error && (
        <p className="text-red-400 p-2 border-t border-gray-300">{error}</p>
      )}

      <div className="border-t border-gray-300 w-full"></div>

      {(() => {
        if (matches.length === 0) return null;

        const groupKeys = Array.from(
          matches.reduce((acc, m) => {
            Object.keys(m.groups ?? {}).forEach((k) => acc.add(k));
            return acc;
          }, new Set<string>())
        );

        return (
          <div className="overflow-auto">
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
                </tr>
              </thead>
              <tbody>
                {matches.map((match, index) => (
                  <tr key={index} className="align-top">
                    <td className="p-2 border-b border-gray-100">
                      <div className="inline-block bg-white border border-gray-200 rounded shadow-sm px-1 max-w-[28rem] whitespace-pre-wrap break-words">
                        <span className="font-mono text-sm text-gray-800">
                          {match.textSpan.value}
                        </span>
                      </div>
                    </td>
                    {groupKeys.map((key) => (
                      <td key={key} className="p-2 border-b border-gray-100">
                        <span className="font-mono text-xs text-gray-700">
                          {match.groups?.[key] ?? ""}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
};

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
