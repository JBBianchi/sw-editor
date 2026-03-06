/**
 * Utility for rendering vanilla DOM elements and Web Components as Storybook
 * stories within the React-based Storybook framework.
 *
 * Storybook supports only one framework per instance. Rather than running a
 * second Storybook instance with `@storybook/html-vite`, this wrapper lets
 * plain DOM components coexist with React stories in the same project.
 *
 * @example
 * ```ts
 * // my-element.stories.ts
 * import type { Meta, StoryObj } from "@storybook/react";
 * import { htmlStory } from "../../.storybook/html-story";
 *
 * const meta = {
 *   title: "Web Components/MyElement",
 * } satisfies Meta;
 *
 * export default meta;
 * type Story = StoryObj<typeof meta>;
 *
 * export const Default: Story = htmlStory(() => {
 *   const el = document.createElement("my-element");
 *   el.setAttribute("label", "Hello");
 *   return el;
 * });
 * ```
 */

import { useEffect, useRef, type ReactElement } from "react";

/**
 * Creates a Storybook story object whose `render` function mounts a vanilla
 * DOM element (or Web Component) inside a React wrapper.
 *
 * @param factory - A function that returns an `HTMLElement` to mount.
 *   Called once per story render. The element is appended to a host `<div>`
 *   and removed on unmount.
 * @returns A partial story object with a `render` function suitable for use
 *   as a CSF3 named export.
 */
export function htmlStory(factory: () => HTMLElement): { render: () => ReactElement } {
  return {
    render: () => <HtmlHost factory={factory} />,
  };
}

/**
 * React component that hosts a vanilla DOM element produced by `factory`.
 *
 * @param props.factory - A function returning the HTMLElement to mount.
 */
function HtmlHost({ factory }: { factory: () => HTMLElement }): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const element = factory();
    container.appendChild(element);
    return () => {
      element.remove();
    };
  }, [factory]);

  return <div ref={containerRef} />;
}
