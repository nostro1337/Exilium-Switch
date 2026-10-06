# Отчет о разработке и рефакторинге (29.08.2026) — Exilium Switch v1.5.8

Данный документ содержит исчерпывающее описание всех архитектурных решений, исправлений, изменений в кодовой базе и компонентов, затронутых в рамках текущей сессии разработки.

---

## 1. Общие цели и контекст сессии

1. **Интеграция концепции AI & Телеметрии** на базе `docs/AI_INTEGRATION_VISION_AND_PLAN.md`.
2. **Изоляция DEV-сборки**: поднятие версии до `1.5.8`, сохранение полной изоляции рабочего окружения (`%APPDATA%\ExiliumSwitch-Dev`) от боевого клиента (`C:\Program Files\Exilium Switch`).
3. **Устранение критических сетевых и системных недочетов**:
   - Зависание родительских процессов `cmd.exe` при сосуществовании с Zapret/GoodbyeDPI.
   - Ошибочные показания задержки 0–1 ms из-за локального перехвата сокетов драйвером Wintun.
   - Потеря сохранения API ключа Gemini в настройках.
   - Необходимость ручного сброса кэша Antigravity IDE при переключении VPN.
4. **Стратегический рефакторинг UI (Plan Mode)**:
   - Заморозка экспериментальных AI-фич (`// [FROZEN - BETA]`) и блокировка их на UI.
   - Перевод окна настроек на модульный аккордеон с 5 раскрывающимися категориями.
   - Возврат и глубокая переработка блока «Виджеты» (Часовой пояс, ГЕО служба, реальный Speedtest & Ping).
5. **Quality Gate**: поддержание 100% прохождения тестов при покрытии строк `>= 80%`.

---

## 2. Хронология и детализация выполненных работ

### 2.1. Исследование и адаптация Google Generative AI (Gemini 3.6 Flash)
- **Проблема**: Ключи Google AI Studio нового формата выдавали ошибку `HTTP 404 (Model gemini-2.0-flash / gemini-2.5-flash is not available)`.
- **Решение**:
  - В `electron/services/ai.service.ts` внедрен каскадный список моделей с приоритетом `gemini-3.6-flash` ➔ `gemini-3.5-flash` ➔ `gemini-3.1-flash-lite` ➔ `gemini-flash-latest`.
  - Реализован отказоустойчивый механизм `callGemini()` с автоматическим перебором моделей при 404 / 429 ошибках.
  - Реализован сервис локального кэширования `electron/services/ai-cache.service.ts` на диске с TTL и LRU эвиhandling.

### 2.2. Ликвидация зомби-процессов Zapret (`zapret.service.ts`)
- **Проблема**: При паузе Zapret процесс `winws.exe` останавливался, но запустивший его командный интерпретатор `cmd.exe` оставался висеть в памяти Windows.
- **Решение**:
  - Метод `pauseZapretIfRunning()` дополнен адресным завершением дерева процессов через WMI / PowerShell.
  - Метод `resumeZapretIfPaused()` переведен на полностью скрытый запуск (`-WindowStyle Hidden` и `windowsHide: true`).

### 2.3. Достоверный замер сетевой задержки (ICMP Ping + HTTP Canary RTT)
- **Проблема**: Замер пинга через TCP сокет отдавал 0–1 ms, так как виртуальный сетевой стек драйвера Wintun локально отвечал ACK до отправки пакета в физический туннель.
- **Решение** (`electron/services/network.service.ts`):
  - Реализован физический ICMP ping через `ping.exe` до внешнего VPS в Амстердаме (`89.124.94.246`) с парсингом как русскоязычного (`Среднее = 112 мсек`), так и англоязычного (`Average = 112ms`) вывода.
  - Внедрен fallback: если значение `<= 2 ms` (локальный перехват) или ICMP блокируется, сервис измеряет сквозной HTTP RTT через туннель до `https://www.google.com/generate_204`.
  - Результат: честные физические **95–120 ms** (Томск ➔ Амстердам).

