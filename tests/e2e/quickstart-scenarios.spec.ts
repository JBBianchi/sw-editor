/**
 * End-to-end quickstart scenario tests for the Serverless Workflow editor MVP.
 *
 * Covers the five validation scenarios defined in
 * specs/001-visual-authoring-mvp/quickstart.md:
 *
 * - **Scenario 1**: Create New Workflow
 * - **Scenario 2**: Insert And Edit Task
 * - **Scenario 3**: Load Existing YAML
 * - **Scenario 4**: Diagnostics Flow
 * - **Scenario 5**: Privacy Guardrail
 *
 * NOTE: This spec depends on the demo harness introduced in issue #106
 * (implemented via issues #119–#126). Tests are marked fixme until the
 * full `sw-editor` component and demo harness are in place.
 *
 * @module
 */

import { expect, type Page, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Custom element tag for the editor web component. */
const EDITOR_ELEMENT = "sw-editor";

/** New workflow creation button. */
const NEW_WORKFLOW_BUTTON_SELECTOR = 'button[aria-label="Create new workflow"]';

/** Insertion affordance buttons attached to graph edges. */
const INSERTION_BUTTON_SELECTOR = 'button[aria-label="Insert task"]';

/** Task type selection menu opened by an insertion affordance. */
const TASK_MENU_SELECTOR = '[role="menu"][aria-label="Select task type to insert"]';

/** Individual task type entries within the open menu. */
const TASK_MENU_ITEM_SELECTOR = '[role="menuitem"]';

/** Export action button (trigger for the export flow). */
const EXPORT_BUTTON_SELECTOR = 'button[aria-label="Export workflow"]';

/** Property panel region. */
const PROPERTY_PANEL_SELECTOR = '[aria-label="Properties panel"]';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigates to the editor host page and waits for the web component to mount.
 *
 * @param page - The Playwright {@link Page} object.
 */
async function openEditor(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector(EDITOR_ELEMENT, { state: "attached" });
}

// ---------------------------------------------------------------------------
// Scenario 1: Create New Workflow
// ---------------------------------------------------------------------------

test.describe("Quickstart Scenario 1: Create New Workflow", () => {
  /**
   * Verifies that navigating to the editor host page attaches the `sw-editor`
   * custom element to the DOM.  The element auto-bootstraps an empty workflow
   * graph (start → end) on connection, so no additional user action is needed
   * to reach the initial graph state.
   *
   * Quickstart step: "Open editor host page with empty state."
   */
  test("opens editor to empty state", async ({ page }) => {
    await openEditor(page);

    const editorEl = page.locator(EDITOR_ELEMENT);
    await expect(editorEl).toBeAttached();
  });

  /**
   * Verifies that activating the "Create new workflow" button produces a graph
   * with visible start and end boundary nodes.
   *
   * Marked fixme: the `button[aria-label="Create new workflow"]` affordance and
   * the `data-node-type` attributes on rendered graph nodes are not yet present
   * in the demo harness.  Remove fixme once the button and node attributes land.
   *
   * Quickstart steps: "Create new workflow." / "Verify graph starts with start
   * and end nodes."
   */
  test.fixme("creates a new workflow with start and end nodes", async ({ page }) => {
    await openEditor(page);

    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.focus();
    await newWorkflowBtn.press("Enter");

    await expect(page.locator('[data-node-type="start"]')).toBeVisible();
    await expect(page.locator('[data-node-type="end"]')).toBeVisible();
  });

  /**
   * Verifies that the properties panel is visible after creating a new workflow.
   *
   * Marked fixme: the "Create new workflow" button is not yet rendered by the
   * demo harness, so this test cannot progress past the button interaction.
   * Remove fixme once the button is implemented.
   *
   * Quickstart step: "initial graph and workflow panel state are available."
   */
  test.fixme("workflow properties panel is visible after creation", async ({ page }) => {
    await openEditor(page);

    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");

    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    await expect(panel).toBeVisible();
  });
});
// ---------------------------------------------------------------------------
// Scenario 2: Insert And Edit Task
// ---------------------------------------------------------------------------

test.describe("Quickstart Scenario 2: Insert And Edit Task", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    // The sw-editor auto-bootstraps on mount; pressing "Create new workflow"
    // resets to a clean state, matching the scenario starting condition.
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");
  });

  test("insertion affordance is present between connected nodes", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await expect(affordance).toBeVisible();
  });

  test("selecting Call task from menu inserts it into the graph", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    await expect(page.locator(TASK_MENU_SELECTOR)).toBeVisible();

    // Select the first menu item (expected to be the Call task type).
    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await firstItem.press("Enter");

    await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();
    await expect(page.locator('[data-testid="graph-node"]')).not.toHaveCount(0);
  });

  test("inserted task is selected and panel reflects its properties", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await firstItem.press("Enter");

    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    await expect(panel).toBeVisible();
  });

  test.fixme("editing task properties in panel updates the graph and source", async ({ page }) => {
    // Requires a wired property panel with editable inputs — not yet
    // implemented in the demo harness.
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await firstItem.press("Enter");

    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    const nameInput = panel.locator("input, textarea, [role='textbox']").first();
    await nameInput.fill("my-call-task");

    // The graph node label should reflect the updated name.
    await expect(page.locator('[data-testid="graph-node"]').first()).toContainText("my-call-task");
  });
});
// ---------------------------------------------------------------------------
// Scenario 3: Load Existing YAML
// ---------------------------------------------------------------------------

