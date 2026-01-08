import { type Command, App, TFile, Notice } from "obsidian";
import type PeriodicNotesPlugin from "src/main";

import type { Granularity } from "./types";

interface IDisplayConfig {
  periodicity: string;
  relativeUnit: string;
  labelOpenPresent: string;
}

export const displayConfigs: Record<Granularity, IDisplayConfig> = {
  day: {
    periodicity: "daily",
    relativeUnit: "today",
    labelOpenPresent: "Open today's daily note",
  },
  week: {
    periodicity: "weekly",
    relativeUnit: "this week",
    labelOpenPresent: "Open this week's note",
  },
  month: {
    periodicity: "monthly",
    relativeUnit: "this month",
    labelOpenPresent: "Open this month's note",
  },
  quarter: {
    periodicity: "quarterly",
    relativeUnit: "this quarter",
    labelOpenPresent: "Open this quarter's note",
  },
  year: {
    periodicity: "yearly",
    relativeUnit: "this year",
    labelOpenPresent: "Open this year's note",
  },
};

async function jumpToAdjacentNote(
  app: App,
  plugin: PeriodicNotesPlugin,
  direction: "forwards" | "backwards"
): Promise<void> {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) return;
  const activeFileMeta = plugin.findInCache(activeFile.path);
  if (!activeFileMeta) return;

  const adjacentNoteMeta = plugin.findAdjacent(
    activeFileMeta.calendarSet,
    activeFile.path,
    direction
  );

  if (adjacentNoteMeta) {
    const file = app.vault.getAbstractFileByPath(adjacentNoteMeta.filePath);
    if (file && file instanceof TFile) {
      const leaf = app.workspace.getUnpinnedLeaf();
      await leaf.openFile(file, { active: true });
    }
  } else {
    const qualifier = direction === "forwards" ? "after" : "before";
    new Notice(
      `There's no ${
        displayConfigs[activeFileMeta.granularity].periodicity
      } note ${qualifier} this`
    );
  }
}

async function openAdjacentNote(
  app: App,
  plugin: PeriodicNotesPlugin,
  direction: "forwards" | "backwards"
): Promise<void> {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) return;
  const activeFileMeta = plugin.findInCache(activeFile.path);
  if (!activeFileMeta) return;

  const offset = direction === "forwards" ? 1 : -1;
  const adjacentDate = activeFileMeta.date
    .clone()
    .add(offset, activeFileMeta.granularity);

  plugin.openPeriodicNote(activeFileMeta.granularity, adjacentDate);
}

async function generateFutureNotes(
  plugin: PeriodicNotesPlugin,
  granularity: Granularity
): Promise<void> {
  const config = plugin.calendarSetManager.getActiveConfig(granularity);
  const weeksInAdvance = config.weeksInAdvance || 0;

  if (weeksInAdvance <= 0) {
    new Notice("Please configure 'Weeks in Advance' in settings first");
    return;
  }

  let created = 0;
  for (let i = 0; i <= weeksInAdvance; i++) {
    const date = window.moment().add(i, granularity);
    const existingNote = plugin.getPeriodicNote(granularity, date);

    if (!existingNote) {
      await plugin.createPeriodicNote(granularity, date);
      created++;
    }
  }

  const periodicity = displayConfigs[granularity].periodicity;
  new Notice(
    `Created ${created} future ${periodicity} note${created !== 1 ? "s" : ""}`
  );
}

export function getCommands(
  app: App,
  plugin: PeriodicNotesPlugin,
  granularity: Granularity
): Command[] {
  const config = displayConfigs[granularity];

  const commands: Command[] = [
    {
      id: `open-${config.periodicity}-note`,
      name: config.labelOpenPresent,
      callback: () => plugin.openPeriodicNote(granularity, window.moment()),
    },

    {
      id: `next-${config.periodicity}-note`,
      name: `Jump forwards to closest ${config.periodicity} note`,
      checkCallback: (checking: boolean) => {
        const activeFile = app.workspace.getActiveFile();
        if (checking) {
          if (!activeFile) return false;
          return plugin.isPeriodic(activeFile.path, granularity);
        }
        jumpToAdjacentNote(app, plugin, "forwards");
      },
    },
    {
      id: `prev-${config.periodicity}-note`,
      name: `Jump backwards to closest ${config.periodicity} note`,
      checkCallback: (checking: boolean) => {
        const activeFile = app.workspace.getActiveFile();
        if (checking) {
          if (!activeFile) return false;
          return plugin.isPeriodic(activeFile.path, granularity);
        }
        jumpToAdjacentNote(app, plugin, "backwards");
      },
    },
    {
      id: `open-next-${config.periodicity}-note`,
      name: `Open next ${config.periodicity} note`,
      checkCallback: (checking: boolean) => {
        const activeFile = app.workspace.getActiveFile();
        if (checking) {
          if (!activeFile) return false;
          return plugin.isPeriodic(activeFile.path, granularity);
        }
        openAdjacentNote(app, plugin, "forwards");
      },
    },
    {
      id: `open-prev-${config.periodicity}-note`,
      name: `Open previous ${config.periodicity} note`,
      checkCallback: (checking: boolean) => {
        const activeFile = app.workspace.getActiveFile();
        if (checking) {
          if (!activeFile) return false;
          return plugin.isPeriodic(activeFile.path, granularity);
        }
        openAdjacentNote(app, plugin, "backwards");
      },
    },
  ];

  // Add "Generate future notes" command for weekly notes if configured
  if (granularity === "week") {
    const periodicConfig = plugin.calendarSetManager.getActiveConfig(granularity);
    if (periodicConfig.weeksInAdvance && periodicConfig.weeksInAdvance > 0) {
      commands.push({
        id: `generate-future-${config.periodicity}-notes`,
        name: `Generate future ${config.periodicity} notes`,
        callback: () => generateFutureNotes(plugin, granularity),
      });
    }
  }

  return commands;
}