### 2.4. Авто-очистка кэша Antigravity IDE при переключении туннеля
- **Проблема**: При включении или выключении VPN сетевые сокеты Antigravity IDE залипали на старых маршрутах, требуя перезапуска IDE или ручного удаления кэша.
- **Решение** (`electron/services/network.service.ts` & `electron/services/singbox.service.ts`):
  - Создан метод `clearIdeAndDnsCache()`, производящий удаление `$env:APPDATA\antigravity-ide\Cache` и `Code Cache` через `fs.rmSync` и нативную команду PowerShell, а также сброс DNS (`ipconfig /flushdns`, `Clear-DnsClientCache`).
  - Вызов метода интегрирован в `SingBoxService.start()` и `SingBoxService.stop()`.

### 2.5. Исправление сохранения настроек (`SettingsModal.tsx`)
- **Проблема**: Кнопка сохранения в `SettingsModal.tsx` отправляла фиксированный объект без полей `geminiApiKey` и `aiEnabled`, из-за чего введенный ключ не сохранялся в `%APPDATA%\ExiliumSwitch-Dev\settings.json`.
- **Решение**: Поля включены в `handleSave()`, а кнопка «Тест» настроена на атомарное мгновенное сохранение ключа при успешной валидации.

### 2.6. Заморозка AI-функционала (Icebox & Beta Freeze)
- По согласованию все экспериментальные модули ИИ временно заморожены:
  - Сервисы `ai.service.ts`, `telemetry.service.ts`, `ai-cache.service.ts` снабжены маркерами `// [FROZEN - BETA]`.
  - UI-компоненты `AIExplanationModal.tsx`, `SentinelDiagnosisModal.tsx`, `SentinelDashboard.tsx` отключены от активного жизненного цикла.
  - В настройках блок AI помечен бейджем `BETA` и заблокирован тултипом *"Раздел временно заморожен (В разработке)"*.

### 2.7. Редизайн Настроек — Аккордеон категорий (`SettingsModal.tsx`)
Настройки переведены на современный компонент со сворачиваемыми секциями (`framer-motion`):
1. 📁 **1. Основные параметры**: Автозапуск Windows, сворачивание в трей, запуск свернутым.
2. 🛡️ **2. Сетевой щит (Resident Shield)**: Реальный и подменный часовые пояса, маскировка локалей.
3. ⚡ **3. Сосуществование с Zapret & GoodbyeDPI**: Авто-пауза при старте VPN.
4. 🛠️ **4. Обслуживание и Кэш**: 1-клик очистка кэша IDE & DNS, путь к хранилищу конфигураций, проверка обновлений.
5. 🧠 **5. AI Sentinel [BETA]**: Блок в разработке.

### 2.8. Блок «Виджеты» и сервис реального Speedtest (`ResidentWidgets.tsx` & `SpeedtestService.ts`)
- **Виджет 1: Часовой пояс**: Отображает статус маскировки. В режиме «Дом» переключает на `W. Europe Standard Time` (индикатор белый), в «Офис» — `Tomsk Standard Time` (индикатор зеленый). Клик открывает модальное окно с деталями.
- **Виджет 2: ГЕО Служба (lfsvc)**: В режиме «Дом» блокирует службу геолокации Windows для предотвращения утечки Wi-Fi BSSID координат, в режиме «Офис» оставляет штатную работу.
- **Виджет 3: Speedtest & Ping**:
  - Кнопка «Пинг» — мгновенный замер физической задержки.
  - Кнопка «Speedtest» — запуск потокового замера входящей и исходящей скорости через CDN Cloudflare Speed (`/__down` и `/__up`) в реальном времени с прогресс-баром и выводом `Mbps`.
  - Сервис `SpeedtestService` поддерживает отмену (`cancel()`) и непрерывную передачу прогресса по каналу `IPC_CHANNELS.SPEEDTEST_PROGRESS`.

---

## 3. Реестр измененных и созданных файлов

