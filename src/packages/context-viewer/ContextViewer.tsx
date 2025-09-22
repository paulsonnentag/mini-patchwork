import { useReactive } from "../../sdk/reactive/react";
import { Ref, TextSpanRef } from "../../sdk/context/refs";
import { ToolProps } from "../../sdk/types";
import { contextComputation } from "../../sdk/context/computation";

const Refs = () => contextComputation((context) => context.refs);

export const ContextViewer = (props: ToolProps) => {
  const refs = useReactive(Refs);

  // Sort refs by refToString
  const sortedRefs = refs.slice().sort((a, b) => {
    const aString = refToString(a);
    const bString = refToString(b);
    return aString.localeCompare(bString);
  });

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Ref
          </th>
          <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Value
          </th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {sortedRefs.map((ref) => (
          <>
            <tr key={ref.toId()}>
              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                <span className="bg-blue-100 border border-blue-300 rounded-md p-1 font-mono">
                  {refToString(ref)}
                </span>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-sm text-blue-900 font-mono">
                {valueToString(ref.value)}
              </td>
            </tr>
            {ref.fields.map(([field, value]) => (
              <tr key={field.toString()}>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                  {symbolToString(field)}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-blue-900 font-mono">
                  {valueToString(value)}
                </td>
              </tr>
            ))}
            <tr>
              <td
                colSpan={2}
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
              >
                <hr className="border-gray-200" />
              </td>
            </tr>
          </>
        ))}
      </tbody>
    </table>
  );
};

const refToString = (ref: Ref) => {
  const shortId = ref.docUrl;

  if (ref instanceof TextSpanRef) {
    return `${shortId}/${ref.path.join("/")}[${
      ref.from === ref.to ? ref.from : `${ref.from}:${ref.to}]`
    }]`;
  }

  return `${shortId}${ref.path.length > 0 ? "/" : ""}${ref.path.join("/")}`;
};

const symbolToString = (symbol: symbol) => {
  const symbolString = symbol.toString();
  return symbolString.slice(7, -1); // Removes 'Symbol(' from start and ')' from end
};

const valueToString = (value: any) => {
  return JSON.stringify(value, (key, value) => {
    if (value instanceof Ref) {
      return refToString(value);
    }

    return value;
  });
};
