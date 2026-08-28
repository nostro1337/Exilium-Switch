# Quality Gate & Release Verification Workflow

Используйте данный воркфлоу при разработке любых новых функций, устранении багов, рефакторинге или подготовке к коммиту/релизу.

---

## Этапы выполнения:

### 1. Исследование связей и зоны влияния (Research & Impact)
- Использовать `codegraph_explore` для локализации символов и логики.
- Выполнить `codegraph_impact <символ>` перед изменением сигнатур, DTO или каналов IPC.

### 2. Послойная реализация (Layered Implementation)
- Реализовать изменения строго снизу вверх:
  1. `shared/types/` и `shared/ipc-channels.ts`
  2. `electron/utils/`
  3. `electron/services/`
  4. `electron/ipc/`
  5. `src/hooks/` и `src/components/`

### 3. Автоматизированное тестирование (Testing & Regression Prevention)
- Написать новые тесты или обновить существующие в каталоге `tests/`.
- Запустить проверку покрытия:
  ```bash
  npm run test:coverage
  ```
- **Критерии прохождения:**
  - 100% тестов прошли успешно (0 failed).
  - Покрытие строк (`% Lines`) **>= 80%**.

### 4. Проверка сборки и типов (Typecheck & Build)
- Запустить финальную сборку:
  ```bash
  npm run build
  ```
- Убедиться, что TypeScript компилируется с **0 ошибок**.

### 5. Синхронизация графа знаний (Knowledge Graph Sync)
- Обновить AST-граф кодовой базы:
  ```bash
  python -m graphify update .
  ```

### 6. Фиксация изменений в Git
- Проверить статус рабочей директории на отсутствие лишних файлов в корне (`git status`).
- Зафиксировать изменения:
  ```bash
  git add .
  git commit -m "<type>(<scope>): <clear description>"
  git push origin dev
  ```