| Путь к файлу | Статус | Назначение |
| :--- | :--- | :--- |
| `[shared/types/speedtest.types.ts](file:///e:/Code/ExiliumSwitch/shared/types/speedtest.types.ts)` | **NEW** | Типизация результатов и прогресса Speedtest (`SpeedtestResult`, `SpeedtestProgress`) |
| `[shared/types/index.ts](file:///e:/Code/ExiliumSwitch/shared/types/index.ts)` | **MODIFY** | Экспорт типов Speedtest |
| `[shared/ipc-channels.ts](file:///e:/Code/ExiliumSwitch/shared/ipc-channels.ts)` | **MODIFY** | Регистрация каналов `RUN_SPEEDTEST`, `CANCEL_SPEEDTEST`, `SPEEDTEST_PROGRESS` |
| `[electron/services/speedtest.service.ts](file:///e:/Code/ExiliumSwitch/electron/services/speedtest.service.ts)` | **NEW** | Потоковый сервис измерения скорости и пинга (Cloudflare Speed + ICMP) |
| `[electron/services/network.service.ts](file:///e:/Code/ExiliumSwitch/electron/services/network.service.ts)` | **MODIFY** | ICMP `ping.exe` парсер, HTTP Canary RTT, очистка кэша IDE & DNS |
| `[electron/services/singbox.service.ts](file:///e:/Code/ExiliumSwitch/electron/services/singbox.service.ts)` | **MODIFY** | Автоматический вызов очистки кэша при `start()` и `stop()` |
| `[electron/services/zapret.service.ts](file:///e:/Code/ExiliumSwitch/electron/services/zapret.service.ts)` | **MODIFY** | Ликвидация висящих процессов `cmd.exe` при паузе Zapret |
| `[electron/services/ai.service.ts](file:///e:/Code/ExiliumSwitch/electron/services/ai.service.ts)` | **MODIFY** | Поддержка Gemini 3.6 Flash, каскадный fallback, пометка `[FROZEN - BETA]` |
| `[electron/core/window-manager.ts](file:///e:/Code/ExiliumSwitch/electron/core/window-manager.ts)` | **MODIFY** | Добавлен безопасный метод `broadcast()` для передачи событий в UI |
| `[electron/ipc/system.ipc.ts](file:///e:/Code/ExiliumSwitch/electron/ipc/system.ipc.ts)` | **MODIFY** | Регистрация обработчиков IPC для Speedtest |
| `[electron/preload.ts](file:///e:/Code/ExiliumSwitch/electron/preload.ts)` | **MODIFY** | Добавление методов Speedtest в `window.electronAPI` |
| `[src/hooks/useSpeedtest.ts](file:///e:/Code/ExiliumSwitch/src/hooks/useSpeedtest.ts)` | **NEW** | React-хук управления состоянием и прогрессом замера скорости |
| `[src/components/ResidentWidgets.tsx](file:///e:/Code/ExiliumSwitch/src/components/ResidentWidgets.tsx)` | **NEW** | Минималистичные карточки виджетов (Часовой пояс, ГЕО, Speedtest) |
| `[src/components/SettingsModal.tsx](file:///e:/Code/ExiliumSwitch/src/components/SettingsModal.tsx)` | **MODIFY** | Модульный аккордеон с 5 категориями, сохранение ключа, BETA-блокировка |
| `[src/App.tsx](file:///e:/Code/ExiliumSwitch/src/App.tsx)` | **MODIFY** | Интеграция `ResidentWidgets`, удаление тяжелого Sentinel HUD |
| `[tests/services/speedtest.service.test.ts](file:///e:/Code/ExiliumSwitch/tests/services/speedtest.service.test.ts)` | **NEW** | Модульные тесты сервиса Speedtest |
| `[tests/components/resident-widgets.test.tsx](file:///e:/Code/ExiliumSwitch/tests/components/resident-widgets.test.tsx)` | **NEW** | Модульные тесты компонента ResidentWidgets |
| `[tests/hooks/useSpeedtest.test.ts](file:///e:/Code/ExiliumSwitch/tests/hooks/useSpeedtest.test.ts)` | **NEW** | Модульные тесты хука useSpeedtest |

---

## 4. Сводные показатели тестирования и сборки

| Метрика | Значение | Норматив | Статус |
| :--- | :--- | :--- | :--- |
| **Тестовые файлы Vitest** | **50 файлов** | — | ✅ 100% Pass |
| **Всего тестов** | **171 тест** | — | ✅ 100% Pass |
| **Покрытие строк (`% Lines`)** | **81.54%** | `>= 80%` | ✅ Quality Gate пройден |
| **Покрытие функций (`% Funcs`)** | **85.38%** | `>= 85%` | ✅ Quality Gate пройден |
| **Компиляция TypeScript** | `0 ошибок` | `0` | ✅ Успешно |
| **Сборка DEV пакета** | `release/DevBuild/win-unpacked/Exilium Switch.exe` | — | ✅ Собрано и пропатчено |
