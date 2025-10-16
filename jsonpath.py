#!/usr/bin/env python3

# python3 -m venv venv
# venv/bin/pip install jsonpath-ng

import sys
import json
from jsonpath_ng import parse

def main():
    if len(sys.argv) != 3:
        print("Usage: python json_select.py '<jsonpath-filter>' <json-file.json>")
        sys.exit(1)
    jsonpath_expr = sys.argv[1]
    json_file = sys.argv[2]
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, list):
            print("Ошибка: ожидается JSON-массив.", file=sys.stderr)
            sys.exit(1)
        jsonpath_expr_parsed = parse(jsonpath_expr)
        results = [match.value for match in [match for match in jsonpath_expr_parsed.find(data) if match.path]]
        print(json.dumps(results, ensure_ascii=False, indent=2))
    except FileNotFoundError:
        print(f"Ошибка: файл '{json_file}' не найден.", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Ошибка разбора JSON: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Ошибка: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()