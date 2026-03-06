# Storybook

This repository uses [Storybook 8](https://storybook.js.org/) with the `@storybook/react-vite` framework to develop and document UI components in isolation.

---

## Running Storybook

```bash
# Start the development server (http://localhost:6006)
pnpm storybook

# Build a static Storybook site
pnpm build-storybook
```

Both commands are defined at the workspace root and do not require changing directories.

---

## Project layout

```
.storybook/
  main.ts                          # Framework, addons, story glob, Vite aliases
  preview.ts                       # Global decorators and parameters
  html-story.tsx                   # htmlStory() wrapper for vanilla DOM / web components
  decorators/
    react-flow-decorator.tsx       # reactFlowDecorator — wraps stories in ReactFlowProvider

packages/
  editor-renderer-react-flow/src/  # React component stories  (*.stories.tsx)
  editor-web-component/src/        # Web component stories    (*.stories.ts)
```

Story files are discovered automatically by the glob `packages/**/*.stories.@(ts|tsx)`.

---

## Adding a story for a React component

Create a `<ComponentName>.stories.tsx` file next to the component source.

```tsx
// packages/editor-renderer-react-flow/src/nodes/MyNode.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyNode } from "./MyNode.js";

const meta: Meta<typeof MyNode> = {
  title: "ReactFlow/MyNode",
  component: MyNode,
};

export default meta;
type Story = StoryObj<typeof MyNode>;

export const Default: Story = {
  args: { /* component props */ },
};
```

### React Flow components

Components that use React Flow internals (handles, node context) must include the `reactFlowDecorator` so the required context is available in isolation:

```tsx
import { reactFlowDecorator } from "../../../../.storybook/decorators/react-flow-decorator.js";

const meta: Meta<typeof MyNode> = {
  title: "ReactFlow/MyNode",
  component: MyNode,
  decorators: [reactFlowDecorator],
};
```

---

## Adding a story for a vanilla DOM or web component

Because Storybook runs a single React-based instance, plain DOM elements are mounted through the `htmlStory()` helper. Use a `.stories.ts` file (no JSX needed).

```ts
// packages/editor-web-component/src/my-feature/MyElement.stories.ts
import type { Meta, StoryObj } from "@storybook/react";
import { htmlStory } from "../../../../.storybook/html-story.js";
import { MyElement } from "./my-element.js";

const meta = {
  title: "Web Components/MyElement",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = htmlStory(() => {
  const el = new MyElement();
  el.setAttribute("label", "Hello");
  return el;
});
```

`htmlStory(factory)` calls `factory()` once per render, appends the returned `HTMLElement` to a React host `<div>`, and removes it on unmount. The factory receives no arguments; all state must be set up inside it.

---

## Conventions

| Convention | Detail |
|------------|--------|
| File extension | `.stories.tsx` for React components, `.stories.ts` for vanilla DOM |
| `title` format | `"ReactFlow/<ComponentName>"` or `"Web Components/<ComponentName>"` |
| `reactFlowDecorator` | Required for any React Flow node or edge component |
| `htmlStory` wrapper | Required for any vanilla DOM or web component story |
| Module-level JSDoc | Add a `@module` doc comment at the top of each stories file |
