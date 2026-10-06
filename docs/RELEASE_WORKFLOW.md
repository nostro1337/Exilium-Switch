# Регламент релиза и обновления Exilium Switch

> Данный документ является обязательной пошаговой инструкцией для AI-агентов и разработчиков при выпуске новых версий приложения **Exilium Switch**.

---

## 1. Архитектура и структура версионирования

### Ветвление в Git
* **`dev`** — основная рабочая ветка для разработки, фиксов и тестирования. Все изменения сначала коммитятся сюда.
* **`main`** — релизная ветка. Код попадает сюда **только** через merge из `dev` при выпуске стабильной версии.
* **Теги (`vX.X.X`)** — выставляются на коммит в ветке `main` и инициируют создание релиза.

### Ключевые компоненты механизма обновлений
1. **`electron-updater`**: модуль внутри клиента, опрашивающий GitHub Releases каждые 60 секунд.
2. **`latest.yml`**: манифест с хешами sha512 и версией, по которому клиент понимает, что доступна новая версия.
3. **`.blockmap`**: файл дифференциального обновления. Позволяет скачивать не 110 МБ заново, а только изменившиеся блоки (дельта).
4. **Хук `afterPack` ([`scripts/after-pack.cjs`](file:///e:/Code/ExiliumSwitch/scripts/after-pack.cjs))**:
   * Вшивает `app-update.yml` в `resources/`.
   * Копирует `icon.ico` и `icon.png` прямо в `resources/` для runtime-доступа.
   * Патчит `Exilium Switch.exe` через `rcedit-x64.exe` (иконка Nostro, манифест **`requireAdministrator`**, метаданные версии).
5. **Динамическая версия UI**:
   * В окне обновлений ([`UpdateModal.tsx`](file:///e:/Code/ExiliumSwitch/src/components/UpdateModal.tsx)) версия загружается динамически через `window.electronAPI.getAppVersion()`, а бэйджик `«Текущая»` выставляется на соответствующий пункт истории изменений.

---

## 2. Пошаговый регламент: "Выпускаем новую версию"

Когда поступила команда выпустить обновление, последовательно выполняются **7 шагов**:

### Шаг 1. Контроль качества и покрытие тестами (Quality Gate)
Перед началом релиза запустить полный набор тестов Vitest с проверкой покрытия:
```powershell
npm run test:coverage
```
* **Требование:** 100% тестов должны пройти успешно, а покрытие строк (`% Lines`) обязано быть **>= 80%**.

### Шаг 2. Локальная верификация сборки
Убедиться, что TypeScript и сборщик Vite компилируются без ошибок:
```powershell
npm run build
```
*(Код завершения должен быть 0).*

### Шаг 3. Поднятие версии (SemVer)
1. В файле [`package.json`](file:///e:/Code/ExiliumSwitch/package.json) изменить поле `"version"` (например, `1.5.4` $\to$ `1.5.5`).
2. В файле [`src/components/UpdateModal.tsx`](file:///e:/Code/ExiliumSwitch/src/components/UpdateModal.tsx) добавить запись в массив `CHANGELOG_DATA`.
3. В файле [`src/App.tsx`](file:///e:/Code/ExiliumSwitch/src/App.tsx) обновить `currentVersion="1.5.5"`.
4. В файле [`src/components/TitleBar.tsx`](file:///e:/Code/ExiliumSwitch/src/components/TitleBar.tsx) обновить fallback версии.
5. В файле [`scripts/after-pack.cjs`](file:///e:/Code/ExiliumSwitch/scripts/after-pack.cjs) обновить fallback версии.
6. В файлах тестов [`tests/`](file:///e:/Code/ExiliumSwitch/tests) актуализировать мок-версию.

### Шаг 4. Фиксация в Git (dev $\to$ main $\to$ tag)
Сделать коммит в `dev`, смерджить в `main` и проставить тег с флагом `[skip ci]`.
```powershell
# 1. Коммит в dev
git add .
git commit -m "feat: release v1.5.8 - описание изменений [skip ci]"
git push origin dev

# 2. Мердж в main
git checkout main
git merge dev -m "release: v1.5.8 [skip ci]"
git push origin main

# 3. Создание и отправка тега
git tag -a v1.5.8 -m "Release v1.5.8"
git push origin v1.5.8

# 4. Возврат в dev для дальнейшей работы
git checkout dev
```

### Шаг 5. Локальная сборка и прямая публикация на GitHub (БЕЗ GitHub Actions)
> **Критический регламент:** Облачные GitHub Actions для сборки релизов **отключены**. Бесплатные Windows-раннеры GitHub имеют огромные очереди ожидания (по 20–40 минут на старт задачи) и медленную компиляцию. 
> Публикация релиза выполняется **строго напрямую с локального ПК** разработчика через [`scripts/publish_release.py`](file:///e:/Code/ExiliumSwitch/scripts/publish_release.py) (или команду `npm run release`). Вся сборка и загрузка артефактов занимает всего **~40 секунд**!

Запуск релиза одной командой:
```powershell
npm run release
```
*(Или напрямую: `python scripts/publish_release.py`)*

Что делает скрипт [`publish_release.py`](file:///e:/Code/ExiliumSwitch/scripts/publish_release.py):
1. **Автоматически извлекает токен GitHub** из Windows Credential Manager (`git credential fill`).
2. **Компилирует TypeScript и Vite** (`npm run build`).
3. **Собирает NSIS-установщик и Portable бинарник**, генерирует `.blockmap` и `latest.yml`.
4. **Загружает артефакты в GitHub Releases** через `electron-builder --win --publish always`.
5. **Обновляет заголовок и подробный чейнджлог** релиза на GitHub на русском языке через GitHub API.

### Шаг 6. Верификация артефактов на GitHub Releases
Убедиться, что в релизе на GitHub присутствуют все 4 обязательных файла:
* `Exilium-Switch-Setup-X.X.X.exe` (установщик NSIS One-Click).
* `Exilium-Switch-Setup-X.X.X.exe.blockmap` (блокмап для дельта-обновлений).
* `latest.yml` (манифест с sha512 хешами для electron-updater).
* `Exilium-Switch-Portable.exe` (портативная версия).

### Шаг 7. Проверка работы апдейтера в приложении
1. В запущенном клиенте предыдущей версии:
   * Дождаться системного уведомления Windows (интервал фоновой проверки — 60 секунд).
   * Либо нажать на версию `vX.X.X` в левом верхнем углу интерфейса.
2. В появившемся окне нажать **«Скачать»** $\to$ дождаться 100% $\to$ нажать **«Перезапустить»**.
3. Клиент закрывается, бесшумно заменяет обновленные файлы и перезапускается в новой версии за 2 секунды.

---

## 3. Критически важные технические нюансы (Gotchas)

| Нюанс / Настройка | Почему именно так (Причина) | Что произойдет, если нарушить |
| :--- | :--- | :--- |
| **`requestedExecutionLevel: requireAdministrator`** | Приложению необходимы повышенные привилегии для управления службой геолокации (`lfsvc`), Wintun-адаптером, маршрутизацией и часовым поясом. | При запуске без повышенных прав служба `lfsvc` не сможет быть остановлена (оранжевый маркер), а DNS-роутинг даст сбой. |
| **`signAndEditExecutable: false`** в [`electron-builder.yml`](file:///e:/Code/ExiliumSwitch/electron-builder.yml) | В Windows встроенный инструмент `winCodeSign` падает при распаковке 7zip из-за darwin-симлинков. | Сборщик упадет с ошибкой `Cannot create symbolic link libcrypto.dylib`. |
| **Хук `afterPack: scripts/after-pack.cjs`** | Поскольку `signAndEditExecutable: false`, electron-builder не трогает `.exe`. Хук запускает `rcedit-x64.exe` вручную и вшивает иконку Nostro + манифест `requireAdministrator` + метаданные до сборки инсталлятора. | На рабочем столе и в панели задач появится дефолтная сине-белая иконка Electron без прав админа. |
| **Четкий PNG 16x16 / 24x24 в системном трее** | Windows Shell API (`Shell_NotifyIconW`) ломает альфа-канал и прозрачность при передаче многослойного 256x256 `.ico` в `nativeImage`. | Иконка в системном трее Windows станет невидимой или пустой. |
| **`oneClick: true` + `differentialPackage: true`** в NSIS | Только при `oneClick: true` работает фоновое тихое дифференциальное обновление без показа окон мастера установки. | Поверх экрана пользователя вылезет классический мастер установки с кнопками «Далее». |
| **`realZone: 'Tomsk Standard Time'`** | Базовый часовой пояс разработчика зафиксирован как Томское время (UTC+7). | При санитарии и сбросе настроек часовой пояс откатится на Московское время. |
| **Чистота папки `Configs/`** | В папке [`Configs/samples/`](file:///e:/Code/ExiliumSwitch/Configs/samples/) хранится только чистый шаблон `template.json`. Все пользовательские профили хранятся в `%APPDATA%\ExiliumSwitch\profiles\`. | В сборку попадут старые тестовые конфиги и заспамят хранилище пользователя. |
| **Real-IP Split DNS вместо FakeIP** | FakeIP (`198.18.0.0/15`) ломает голосовые сокеты Discord WebRTC (STUN/ICE), локальный софт (RMS, 1С) и системный резолвер Windows. | В Discord зависнет «RTC Connecting», а корпоративные сервисы заблокируют иностранный IP. |

---

## 4. Памятка по дизайну обновлений (Design System)
Все компоненты окна обновлений ([`UpdateModal.tsx`](file:///e:/Code/ExiliumSwitch/src/components/UpdateModal.tsx)) и общие диалоги строго следуют стилю **Fluent Dark Monochrome**:
* **Фон:** глубокий черный `#0e0e11`, шапка `#141418`.
* **Границы:** тонкие `border-white/10` или `border-white/15`.
* **Акцентные кнопки:** `bg-white text-black font-semibold hover:bg-zinc-200 active:scale-[0.98]`.
* **Второстепенные кнопки:** `bg-white/[0.06] hover:bg-white/10 text-zinc-300 border border-white/10`.
* **Прогресс-бар:** трек `bg-white/10`, заполнение `bg-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]`.
* **Клик вне окна (Backdrop):** все модальные окна обязаны иметь `onClick={onClose}` на подложке и `e.stopPropagation()` на внутреннем блоке.