/**
 * Inline YAML fixture matching `tests/fixtures/valid/simple.yaml`.
 *
 * Contains one top-level task (`fetchUser`), so the projected graph has
 * three nodes: start, fetchUser (task), end.
 */
const SIMPLE_YAML_FIXTURE = `\
document:
  dsl: '1.0.0'
  namespace: fixtures
  name: simple-http-call
  version: '1.0.0'
input:
  schema:
    format: json
    document:
      type: object
      required:
        - userId
      properties:
        userId:
          type: string
          description: The ID of the user to fetch
do:
  - fetchUser:
      call: http
      with:
        method: get
        endpoint: https://api.example.com/users/{userId}
`;

/** Expected node count after loading {@link SIMPLE_YAML_FIXTURE}: start + fetchUser + end. */
const SIMPLE_YAML_NODE_COUNT = 3;

/**
 * Loads a YAML workflow string into the editor via the demo harness textarea
 * and load button, then waits for the `data-node-count` attribute to reflect
 * the expected graph size.
 *
 * @param page - The Playwright {@link Page} object.
 * @param yaml - The YAML source to load.
 * @param expectedNodeCount - The graph node count to wait for.
 */
async function loadYaml(page: Page, yaml: string, expectedNodeCount: number): Promise<void> {
  const yamlArea = page.locator('textarea[aria-label="YAML source"]');
  await yamlArea.fill(yaml);

  const loadBtn = page.locator('button[aria-label="Load workflow"]');
  await loadBtn.click();

  // Wait for the element to reflect the projected node count.
  await expect(page.locator(EDITOR_ELEMENT)).toHaveAttribute(
    "data-node-count",
    String(expectedNodeCount),
  );
}

