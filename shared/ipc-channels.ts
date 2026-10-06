export const IPC_CHANNELS = {
  // VPN & Status
  GET_STATUS: 'get-status',
  TOGGLE_VPN: 'toggle-vpn',
  SET_APP_MODE: 'set-app-mode',
  STATUS_UPDATED: 'status-updated',

  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  SETTINGS_UPDATED: 'settings-updated',

  // Profiles
  GET_PROFILES: 'get-profiles',
  IMPORT_PROFILE: 'import-profile',
  IMPORT_VLESS_LINK: 'import-vless-link',
  SELECT_PROFILE: 'select-profile',
  DELETE_PROFILE: 'delete-profile',
  PROFILES_CLEAR_ALL: 'profiles:clear-all',

  // Audit & Telemetry
  RUN_SYSTEM_AUDIT: 'run-system-audit',
  TEST_LATENCY: 'test-latency',
  IS_DEV_BUILD: 'is-dev-build',

  // Logs
  SING_BOX_LOG: 'sing-box-log',
  GET_RECENT_LOGS: 'get-recent-logs',
  EXPORT_LOGS: 'export-logs',
  OPEN_LOGS_FOLDER: 'open-logs-folder',

  // Updater
  GET_APP_VERSION: 'get-app-version',
  CHECK_FOR_UPDATES: 'updater:check',
  START_UPDATE_DOWNLOAD: 'updater:start-download',
  QUIT_AND_INSTALL_UPDATE: 'updater:quit-and-install',
  UPDATER_CHECKING: 'updater:checking',
  UPDATER_AVAILABLE: 'updater:available',
  UPDATER_NOT_AVAILABLE: 'updater:not-available',
  UPDATER_PROGRESS: 'updater:progress',
  UPDATER_DOWNLOADED: 'updater:downloaded',
  UPDATER_ERROR: 'updater:error',
  OPEN_UPDATE_MODAL: 'open-update-modal',

  // AI Sentinel & Telemetry (FROZEN - BETA)
  AI_EXPLAIN_LOG: 'ai:explain-log',
  AI_GET_CARD: 'ai:get-card',
  AI_GET_ALL_CARDS: 'ai:get-all-cards',
  AI_CLEAR_CACHE: 'ai:clear-cache',
  AI_GET_CACHE_STATS: 'ai:get-cache-stats',
  AI_TEST_CONNECTION: 'ai:test-connection',
  AI_GET_TELEMETRY: 'ai:get-telemetry',
  AI_TELEMETRY_UPDATED: 'ai:telemetry-updated',
  AI_VERDICT_UPDATED: 'ai:verdict-updated',
  AI_EXPLAIN_AUDIT: 'ai:explain-audit',

  // Speedtest Engine
  RUN_SPEEDTEST: 'speedtest:run',
  CANCEL_SPEEDTEST: 'speedtest:cancel',
  SPEEDTEST_PROGRESS: 'speedtest:progress',

  // Window
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_TOGGLE_MAXIMIZE: 'window-toggle-maximize',
  WINDOW_IS_MAXIMIZED: 'window-is-maximized',
  WINDOW_MAXIMIZED_CHANGED: 'window-maximized-changed',
  WINDOW_CLOSE: 'window-close'
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]
