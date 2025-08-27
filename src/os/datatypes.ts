import { EmbarkTemplate } from "../packages/embark";
import { MarkdownDataType, MarkdownTemplate } from "../packages/markdown";
import { TodoDataType, TodoDataTypeTemplate } from "../packages/todo";
import { DataType, DataTypeTemplate } from "../sdk/types";

export const DATA_TYPES: DataType<any>[] = [MarkdownDataType, TodoDataType];

export const DATA_TYPE_TEMPLATES: DataTypeTemplate<any>[] = [
  MarkdownTemplate,
  EmbarkTemplate,
  TodoDataTypeTemplate,
];

export const getDataType = (dataType: string) => {
  return DATA_TYPES.find((dt) => dt.id === dataType);
};
