import type { ReactElement } from "react";

import type { TemplateType } from "@/collections/Templates";

export type RenderBrand = {
  name: string;
  font: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  logoUrl?: string | null;
};

export type RenderProps = {
  copy?: string;
  imageUrl?: string;
  caption?: string;
  attribution?: string;
};

export type TemplateDef = {
  key: string;
  name: string;
  type: TemplateType;
  active: boolean;
  render: (args: { brand: RenderBrand; props: RenderProps }) => ReactElement;
};
