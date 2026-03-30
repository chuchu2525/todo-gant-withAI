# ADR 0001: バックエンド・アーキテクチャ選定

## 背景
- フロントエンドはReact+Viteでスタンドアロン動作。タスクはローカルストレージ、AIは`@google/genai`をブラウザから直呼び。
- 機能拡張(永続化/多ユーザー/監視)と秘匿情報(APIキー)の保護が必要。

## 決定
- Node.js + TypeScript を採用し、Webフレームワークは Fastify(軽量) を第一候補。
- OpenAPI駆動設計を採用し、`docs/backend/openapi.yaml` をAPIの単一仕様源にする。
- RDBはPostgreSQL(本番)、SQLite(開発)。ORMはPrisma(移行/型安全性重視)を優先。
- AI連携はサーバサイドに集約し、Gemini等のAPIキーは環境変数からロード。リクエスト検証とレート制限を実装。

## 代替案
- NestJS: 組織/大規模開発での規約優位。初期コスト増を考慮し現段階はFastify優先。
- Python(FastAPI): チーム言語次第で有力。既存フロント(TypeScript)との知見共有を優先しNodeを選定。

## 影響
- `services/geminiService.ts` は将来、直接API呼び出しから `/api/v1/ai/*` へ切替。
- タスクのソースはDBへ移行。YAMLは入出力インターフェースとして継続提供。

## 移行計画(段階)
1. AIエンドポイントを先行提供(フロントはenv不要に)
2. タスクCRUD API/DB導入
3. 認証(JWT)導入とマルチユーザー対応
4. 観測性/監査ログ/バックグラウンドジョブ拡張
