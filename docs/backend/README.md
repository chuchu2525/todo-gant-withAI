# Todo Gantt with AI — Backend 設計概要

このドキュメントは、既存のフロントエンド(React + Vite)に対して安全で拡張可能なバックエンドを追加するための設計指針です。フロントは現在、ローカルストレージでタスクを保持し、`@google/genai` を直接ブラウザから呼び出しています。本バックエンドでは以下を解決します。

- APIキーの安全管理(サーバサイドに集約)
- タスク永続化(DB)とスキーマの単一真実源(Single Source of Truth)
- AI連携(要約/タスクYAML編集)のサーバ化とレート制御
- 将来の多ユーザー対応・監査・監視の基盤整備

## 非機能要件
- セキュリティ: APIキー/秘密情報はサーバ側の環境変数で保持。入力検証・レート制限・CORS制御。
- 可用性/スケール: stateless + RDB、コンテナ化容易。ヘルスチェック/レディネス対応。
- 観測性: 構造化ログ(pino相当)・メトリクス(将来拡張)・一貫したエラーハンドリング。
- 移行容易性: 現行YAML⇄DBの双方向インポート/エクスポートAPI。

## 推奨スタック(候補)
- ランタイム: Node.js(LTS) + TypeScript
- Webフレームワーク: Fastify または NestJS(チーム規模ならNest推奨)
- ORM/スキーマ: Prisma もしくは Drizzle(軽量志向)
- DB: PostgreSQL(本番)/SQLite(ローカル)
- バリデーション: zod or TypeBox
- ドキュメント: OpenAPI(本リポの `docs/backend/openapi.yaml` をソースに自動生成)

## ドメイン概要
- Task: 既存`types.ts`に準拠。依存関係は自己参照の中間テーブルで表現。
- YAML同期: 既存のYAMLを入出力できるエンドポイントを提供し、段階的移行を支援。

## 主要API(詳細は openapi.yaml)
- GET/POST `/api/v1/tasks`、GET/PATCH/DELETE `/api/v1/tasks/{id}`
- PATCH `/api/v1/tasks/bulk`(並べ替え・一括更新)
- POST `/api/v1/ai/summary`(タスク要約)
- POST `/api/v1/ai/update-yaml`(YAML編集)
- POST `/api/v1/import/yaml`、GET `/api/v1/export/yaml`
- GET `/api/v1/health`(liveness)、GET `/api/v1/ready`(readiness)

## 認証/認可(段階導入)
- Phase 1: シングルユーザー/トークンなし(ローカル開発向け) + Origin固定CORS
- Phase 2: APIキー/JWT(フロントからの呼び出し時にBearer)
- Phase 3: マルチテナント(必要に応じてProject/User導入)

## ディレクトリ例(サーバ側)
```
server/
  src/
    app.ts            # Fastify/Nest bootstrap
    routes/           # ルート定義
    controllers/      # ハンドラ
    services/         # ドメインロジック(AI/Tasks)
    repositories/     # DBアクセス
    schemas/          # zod/TypeBox
    middlewares/      # エラー/認可/レート制限
    plugins/          # CORS/Logger/Swagger
  prisma/             # Prisma schema など
  package.json
```

## データモデル(抜粋)
- tasks(id UUID, name, description, status, priority, start_date, end_date, created_at, updated_at)
- task_dependencies(task_id UUID, depends_on_id UUID, PK複合)

SQL は `docs/backend/db/schema.sql` を参照。

## 移行方針
1. 現行: ローカルストレージ + フロント直AI
2. 追加: サーバにAIエンドポイントを提供 → フロントの`services/geminiService.ts`呼び出し先をサーバに切替
3. 追加: DB永続化APIを実装 → フロントからタスクCRUDをサーバ経由に(ローカルストレージはキャッシュへ)
4. 提供: YAML Import/Exportで無停止移行

---
このREADMEは、詳細仕様(ADR, OpenAPI, SQL)への入口です。まずは `openapi.yaml` に沿って最小APIから着手することを推奨します。
