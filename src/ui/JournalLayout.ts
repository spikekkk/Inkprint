export type JournalLayoutMode = "mobile" | "desktop";
export type ComposerPlacement = "after-selected-week" | "top";

export interface JournalLayout {
  mode: JournalLayoutMode;
  showCalendar: boolean;
  composerPlacement: ComposerPlacement;
}

export function getJournalLayout(isMobile: boolean): JournalLayout {
  return isMobile
    ? {
        mode: "mobile",
        showCalendar: true,
        composerPlacement: "after-selected-week",
      }
    : {
        mode: "desktop",
        showCalendar: false,
        composerPlacement: "top",
      };
}
