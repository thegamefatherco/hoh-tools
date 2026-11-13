/** Game pages: the side panel and the toolbar button are enabled on these tabs only. */
const GAME_URL = /^https?:\/\/(?:[^/]+\.)?heroesgame\.com\//u;
const GAME_URL_PATTERN = "*://*.heroesgame.com/*";
const PANEL_PATH = "sidepanel.html";

/** Enables the panel and the button on game tabs, and disables (and closes) them elsewhere. */
const syncTab = async (
  tabId: number,
  url: string | undefined
): Promise<void> => {
  const isGame = url !== undefined && GAME_URL.test(url);
  if (isGame) {
    await Promise.all([
      browser.sidePanel.setOptions({ enabled: true, path: PANEL_PATH, tabId }),
      browser.action.enable(tabId),
    ]);
    return;
  }
  await Promise.all([
    browser.sidePanel.setOptions({ enabled: false, tabId }),
    browser.action.disable(tabId),
  ]);
};

/** Off by default everywhere; game tabs opt in. */
const configure = async (): Promise<void> => {
  await Promise.all([
    browser.sidePanel.setOptions({ enabled: false }),
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }),
    browser.action.disable(),
  ]);
  const gameTabs = await browser.tabs.query({ url: GAME_URL_PATTERN });
  await Promise.all(
    gameTabs.map((tab) =>
      tab.id === undefined ? Promise.resolve() : syncTab(tab.id, tab.url)
    )
  );
};

export default defineBackground(() => {
  // Firefox has no side panel API: there the panel is a sidebar, available on every site.
  if (browser.sidePanel === undefined) {
    return;
  }

  browser.runtime.onInstalled.addListener(() => {
    void configure();
  });
  browser.runtime.onStartup.addListener(() => {
    void configure();
  });
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url !== undefined || changeInfo.status === "complete") {
      void syncTab(tabId, tab.url);
    }
  });
});
