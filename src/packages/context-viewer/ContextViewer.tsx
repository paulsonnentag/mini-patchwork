import { useMemo, useState } from "react";
import { useDerivedSharedContext } from "../../sdk/context/core/hooks";
import { ToolProps } from "../../sdk/types";
import { TextSpanRef, type ObjRef } from "../../sdk/context/core/objRefs";

export const ContextViewer = (_props: ToolProps) => {
  const { rows, refMap } = useDerivedSharedContext((context) => {
    const dumpRows = context.dump();
    const refs = context.getAll();
    const map = new Map<string, ObjRef>();
    for (const ref of refs) {
      let key = (ref.path as any[]).join(".");
      if (ref instanceof TextSpanRef) key += `[${ref.from}:${ref.to}]`;
      map.set(key, ref);
    }
    return { rows: dumpRows, refMap: map };
  });

  const formatted = useMemo(() => {
    return rows.map(([path, field, value]) => {
      let fieldValuePretty: string;
      try {
        fieldValuePretty =
          typeof value === "string" ? value : JSON.stringify(value, null, 2);
      } catch {
        fieldValuePretty = String(value);
      }

      const pathKey = String(path ?? "");
      const ref = refMap.get(pathKey);

      return {
        path: pathKey,
        field: String(field ?? ""),
        fieldValuePretty,
        fieldValueRaw: value as any,
        ref,
      } as {
        path: string;
        field: string;
        fieldValuePretty: string;
        fieldValueRaw: any;
        ref: ObjRef | undefined;
      };
    });
  }, [rows, refMap]);

  if (!formatted.length) {
    return (
      <div className="w-full h-full p-2 text-sm text-gray-500">
        Context is empty.
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2">
      <div className="border border-gray-300 rounded-md bg-white overflow-hidden h-full flex flex-col">
        <div className="overflow-auto">
          <table className="table-auto w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 border-b border-gray-200 w-[30%]">
                  path
                </th>
                <th className="text-left p-2 border-b border-gray-200 w-[15%]">
                  field
                </th>
                <th className="text-left p-2 border-b border-gray-200 w-[25%]">
                  object
                </th>
                <th className="text-left p-2 border-b border-gray-200">
                  value
                </th>
              </tr>
            </thead>
            <tbody>
              {formatted.map((r, i) => (
                <tr key={i} className="align-top hover:bg-gray-50">
                  <td className="p-2 border-b border-gray-100">
                    <span className="font-mono text-xs text-gray-700 break-words">
                      {r.path}
                    </span>
                  </td>
                  <td className="p-2 border-b border-gray-100">
                    <span className="font-mono text-xs text-gray-700 break-words">
                      {r.field}
                    </span>
                  </td>
                  <td className="p-2 border-b border-gray-100">
                    <JsonPreview
                      value={r.ref ? (r.ref as any).value : undefined}
                    />
                  </td>
                  <td className="p-2 border-b border-gray-100">
                    <JsonPreview value={r.fieldValueRaw} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const JsonPreview = ({ value }: { value: any }) => {
  const [hover, setHover] = useState(false);

  let isObject = false;
  let oneLine = "";
  try {
    if (value === undefined) {
      oneLine = "";
    } else if (typeof value === "string") {
      oneLine = value;
    } else {
      isObject = typeof value === "object" && value !== null;
      oneLine = JSON.stringify(value);
    }
  } catch {
    oneLine = String(value);
  }

  const max = 120;
  const isTruncated = oneLine.length > max;
  const preview = isTruncated ? oneLine.slice(0, max) + "…" : oneLine;
  const showPopover = isObject && isTruncated;

  let pretty = "";
  if (showPopover) {
    try {
      pretty = JSON.stringify(value, null, 2);
    } catch {
      pretty = preview;
    }
  }

  return (
    <div
      className="relative inline-block max-w-[28rem]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="font-mono text-xs text-gray-700 break-words">
        {preview}
      </span>
      {showPopover && hover && (
        <div className="absolute z-10 mt-1 p-2 bg-white border border-gray-200 rounded shadow-md max-w-[32rem]">
          <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap break-words">
            {pretty}
          </pre>
        </div>
      )}
    </div>
  );
};
