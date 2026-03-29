# @bon/backend

현재 백엔드는 NestJS 기반 API다.

## 역할

- 관리자 로그인 / 지점 로그인 / 세션 복구
- 지점 계정 관리
- 카테고리 / 문서 CRUD
- RAG 기반 챗봇 응답
- 채팅 세션 / 메시지 저장 및 조회

## 실행

루트에서:

```bash
npm run dev:backend
```

워크스페이스에서:

```bash
npm run dev
```

현재 dev runner:

```bash
ts-node-dev --respawn --transpile-only src/main.ts
```

빌드:

```bash
npm run build
```

타입 검사:

```bash
npm run typecheck
```

린트:

```bash
npm run lint
```

환경 변수:

```bash
cp .env.example .env
```

- 개발/운영 공통 env 기준 파일은 `apps/backend/.env`다.
- 앱 런타임 env 파싱과 검증은 `src/config/index.ts`가 담당한다.
- DB migration과 admin seed 스크립트도 같은 파일을 기준으로 읽는다.

## 관리자 계정 생성

기본 관리자 계정은 시드 스크립트로 upsert 한다.

```bash
npm run db:migrate
npm run db:seed:admin -- --username admin --display-name "관리자" --password "change-me-now"
```

- `--username`, `--display-name`, `--password` 인자를 직접 넘길 수 있다.
- 인자를 생략하면 `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME`, `ADMIN_PASSWORD` 환경변수를 사용한다.
- 같은 username이 이미 있으면 새로 추가하지 않고 비밀번호와 표시 이름을 갱신한다.
- 실제 로그인 엔드포인트는 `POST /auth/admin/login` 이다.

## 엔트리

- `src/main.ts`
  - Nest bootstrap
  - pg-backed session
  - CORS
  - global validation
  - global exception filter

- `src/app.module.ts`
  - 전체 모듈 조립

## 응답 원칙

성공 응답은 raw DTO를 그대로 반환한다.

에러:

```json
{
  "ok": false,
  "message": "...",
  "statusCode": 400,
  "path": "/...",
  "timestamp": "..."
}
```

예외:

- SSE 스트림은 일반 JSON 응답이 아니라 이벤트 스트림을 사용한다.

## 상세 문서

- [Nest 구조 문서](./nest-structure.md)
- [API 가이드](./api-guide.md)
- [배포 가이드](./deployment.md)
- [AWS CDK 인프라 관리 계획](./cdk-migration-plan.md)
- [인프라 운영 및 입력값 가이드](./infra-operations-guide.md)
