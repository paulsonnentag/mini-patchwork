import {
  AutomergeUrl,
  ChangeFn,
  isValidAutomergeUrl,
} from "@automerge/automerge-repo";
import { useDocument, useRepo } from "@automerge/automerge-repo-react-hooks";
import { useEffect, useState } from "react";
import { DataTypeTemplate } from "../../sdk/types";
import { DATA_TYPE_TEMPLATES, getDataType } from "../datatypes";
import { getEditor } from "../tools";
import { Branched } from "./Branched";

type AccountDoc = {
  documents: AutomergeUrl[];
};

type PatchworkDoc = {
  ["@pathwork"]: {
    type: string;
  };
};

export const Frame = () => {
  const repo = useRepo();
  const [selectedDocUrl, setSelectedDocUrl] = useDocUrl();
  const [doc, changeDoc] = useDocument<PatchworkDoc>(selectedDocUrl);
  const [accountDoc, changeAccountDoc] = useAccountDoc();

  const Editor = doc ? getEditor(doc?.["@pathwork"]?.type) : undefined;

  const addNewDocument = (template: DataTypeTemplate) => {
    const docHandle = repo.create<PatchworkDoc>();
    docHandle.change((doc) => {
      doc["@pathwork"] = {
        type: template.dataType,
      };
      template.init(doc, repo);
    });

    changeAccountDoc((doc) => {
      doc.documents.push(docHandle.url);
    });

    setSelectedDocUrl(docHandle.url);
  };

  if (!accountDoc) {
    return <div>Loading...</div>;
  }

  console.log(Editor);

  return (
    <div className="h-screen w-screen flex">
      <div className="w-[200px] flex-shrink-0 flex flex-col gap-2 bg-gray-100 p-2">
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

        {accountDoc.documents.map((docUrl) => (
          <DocumentLink
            key={docUrl}
            docUrl={docUrl}
            onSelect={() => setSelectedDocUrl(docUrl)}
            isSelected={docUrl === selectedDocUrl}
          />
        ))}
      </div>

      <div className="flex-1">
        {Editor && selectedDocUrl && (
          <Branched docUrl={selectedDocUrl} tool={Editor} />
        )}
      </div>
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
  const [doc, changeDoc] = useDocument<PatchworkDoc>(docUrl, {
    suspense: true,
  });

  const dataType = getDataType(doc?.["@pathwork"]?.type);

  return (
    <button
      className={`text-left ${isSelected ? "text-blue-500" : ""}`}
      onClick={onSelect}
    >
      {dataType?.getTitle(doc) || "Unknown Document"}
    </button>
  );
};

export const useDocUrl = (): [
  AutomergeUrl | undefined,
  (url: AutomergeUrl | undefined) => void
] => {
  const parseHashToDocUrl = (): AutomergeUrl | undefined => {
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return;
    try {
      const url = hash.slice(1);

      if (!isValidAutomergeUrl(url)) {
        return;
      }

      return url;
    } catch {
      return;
    }
  };

  const [docUrl, setDocUrlState] = useState<AutomergeUrl | undefined>(() =>
    parseHashToDocUrl()
  );

  useEffect(() => {
    const onHashChange = () => {
      setDocUrlState(parseHashToDocUrl());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setDocUrl = (url: AutomergeUrl | undefined) => {
    setDocUrlState(url);
    window.location.hash = url ? `#${url}` : "";
  };

  return [docUrl, setDocUrl];
};

export const useAccountDoc = (): [
  accountDoc: AccountDoc | undefined,
  changeAccountDoc: (fn: ChangeFn<AccountDoc>) => void
] => {
  const repo = useRepo();
  const [accountDocUrl, setAccountDocUrl] = useState<AutomergeUrl | undefined>(
    undefined
  );
  const [accountDoc, changeAccountDoc] = useDocument<AccountDoc>(accountDocUrl);

  useEffect(() => {
    const accountDocUrl = localStorage.getItem("patchwork:accountDocUrl");
    if (accountDocUrl && isValidAutomergeUrl(accountDocUrl)) {
      setAccountDocUrl(accountDocUrl);
    } else {
      const accountDocHandle = repo.create<AccountDoc>();
      accountDocHandle.change((doc) => {
        doc.documents = [];
      });
      setAccountDocUrl(accountDocHandle.url);
      localStorage.setItem("patchwork:accountDocUrl", accountDocHandle.url);
    }
  }, []);

  return [accountDoc, changeAccountDoc];
};
