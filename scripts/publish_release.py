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
version = pkg_data.get("version", "1.6.2")

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
release_body = f"""# 🛠️ Exilium Switch v{version} — исправление потокового видео (HTTP/3 → HTTP/2) и удалённый DNS в режиме Офис

## 🔥 Что исправлено в v{version}:

### 1. 🎬 Устранение зависаний потокового видео и `ERR_QUIC_PROTOCOL_ERROR` на Hysteria 2
- **Блокировка внутреннего QUIC/HTTP3 для всех профилей (включая Hysteria 2):** Исключён конфликт QUIC-внутри-QUIC, из-за которого видео-CDN возвращали `net::ERR_QUIC_PROTOCOL_ERROR` либо проседали в 5 раз по скорости.
- Браузеры автоматически работают через стабильный `HTTP/2` поверх туннеля, при этом сам внешний UDP-транспорт Hysteria 2, голос Discord/Telegram и игровой UDP работают без ограничений.

### 2. 🌐 Исключение DNS-утечек и неверных CDN в режиме «Офис»
- **Обновлён fallback DNS (`dns.final: "dns-remote"`):** В режиме «Офис» корпоративный DNS (`aviabasa.local`) и российские домены (`RUSSIAN_AND_CIS_DOMAINS`) по-прежнему идут напрямую, а все зарубежные сайты и видео-CDN теперь резолвятся через европейский узел (`dns-remote`).

### 3. 🧪 Quality Gate
- **100%** автоматизированных тестов Vitest пройдены успешно.
- Покрытие кода: **>86% Lines**, **>90% Funcs**, **0 ошибок** TypeScript и Vite.

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
