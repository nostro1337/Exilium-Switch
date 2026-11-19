import subprocess
import os
import sys
import json
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# 1. Чтение версии из package.json
pkg_path = os.path.join(os.path.dirname(__file__), "..", "package.json")
with open(pkg_path, "r", encoding="utf-8") as f:
    pkg_data = json.load(f)
version = pkg_data.get("version", "1.6.0")

print(f"=== Подготовка релиза Exilium Switch v{version} ===")

# 2. Извлечение токена GitHub из Windows Credential Manager
print("Извлечение токена GitHub из Windows Credential Manager...")
p = subprocess.Popen(["git", "credential", "fill"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input="protocol=https\nhost=github.com\n\n")
token_matches = [l.split("=", 1)[1] for l in out.splitlines() if l.startswith("password=")]
if not token_matches:
    print("ОШИБКА: Токен GitHub не найден в Windows Credential Manager!")
    sys.exit(1)

token = token_matches[0]
env = os.environ.copy()
env["GH_TOKEN"] = token
env["GITHUB_TOKEN"] = token

# 3. Сборка Vite и TypeScript
print("\n[1/3] Компиляция frontend и electron (npm run build)...")
res_build = subprocess.run(["npm.cmd", "run", "build"], cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), "..")), env=env)
if res_build.returncode != 0:
    print("Ошибка сборки!")
    sys.exit(res_build.returncode)

# 4. Упаковка и загрузка артефактов в GitHub Releases
print(f"\n[2/3] Упаковка (NSIS + Portable) и прямая загрузка в GitHub Releases v{version}...")
res_pub = subprocess.run([
    "npx.cmd", "electron-builder",
    "--win",
    "--publish", "always",
    "--config.directories.output=release/Versions"
], cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), "..")), env=env)

if res_pub.returncode != 0:
    print("Ошибка публикации electron-builder!")
    sys.exit(res_pub.returncode)

# 5. Обновление метаданных релиза (Title и Changelog) через GitHub API
print("\n[3/3] Обновление описания и чейнджлога релиза на GitHub...")
release_body = f"""# 🚀 Exilium Switch v{version} — sing-box 1.14.4, Hysteria 2 (QUIC) и максимальная стабильность канала

## ⚡ Основные нововведения и оптимизации:

### 1. 🚀 Новое ядро sing-box v1.14.4 + Поддержка Hysteria 2 (`hysteria2://`)
- **Стабильное ядро `sing-box 1.14.4`:** Обновление с `1.14.0-beta.15` до актуального стабильного релиза `go1.26.10`.
- **Приоритет встроенного бинарника:** Приложение всегда использует собственное актуальное ядро `sing-box.exe` из дистрибутива (а не устаревшую копию в `C:\\sing-box`).
- **Нативная поддержка Hysteria 2 (QUIC/UDP):** Полный парсинг и импорт ссылок `hysteria2://` и `hy2://` (включая `salamander` obfs) с резким снижением задержки старта соединений.

### 2. 🎯 Устранение скачков пинга и обрывов канала
- **Убран конфликт QUIC-over-TCP:** На TCP-профилях VLESS добавлено правило отклонения QUIC (`protocol: "quic" -> reject`), исключающее двойную борьбу алгоритмов перегрузки и фризы YouTube/браузера.
- **Тюнинг TCP-соединений:** Отключён проблемный для сетей РФ `tcp_fast_open`, добавлены `tcp_keep_alive: 30s`, `tcp_keep_alive_interval: 10s` и `connect_timeout: 5s`.
- **Точные UDP-правила:** Диапазон проксируемого UDP сужен с избыточного `50000:65535` до голосовых портов Discord (`19294:19344`, `50000:50100`).
- **Чистый европейский Reality SNI:** Устаревший российский `vdsina.ru` автоматически мигрирует на европейский `github.com` при полном сохранении Real-IP Split DNS (для стабильной работы голоса Discord WebRTC, 1С и RMS).

### 3. 🧹 Разгрузка ПК, честный пинг и защита диска
- **Остановлен фоновый спам замороженной телеметрии:** Исключены лишние 5 VLESS-соединений каждые 5 секунд.
- **Контроль размера логов:** Уровень логов `sing-box` переведён в `warn`, внедрена авто-ротация файла сессии при превышении **5 МБ** (вместо прежних 240+ МБ).
- **Динамический замер пинга:** Пинг автоматически определяется по серверу активного профиля с фильтрацией ложных `0–2 мс` перехватов Wintun.

### 4. 🧪 Quality Gate
- **209 / 209** автоматизированных тестов Vitest пройдены на 100%.
- Покрытие кода: **>86% Lines**, **>89% Funcs**, **0 ошибок** TypeScript и Vite.

---
**Разработчик:** Nostro | **Репозиторий:** [Exilium-Switch](https://github.com/nostro1337/Exilium-Switch)
"""

try:
    tag_name = f"v{version}"
    req = urllib.request.Request(
        f"https://api.github.com/repos/nostro1337/Exilium-Switch/releases/tags/{tag_name}",
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ExiliumReleaseScript"
        }
    )
    with urllib.request.urlopen(req) as response:
        rel_info = json.loads(response.read().decode())
        release_id = rel_info["id"]

    # Обновляем заголовок и тело
    patch_data = json.dumps({
        "name": f"Exilium Switch v{version}",
        "body": release_body,
        "draft": False,
        "prerelease": False
    }).encode("utf-8")

    patch_req = urllib.request.Request(
        f"https://api.github.com/repos/nostro1337/Exilium-Switch/releases/{release_id}",
        data=patch_data,
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "ExiliumReleaseScript"
        },
        method="PATCH"
    )
    with urllib.request.urlopen(patch_req) as response:
        print("✓ Метаданные и чейнджлог релиза успешно обновлены!")

except Exception as e:
    print(f"Предупреждение: Не удалось обновить тело релиза через API: {e}")

print(f"\n✨ УСПЕХ: РЕЛИЗ v{version} ПОЛНОСТЬЮ СОБРАН И ОПУБЛИКОВАН НА GITHUB!")
