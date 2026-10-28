"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { SpreadsheetLink } from "./open-window";

/** Legacy data-update links consistently open the standalone editor, including generic source choice. */
export default function SourceAwareLink(props: ComponentProps<typeof NextLink>) {
  const match = typeof props.href === "string" ? /^\/projects\/([^/]+)\/data\/update(?:\?(.*))?$/.exec(props.href) : null;
  if (!match) return <NextLink {...props} />;
  const source = new URLSearchParams(match[2] ?? "").get("source") ?? undefined;
  return <SpreadsheetLink project={match[1]} source={source} className={props.className}>{props.children}</SpreadsheetLink>;
}
