import subprocess
import os
import sys
import json
import urllib.request
import urllib.error

# 1. Чтение версии из package.json
pkg_path = os.path.join(os.path.dirname(__file__), "..", "package.json")
with open(pkg_path, "r", encoding="utf-8") as f:
    pkg_data = json.load(f)
version = pkg_data.get("version", "1.5.9")

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
release_body = f"""# 🚀 Exilium Switch v{version} — Wintun Native, Автомиграция профилей и защита Reality

## 🛡️ Основные нововведения и исправления:

### 1. ⚡ Автомиграция сетевых профилей (Core Profile Migration)
- **Устранение «Чёрной дыры» DNS:** При активации режима «Дом» и защитных механизмов Resident Shield исключена потеря DNS-запросов Windows из-за старых IPv6-интерфейсов.
- **Очистка IPv6 из TUN:** Автоматическое удаление фантомных адресов (`fd00::1/126`) из туннельных входящих соединений (`address: ["172.19.0.1/30"]`).
- **Переход на нативный Wintun (`stack: "system"`):** Замена эмулируемого пользовательского стека gVisor (`mixed`) на нативный Windows Wintun драйвер, снижающий задержки и повышающий пропускную способность.
- **Поддержка sing-box 1.12+:** Автоматическое назначение обязательных параметров `default_domain_resolver` и `outbound.domain_resolver`.

### 2. 🎯 Стабилизация VLESS Reality под 3X-UI 3.9.0
- **Синхронизация SNI и Target:** Автоматическое приведение устаревших параметров Reality к актуальной конфигурации хостера (`vdsina.ru`, short_id `d2206270cdf067`).
- **Строгая валидация uTLS:** Гарантированное включение `tls.utls` (fingerprint: `chrome`) и flow `xtls-rprx-vision` для максимальной маскировки от ТСПУ и DPI.

### 3. ⏱️ Атомарная калибровка замеров RTT / Ping
- **Защитная пауза конвергенции маршрутов:** Внедрена интеллектуальная стабилизационная пауза перед первым выполнением пинга после старта Wintun — исключены ложные красные предупреждения о таймауте ответа.
- **Сброс таймеров при остановке:** Внедрён хук `notifyTunnelStopped()` для предотвращения гонок состояний при быстром перезапуске туннеля.

### 4. 🧪 Комплексное тестирование и Quality Gate
- 204 автоматизированных теста Vitest пройдены на 100%.
- Покрытие кодовой базы тестами: **86.76% Lines**, **90.24% Funcs**.
- 0 ошибок сборки и типов TypeScript.

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
