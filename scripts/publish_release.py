import subprocess
import os
import sys

p = subprocess.Popen(["git", "credential", "fill"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input="protocol=https\nhost=github.com\n\n")
token = [l.split("=", 1)[1] for l in out.splitlines() if l.startswith("password=")][0]

env = os.environ.copy()
env["GH_TOKEN"] = token

print("Building frontend and electron main...")
res_build = subprocess.run(["npm.cmd", "run", "build"], cwd=r"e:\Code\ExiliumSwitch", env=env)
if res_build.returncode != 0:
    print("Build failed!")
    sys.exit(res_build.returncode)

print("Packaging and publishing to GitHub via electron-builder...")
res_pub = subprocess.run(["npx.cmd", "electron-builder", "--win", "--publish", "always"], cwd=r"e:\Code\ExiliumSwitch", env=env)
if res_pub.returncode != 0:
    print("Publish failed!")
    sys.exit(res_pub.returncode)

print("SUCCESS: RELEASE v1.5.0 PUBLISHED TO GITHUB!")
