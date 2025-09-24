import * as Automerge from "@automerge/automerge";
import { AutomergeUrl } from "@automerge/automerge-repo";
import {
  useDocHandle,
  useDocument,
  useRepo,
} from "@automerge/automerge-repo-react-hooks";
import { startTransition, useEffect, useMemo, useState } from "react";
import { PathRef, RefWith } from "@patchwork/context";
import { Diff, getDiffOfDoc } from "@patchwork/context/diff";
import { useSubcontext } from "@patchwork/context/react";

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

export const BranchedEditor = ({ docUrl }: { docUrl: AutomergeUrl }) => {
  const repo = useRepo();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const checkedOutDocUrl = selectedBranch?.docUrl ?? docUrl;
  const docHandle = useDocHandle(checkedOutDocUrl);
  const [doc, changeDoc] = useDocument<DocWithBranchesMetadata>(docUrl);
  const [highlightChanges, setHighlightChanges] = useState(true);

  const checkedOutDocHandle = useDocHandle(checkedOutDocUrl);
  const checkedOutDoc = useDocument(checkedOutDocUrl);

  const currentDocContext = useSubcontext();

  useEffect(() => {
    if (!docHandle || !doc) {
      return;
    }

    const docRef = new PathRef(docHandle, []);

    currentDocContext.replace(docRef);
  }, [doc, currentDocContext, docHandle]);

  const diffsOfDoc = useMemo<RefWith<Diff>[]>(() => {
    // make eslint happy, we need checkedOutDoc as a dependency because we need
    // to re-run the diff when the checked out doc changes
    void checkedOutDoc;

    if (!selectedBranch || !highlightChanges) {
      return [];
    }

    return getDiffOfDoc(
      checkedOutDocHandle,
      highlightChanges ? selectedBranch?.forkedAt : undefined
    );
  }, [checkedOutDocHandle, highlightChanges, selectedBranch, checkedOutDoc]);

  const diffContext = useSubcontext();

  useEffect(() => {
    diffContext.replace(diffsOfDoc);
  }, [diffContext, diffsOfDoc]);

  // create branches doc if it doesn't exist
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
    doc?.branchesDocUrl
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
        <Embed docUrl={checkedOutDocUrl} key={checkedOutDocUrl} />
      </div>
    </div>
  );
};

const Embed = ({ docUrl }: { docUrl: AutomergeUrl }) => {
  return <rootstock-tool doc-url={docUrl} tool-id="todo" />;
};
