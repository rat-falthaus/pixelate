import { getActiveTheme } from "../../../lib/config";
import type { BrandTheme } from "../../../lib/types";
import { persistSettings } from "../admin/persist-settings";
import { renderAdminSettings } from "../admin/render-admin-settings";
import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { applyWorkspaceSettings } from "../ui/apply-workspace-settings";
import { notify } from "../ui/notify";

/** Connect palette selection, creation, deletion, and color-row creation. */
export function bindThemeEvents(): void {
  getElement("setting-theme").addEventListener("change", () => {
    model.config.activeThemeId = (getElement("setting-theme") as HTMLSelectElement).value;
    model.clusterToTheme = [];
    persistSettings();
    renderAdminSettings();
    applyWorkspaceSettings();
  });
  getElement("add-color").addEventListener("click", () => {
    const theme = getActiveTheme(model.config);
    const choices = ["#56CCF2", "#EB5757", "#F2C94C", "#9B51E0", "#2F80ED", "#6FCF97"];
    theme.colors.push(choices[theme.colors.length % choices.length]);
    persistSettings();
    renderAdminSettings();
    applyWorkspaceSettings();
  });
  getElement("new-theme").addEventListener("click", () => {
    const theme: BrandTheme = {
      id: `palette-${Date.now().toString(36)}`,
      name: `Brand palette ${model.config.themes.length + 1}`,
      colors: ["#F2C94C", "#56CCF2", "#EB5757", "#2F80ED"],
    };
    model.config.themes.push(theme);
    model.config.activeThemeId = theme.id;
    model.clusterToTheme = [];
    persistSettings();
    renderAdminSettings();
    applyWorkspaceSettings();
  });
  getElement("delete-theme").addEventListener("click", () => {
    if (model.config.themes.length <= 1) {
      notify("Keep at least one brand palette.");
      return;
    }
    model.config.themes = model.config.themes.filter(
      (theme) => theme.id !== model.config.activeThemeId,
    );
    model.config.activeThemeId = model.config.themes[0].id;
    persistSettings();
    renderAdminSettings();
    applyWorkspaceSettings();
  });
}
