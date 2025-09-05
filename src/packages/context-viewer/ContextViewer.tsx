import { useMemo, useState } from "react";
import { ToolProps } from "../../sdk/types";
import { TextSpanRef, type Ref } from "../../sdk/context/core/refs";
import { useSharedContextComputation } from "../../sdk/context/core/hooks";

export const ContextViewer = (props: ToolProps) => {
  const { rows, refMap } = useSharedContextComputation((context) => {
    const refs = context.refs;
    const map = new Map<string, Ref>();
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
        ref: Ref | undefined;
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
