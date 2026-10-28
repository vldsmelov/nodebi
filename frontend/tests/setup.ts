import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetDocumentDrafts } from "@/features/workspace/document-drafts";

afterEach(() => { cleanup(); resetDocumentDrafts(); });
