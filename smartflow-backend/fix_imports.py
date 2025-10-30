#!/usr/bin/env python3
"""
Import 경로 수정 스크립트
smartflow-backend 폴더에서 실행

사용법:
  cd smartflow-backend
  python fix_imports.py
"""

import re
from pathlib import Path

PROJECT_ROOT = Path.cwd()

print("=" * 60)
print("🔧 Import 경로 자동 수정")
print("=" * 60)
print()

def fix_imports_in_file(file_path):
    """파일의 import 경로 수정"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
        
        # 1. from database import -> from database.database import
        content = re.sub(
            r'^from database import',
            r'from database.database import',
            content,
            flags=re.MULTILINE
        )
        
        # 2. from models import -> from models.models import
        content = re.sub(
            r'^from models import',
            r'from models.models import',
            content,
            flags=re.MULTILINE
        )
        
        # 3. from schemas import -> from schemas.schemas import
        content = re.sub(
            r'^from schemas import',
            r'from schemas.schemas import',
            content,
            flags=re.MULTILINE
        )
        
        # 4. from crud import -> from database.crud import
        content = re.sub(
            r'^from crud import',
            r'from database.crud import',
            content,
            flags=re.MULTILINE
        )
        
        # 5. import database (단독) -> import database.database
        content = re.sub(
            r'^import database$',
            r'from database import database',
            content,
            flags=re.MULTILINE
        )
        
        # 6. import models (단독) -> from models import models
        content = re.sub(
            r'^import models$',
            r'from models import models',
            content,
            flags=re.MULTILINE
        )
        
        # 7. import schemas (단독) -> from schemas import schemas
        content = re.sub(
            r'^import schemas$',
            r'from schemas import schemas',
            content,
            flags=re.MULTILINE
        )
        
        # 변경사항이 있으면 저장
        if content != original_content:
            file_path.write_text(content, encoding='utf-8')
            return True
        return False
        
    except Exception as e:
        print(f"    ✗ 오류: {file_path.name} - {e}")
        return False

# Python 파일 처리
print("📝 Python 파일 처리 중...\n")
changed_files = []

for py_file in PROJECT_ROOT.rglob("*.py"):
    # __pycache__ 폴더 제외
    if "__pycache__" in str(py_file):
        continue
        
    if fix_imports_in_file(py_file):
        rel_path = py_file.relative_to(PROJECT_ROOT)
        print(f"  ✓ {rel_path}")
        changed_files.append(str(rel_path))

print()
if changed_files:
    print(f"✅ {len(changed_files)}개 파일 수정 완료!")
else:
    print("  (수정할 import 없음)")

print()
print("=" * 60)
print("✅ Import 경로 수정 완료!")
print("=" * 60)
print()
print("이제 'python main.py'로 서버를 실행하세요!")
print()