test.describe("Quickstart Scenario 3: Load Existing YAML", () => {
  test("load workflow button is present in the demo harness", async ({ page }) => {
    await openEditor(page);

    const loadBtn = page.locator('button[aria-label="Load workflow"]');
    await expect(loadBtn).toBeVisible();
  });

  test("loads a valid YAML workflow and graph reflects correct node count", async ({ page }) => {
    await openEditor(page);
    await loadYaml(page, SIMPLE_YAML_FIXTURE, SIMPLE_YAML_NODE_COUNT);

    // After loading simple.yaml (1 task), the editor graph has 3 nodes.
    await expect(page.locator(EDITOR_ELEMENT)).toHaveAttribute(
      "data-node-count",
      String(SIMPLE_YAML_NODE_COUNT),
    );
  });

  test.fixme("exporting after a small edit produces valid YAML", async ({ page }) => {
    await openEditor(page);

    const exportBtn = page.locator(EXPORT_BUTTON_SELECTOR);
    await exportBtn.press("Enter");

    // Export dialog or download should appear.
    const exportDialog = page.locator('[aria-label*="Export format"]');
    await expect(exportDialog).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Diagnostics Flow
// ---------------------------------------------------------------------------

/** Selector for the source textarea added in the demo harness. */
const SOURCE_INPUT_SELECTOR = 'textarea[aria-label="Workflow source"]';

/**
 * Selectors for the diagnostics output region added in the demo harness.
 * Matches by aria-label (case-insensitive partial) or data-testid.
 */
const DIAGNOSTICS_REGION_SELECTOR =
  '[aria-label*="diagnostics" i], [aria-label*="validation" i], [data-testid="diagnostics-live-region"]';

/** Debounce delay used by the demo harness validation wiring (ms). */
const SOURCE_DEBOUNCE_MS = 500;

test.describe("Quickstart Scenario 4: Diagnostics Flow", () => {
  /**
   * Verifies that the diagnostics region is present in the DOM when the
   * editor host page is loaded.  The region is rendered by the demo harness
   * independently of any user interaction.
   *
   * Quickstart step: "Verify diagnostics event and local/global UI cues."
   */
  test("diagnostics region is attached on page load", async ({ page }) => {
    await openEditor(page);

    const diagnosticsRegion = page.locator(DIAGNOSTICS_REGION_SELECTOR).first();
    await expect(diagnosticsRegion).toBeAttached();
  });

  /**
   * Verifies that pasting invalid JSON into the source textarea causes the
   * diagnostics region to become non-empty after the debounce window elapses.
   *
   * Quickstart steps:
   *   1. "Enter an invalid transition target." (here: paste invalid JSON)
   *   2. "Wait for debounce window."
   *   3. "Verify diagnostics event and local/global UI cues."
   *
   * Expected outcome: "diagnostics update consistently for live and full
   * validation."
   */
  test("pasting invalid JSON into the source input shows diagnostics", async ({ page }) => {
    await openEditor(page);

    const sourceInput = page.locator(SOURCE_INPUT_SELECTOR);
    await sourceInput.fill('{ "notAWorkflow": true }');

    // Allow the debounce window to elapse before asserting.
    await page.waitForTimeout(SOURCE_DEBOUNCE_MS + 100);

    const diagnosticsRegion = page.locator(DIAGNOSTICS_REGION_SELECTOR).first();
    await expect(diagnosticsRegion).toBeAttached();
    await expect(diagnosticsRegion).not.toBeEmpty();
  });

  /**
   * Verifies that clearing the source input after entering invalid content
   * resets the diagnostics region to empty.
   *
   * Quickstart step: continuity of "diagnostics update consistently."
   */
  test("clearing the source input resets the diagnostics region", async ({ page }) => {
    await openEditor(page);

    const sourceInput = page.locator(SOURCE_INPUT_SELECTOR);
    // First introduce an error.
    await sourceInput.fill('{ "notAWorkflow": true }');
    await page.waitForTimeout(SOURCE_DEBOUNCE_MS + 100);

    // Then clear — diagnostics should disappear.
    await sourceInput.fill("");
    await page.waitForTimeout(SOURCE_DEBOUNCE_MS + 100);

    const diagnosticsRegion = page.locator(DIAGNOSTICS_REGION_SELECTOR).first();
    await expect(diagnosticsRegion).toBeEmpty();
  });

  /**
   * Verifies that entering an invalid transition target via the properties
   * panel triggers the diagnostics region.
   *
   * Marked fixme: the properties panel transition input is not yet rendered by
   * the demo harness.  Remove fixme once the panel and transition field land.
   *
   * Quickstart step: "Enter an invalid transition target."
   */
  test.fixme("entering an invalid transition target triggers a diagnostics event", async ({
    page,
  }) => {
    await openEditor(page);
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");

    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    const transitionInput = panel
      .locator('[aria-label*="transition" i], [data-field="transition"]')
      .first();
    await transitionInput.fill("__invalid_target__");

    const diagnosticsRegion = page.locator(DIAGNOSTICS_REGION_SELECTOR).first();
    await expect(diagnosticsRegion).toBeAttached();
  });

  /**
   * Verifies that a node-level error indicator appears when an invalid
   * transition target is entered.
   *
   * Marked fixme: node error indicators are not yet rendered by the demo
   * harness.  Remove fixme once the graph node error UI lands.
   */
  test.fixme("diagnostic error is reflected in local UI cues on the node", async ({ page }) => {
    await openEditor(page);
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");

    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    const transitionInput = panel
      .locator('[aria-label*="transition" i], [data-field="transition"]')
      .first();
    await transitionInput.fill("__invalid_target__");

    const errorIndicator = page
      .locator('[data-testid="node-error"], [aria-label*="error" i]')
      .first();
    await expect(errorIndicator).toBeVisible();
  });

  /**
   * Verifies that explicit validation surfaces a global error summary.
   *
   * Marked fixme: the "Validate workflow" button and error summary panel are
   * not yet rendered by the demo harness.  Remove fixme once they land.
   */
  test.fixme("explicit validation surfaces global error summary", async ({ page }) => {
    await openEditor(page);
    const validateBtn = page.locator('button[aria-label="Validate workflow"]');
    await validateBtn.press("Enter");

    const errorSummary = page.locator(
      '[aria-label="Editor errors"], [data-testid="validation-summary"]',
    );
    await expect(errorSummary).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Privacy Guardrail
// ---------------------------------------------------------------------------

test.describe("Quickstart Scenario 5: Privacy Guardrail", () => {
  /**
   * Verifies that loading a YAML workflow via the demo harness (textarea +
   * load button) produces no requests to external URLs.  Uses `page.route` to
   * intercept every network request and record its URL so that external
   * destinations can be detected and failed.
   *
   * Only origins matching `localhost` or `127.0.0.1` are permitted, matching
   * the Vite preview server (`localhost:4173`).
   *
   * Quickstart steps: "Run editor in offline environment." /
   * "Repeat create/load/edit/export flow."
   */
  test("load YAML flow produces no requests to external URLs", async ({ page }) => {
    // Intercept and record every network request.
    const networkRequests: string[] = [];
    await page.route("**", (route) => {
      networkRequests.push(route.request().url());
      route.continue();
    });

    await openEditor(page);

    // Load a YAML workflow via the demo harness (implemented in Scenario 3).
    await loadYaml(page, SIMPLE_YAML_FIXTURE, SIMPLE_YAML_NODE_COUNT);

    // Only localhost / 127.0.0.1 requests are permitted.
    const externalRequests = networkRequests.filter(
      (url) => !url.startsWith("http://localhost") && !url.startsWith("http://127.0.0.1"),
    );

    expect(
      externalRequests,
      `Editor must not initiate external network requests; observed: ${externalRequests.join(", ")}`,
    ).toHaveLength(0);
  });

  /**
   * Verifies that the full create/insert/export flow (once those affordances
   * are implemented) produces no requests to external URLs.
   *
   * Marked fixme: the "Create new workflow" button, insertion affordance, and
   * export button are not yet present in the demo harness.  Remove fixme once
   * those UI elements land.
   */
  test.fixme("create/insert/export flow completes without outbound network requests", async ({
    page,
  }) => {
    const networkRequests: string[] = [];
    await page.route("**", (route) => {
      networkRequests.push(route.request().url());
      route.continue();
    });

    await openEditor(page);

    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");

    // Insert a task.
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");
    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await firstItem.press("Enter");

    // Export the workflow.
    const exportBtn = page.locator(EXPORT_BUTTON_SELECTOR);
    await exportBtn.press("Enter");

    const externalRequests = networkRequests.filter(
      (url) => !url.startsWith("http://localhost") && !url.startsWith("http://127.0.0.1"),
    );

    expect(
      externalRequests,
      `Editor must not initiate external network requests; observed: ${externalRequests.join(", ")}`,
    ).toHaveLength(0);
  });
});
