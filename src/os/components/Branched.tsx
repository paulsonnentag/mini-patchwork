import * as Automerge from "@automerge/automerge";
import { startTransition, Suspense, useEffect, useState } from "react";
import {
  useDocHandle,
  useDocument,
  useRepo,
} from "@automerge/automerge-repo-react-hooks";
import { AutomergeUrl } from "@automerge/automerge-repo";
import { useAddDiffOfDoc } from "../../sdk/context/diff";
import { EditorProps } from "../../sdk/types";

type BranchedProps = EditorProps & {
  docUrl: string;
  tool: React.FC<EditorProps>;
};

type Branch = {
  name: string;
  forkedAt: Automerge.Heads;
  docUrl: AutomergeUrl;
};

type BranchesDoc = {
  branches: Branch[];
};

type DocWithBranchesMetadata = {
  branchesDocUrl: AutomergeUrl;
};

export const Branched = ({ docUrl, tool: Tool }: BranchedProps) => {
  const repo = useRepo();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const checkedOutDocUrl = selectedBranch?.docUrl ?? docUrl;
  const docHandle = useDocHandle(checkedOutDocUrl, {
    suspense: true,
  });
  const [doc, changeDoc] = useDocument<DocWithBranchesMetadata>(docUrl, {
    suspense: true,
  });
  const [highlightChanges, setHighlightChanges] = useState(true);

  const checkedOutDocHandle = useDocHandle(checkedOutDocUrl, {
    suspense: true,
  });

  useAddDiffOfDoc(
    checkedOutDocHandle,
    highlightChanges ? selectedBranch?.forkedAt : undefined
  );

  const shouldAddBranchesDocUrl = doc && doc.branchesDocUrl === undefined;

  useEffect(() => {
    if (shouldAddBranchesDocUrl) {
      changeDoc((doc) => {
        const handle = repo.create<BranchesDoc>();
        handle.change((doc) => {
          doc.branches = [];
        });
        doc.branchesDocUrl = handle.url;
      });
    }
  }, [shouldAddBranchesDocUrl, docUrl, repo, changeDoc]);

  // expose docHandle to window for debugging
  useEffect(() => {
    (window as any).handle = docHandle;
  }, [docHandle]);

  const [branchesDoc, changeBranchesDoc] = useDocument<BranchesDoc>(
    doc.branchesDocUrl,
    {
      suspense: true,
    }
  );

  const createBranch = () => {
    if (!doc) {
      return;
    }

    const branchDocHandle = repo.clone(checkedOutDocHandle!);

    changeBranchesDoc((branchesDoc) => {
      const branch: Branch = {
        name: "Branch #" + (branchesDoc.branches.length + 1),
        forkedAt: Automerge.getHeads(doc),
        docUrl: branchDocHandle.url,
      };

      branchesDoc.branches.push(branch);
      setSelectedBranch(branch);
    });
  };

  const handleBranchChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    startTransition(() => {
      setSelectedBranch(
        branchesDoc?.branches.find(
          (branch) => branch.docUrl === event.target.value
        ) ?? null
      );
    });
  };

  if (!branchesDoc) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-row gap-2 p-2 border-b border-gray-200">
        <select
          value={checkedOutDocUrl}
          onChange={handleBranchChange}
          className="w-[200px] border border-gray-300 rounded-md p-2"
        >
          <option value={docUrl}>Main</option>
          {branchesDoc?.branches.map((branch) => (
            <option value={branch.docUrl} key={branch.docUrl}>
              {branch.name}
            </option>
          ))}
        </select>

        <button
          onClick={createBranch}
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          Create Branch
        </button>

        <div className="flex-1" />

        {selectedBranch && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={highlightChanges}
              onChange={() => setHighlightChanges(!highlightChanges)}
            />
            Highlight changes
          </label>
        )}
      </div>
      <div className="flex-1">
        <Tool docUrl={checkedOutDocUrl} />
      </div>
    </div>
  );
};
