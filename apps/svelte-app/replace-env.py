import os
import sys

def replace_env(target_dir):
    env_vars = {
        "__PUBLIC_CLERK_PUBLISHABLE_KEY__": os.environ.get("PUBLIC_CLERK_PUBLISHABLE_KEY", ""),
        "__PUBLIC_API_URL__": os.environ.get("PUBLIC_API_URL", ""),
    }
    
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith(".html") or file.endswith(".js"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = content
                for placeholder, value in env_vars.items():
                    new_content = new_content.replace(placeholder, value)
                
                if new_content != content:
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Replaced env vars in {path}")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "/app/build"
    replace_env(target)


