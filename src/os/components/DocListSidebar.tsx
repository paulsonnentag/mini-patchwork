import { AutomergeUrl } from "@automerge/automerge-repo";
import { DATA_TYPE_TEMPLATES, getDataType } from "../datatypes";
import { useDocument, useRepo } from "@automerge/automerge-repo-react-hooks";
import { DataTypeTemplate, PatchworkDoc } from "../../sdk/types";

type DocListSidebarProps = {
  selectedDocUrl: AutomergeUrl | undefined;
  setSelectedDocUrl: (url: AutomergeUrl) => void;
  accountUrl: AutomergeUrl;
};

type AccountDoc = {
  documents: AutomergeUrl[];
};

export const DocListSidebar = ({
  selectedDocUrl,
  setSelectedDocUrl,
  accountUrl,
}: DocListSidebarProps) => {
  const [accountDoc, changeAccountDoc] = useDocument<AccountDoc>(accountUrl);
  const repo = useRepo();

  const addNewDocument = (template: DataTypeTemplate) => {
    const docHandle = repo.create<PatchworkDoc>();
    docHandle.change((doc) => {
      doc["@patchwork"] = {
        type: template.dataType,
      };
      template.init(doc, repo);
    });

    changeAccountDoc((doc) => {
      doc.documents.push(docHandle.url);
    });

    setSelectedDocUrl(docHandle.url);
  };

  return (
    <div className="w-[200px] flex-shrink-0 flex flex-col gap-2 bg-gray-100 p-2 border-r border-gray-300">
      <div className="text-gray-500">Mini Patchwork</div>

      <div className="border-b border-gray-300"></div>
      {DATA_TYPE_TEMPLATES.map((template, index) => (
        <button
          className="text-left"
          key={index}
          onClick={() => addNewDocument(template)}
        >
          + {template.name}
        </button>
      ))}
      <div className="border-b border-gray-300"></div>

      {accountDoc &&
        accountDoc.documents.map((docUrl) => (
          <DocumentLink
            key={docUrl}
            docUrl={docUrl}
            onSelect={() => {
              setSelectedDocUrl(docUrl);
            }}
            isSelected={docUrl === selectedDocUrl}
          />
        ))}
    </div>
  );
};

export const DocumentLink = ({
  docUrl,
  onSelect,
  isSelected,
}: {
  docUrl: AutomergeUrl;
  onSelect: () => void;
  isSelected: boolean;
}) => {
  const [doc] = useDocument<PatchworkDoc>(docUrl);

  const dataType = doc ? getDataType(doc) : undefined;

  return (
    <button
      className={`text-left ${isSelected ? "text-blue-500" : ""}`}
      onClick={onSelect}
    >
      {dataType?.getTitle(doc) || "Unknown Document"}
    </button>
  );
};
