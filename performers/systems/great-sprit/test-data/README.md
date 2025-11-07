# Test Data

テストデータとサンプルRDF/SHACLデータを格納するディレクトリ。

## 構造

```
test-data/
├── README.md
├── rdf/
│   └── sample-triples.ttl          # サンプルRDFトリプル
├── shacl/
│   └── sample-shapes.ttl           # サンプルSHACL Shape
└── terminusdb/
    └── init.sh                      # TerminusDB初期化スクリプト
```

## 使用方法

1. TerminusDBにデータをロード:
   ```bash
   docker-compose exec terminusdb /app/test-data/init.sh
   ```

2. テストデータを確認:
   ```bash
   curl http://localhost:6363/api/query/spirit_kg -X POST \
     -H "Content-Type: application/json" \
     -d '{"query": "SELECT ?s ?p ?o WHERE { ?s ?p ?o . } LIMIT 10"}'
   ```

