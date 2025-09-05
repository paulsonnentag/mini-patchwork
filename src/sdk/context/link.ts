import { defineField } from "./core/fields";
import { Ref } from "./core/refs";

type LinkValue = {
  ref: Ref;
};

const LinkSymbol = Symbol("link");
export type Link = typeof LinkSymbol;
export const Link = defineField<Link, LinkValue>("link", LinkSymbol);
