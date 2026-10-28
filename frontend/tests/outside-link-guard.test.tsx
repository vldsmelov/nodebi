import { useRef } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { useOutsideLinkGuard } from "@/features/workspace/useOutsideLinkGuard";

it("defers outside route links until the editor permits them and replays exactly once", () => {
  const follow = vi.fn(), leave = vi.fn();
  function Editor() { const ref = useRef<HTMLDivElement>(null); useOutsideLinkGuard(ref, true, leave); return <><a href="/another" onClick={event => { event.preventDefault(); follow(); }}>Outside</a><div ref={ref}><a href="/inside" onClick={event => { event.preventDefault(); follow(); }}>Inside</a></div></>; }
  render(<Editor />);
  fireEvent.click(screen.getByText("Outside"));
  expect(follow).not.toHaveBeenCalled(); expect(leave).toHaveBeenCalledOnce();
  leave.mock.calls[0][0]();
  expect(follow).toHaveBeenCalledOnce(); expect(leave).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByText("Inside"));
  expect(follow).toHaveBeenCalledTimes(2); expect(leave).toHaveBeenCalledOnce();
});
it("does not intercept in-page anchors, downloads or modified/new-tab clicks", () => {
  const leave = vi.fn();
  function Editor() { const ref = useRef<HTMLDivElement>(null); useOutsideLinkGuard(ref, true, leave); return <><div ref={ref} /><a href="#local" onClick={e => e.preventDefault()}>Local</a><a href="/another" target="_blank" onClick={e => e.preventDefault()}>New tab</a><a href="/file" download onClick={e => e.preventDefault()}>Download</a><a href="/other" onClick={e => e.preventDefault()}>Modified</a></>; }
  render(<Editor />);
  for (const name of ["Local", "New tab", "Download"]) fireEvent.click(screen.getByText(name));
  fireEvent.click(screen.getByText("Modified"), { ctrlKey: true });
  expect(leave).not.toHaveBeenCalled();
});
