import os
import json

# =========================================================
# 設定: あなたのプロジェクトパスをここに設定済みです
# r"..." とすることでWindowsのバックスラッシュ問題を回避しています
PROJECT_ROOT = r"C:\Users\yasud\OneDrive\デスクトップ\attendance-app"

# 出力ファイル名
OUTPUT_FILE = "attendance_app_review.json"

# 無視するフォルダ・ファイル（不要なものは読み込まない）
IGNORE_DIRS = {'.git', '__pycache__', 'node_modules', 'venv', '.idea', '.vscode', 'dist', 'build', 'coverage'}
IGNORE_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pyc', '.exe', '.bin', '.zip', '.pdf', '.dll', '.sqlite3', '.db'}
# =========================================================

def is_text_file(filepath):
    """テキストファイルかどうかを判定"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read(1024)
        return True
    except (UnicodeDecodeError, Exception):
        return False

def generate_project_json():
    project_files = []
    
    # パスが存在するか確認
    if not os.path.exists(PROJECT_ROOT):
        print(f"❌ エラー: 指定されたパスが見つかりません。\nパス: {PROJECT_ROOT}")
        return

    print(f"📂 調査開始: {PROJECT_ROOT}")
    print("⏳ ファイルをスキャン中...")

    for root, dirs, files in os.walk(PROJECT_ROOT):
        # 無視するディレクトリを除外
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            file_path = os.path.join(root, file)
            _, ext = os.path.splitext(file)

            if ext.lower() in IGNORE_EXTS:
                continue

            if is_text_file(file_path):
                try:
                    # Windowsのパス問題を避けるためutf-8を強制
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # 相対パスに変換（AIがディレクトリ構造を理解しやすくするため）
                    rel_path = os.path.relpath(file_path, PROJECT_ROOT)
                    # Windowsの区切り文字 \ を / に統一
                    rel_path = rel_path.replace(os.sep, '/')

                    project_files.append({
                        "file_path": rel_path,
                        "content": content
                    })
                    print(f"  ✅ 読込: {rel_path}")
                except Exception as e:
                    print(f"  ⚠️ 読込失敗: {file} ({e})")

    # JSONデータの構築
    prompt_data = {
        "meta": {
            "task": "code_review",
            "project": "attendance-app"
        },
        "role_definition": {
            "role": "Senior Software Architect",
            "description": "高度なソフトウェア設計、セキュリティ、品質管理の専門家として振る舞ってください。"
        },
        "instructions": {
            "objective": "以下のプロジェクトファイルを分析し、バグ、セキュリティリスク、改善点を指摘してください。",
            "format": "Markdown形式で、重要度順に問題をリストアップしてください。"
        },
        "project_context": {
            "root_path": "attendance-app",
            "files": project_files
        }
    }

    # ファイル書き出し
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(prompt_data, f, ensure_ascii=False, indent=2)
        print(f"\n✨ 完了しました！ 同じ場所に作成された '{OUTPUT_FILE}' をAIにアップロードしてください。")
    except Exception as e:
        print(f"\n❌ 書き出しエラー: {e}")

if __name__ == "__main__":
    generate_project_json()