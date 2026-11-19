from pathlib import Path
import os
import re

gradle = Path("android/app/build.gradle")
if not gradle.exists():
    raise SystemExit("android/app/build.gradle was not generated")

text = gradle.read_text(encoding="utf-8")
text, code_count = re.subn(r"versionCode\s*(?:=\s*)?\d+", "versionCode 5", text, count=1)
text, name_count = re.subn(r"""versionName\s*(?:=\s*)?['"][^'"]+['"]""", 'versionName "1.0.5"', text, count=1)
if code_count != 1 or name_count != 1:
    raise SystemExit("Could not set the Android versionCode and versionName in generated Gradle file")

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
        text = text.replace("    buildTypes {", signing + "\n    buildTypes {", 1)
    build_types_pos = text.find("buildTypes {")
    if build_types_pos < 0:
        raise SystemExit("Could not find buildTypes block in generated Gradle file")
    release_pos = text.find("release {", build_types_pos)
    if release_pos < 0:
        raise SystemExit("Could not find release buildType in generated Gradle file")
    if "signingConfig signingConfigs.release" not in text[build_types_pos:]:
        insert_at = release_pos + len("release {")
        text = text[:insert_at] + "\n            signingConfig signingConfigs.release" + text[insert_at:]

gradle.write_text(text, encoding="utf-8")
print("Configured Android version 1.0.5; signed release=" + str(bool(keystore)))
