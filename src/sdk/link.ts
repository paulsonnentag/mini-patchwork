import { defineField } from "./context/fields";
import { Ref } from "./context/refs";

type LinkValue = {
  ref: Ref;
};

const LinkSymbol = Symbol("link");
export type Link = typeof LinkSymbol;
export const Link = defineField<Link, LinkValue>("link", LinkSymbol);
