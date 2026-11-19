from pathlib import Path
import os
import re

gradle = Path("android/app/build.gradle")
if not gradle.exists():
    raise SystemExit("android/app/build.gradle was not generated")

text = gradle.read_text(encoding="utf-8")
text = re.sub(r"versionCode\\s+\\d+", "versionCode 3", text, count=1)
text = re.sub(r'versionName\\s+"[^"]+"', 'versionName "1.0.3"', text, count=1)

keystore = os.environ.get("ANDROID_KEYSTORE_PATH")
if keystore:
    signing = """
    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
"""
    if "signingConfigs {" not in text:
        text = text.replace("    buildTypes {", signing + "\\n    buildTypes {", 1)
    release_pattern = r"(release\\s*\\{)"
    if "signingConfig signingConfigs.release" not in text:
        text, count = re.subn(release_pattern, r"\\1\\n            signingConfig signingConfigs.release", text, count=1)
        if count == 0:
            raise SystemExit("Could not find the release buildType in generated Gradle file")

gradle.write_text(text, encoding="utf-8")
print("Configured Android version 1.0.3; signed release=" + str(bool(keystore)))
