# 인프라 운영 및 입력값 가이드

## 문서 목적

현재 프로젝트의 인프라 관리 범위, 환경변수 처리 방식, 사용자 직접 입력 및 관리 대상 정리 문서임.

## 현재 인프라 관리 범위

현재 프로젝트에서 인프라 관리 구조는 다음과 같음.

- GitHub Actions: 애플리케이션 빌드 및 배포 수행
- EC2: 기존 백엔드 실행 서버
- AWS CDK: S3 및 IAM 관련 리소스 관리

이번 단계에서 CDK가 관리하는 항목은 다음과 같음.

- 문서 이미지 업로드용 S3 bucket
- S3 CORS 설정
- S3 public read 정책
- S3 접근용 IAM managed policy
- 기존 EC2 IAM role에 대한 policy attachment

이번 단계에서 CDK가 관리하지 않는 항목은 다음과 같음.

- 기존 EC2 생성/재생성
- GitHub Actions 배포 구조 자체
- Docker Hub 사용 여부
- 애플리케이션 비밀값 관리 방식 전체

## 환경변수 관리 구조

환경변수 관리 구조는 다음과 같음.

### 애플리케이션 고정/비밀 설정

다음 값들은 여전히 GitHub Secrets 또는 운영 환경에서 직접 관리 대상임.

- `SESSION_SECRET`
- `SESSION_TABLE_NAME`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `LLM_MODEL`
- `RAG_SUMMARY_MODEL`
- `EMBEDDING_MODEL`
- `EMBEDDING_DIM`
- `RAG_TOP_K`
- `RAG_MIN_SCORE`
- `RAG_SUMMARY_MIN_CHARS`
- `RAG_RETRIEVAL_VERSION`
- `LLM_PROMPT_COST_PER_1K`
- `LLM_COMPLETION_COST_PER_1K`

### CDK output 기반 주입 설정

다음 값들은 CDK가 생성하고 GitHub Actions가 배포 시점에 주입하는 구조임.

- `S3_BUCKET`
- `S3_REGION`
- `S3_PUBLIC_BASE_URL`
- `S3_UPLOAD_PREFIX`

`S3_UPLOAD_PREFIX`는 base prefix이며, 현재 article 이미지 실제 업로드 경로는 백엔드 내부 `images` 하위 경로를 추가하여 `articles/images/...` 형식 사용 상태임.

즉 위 값들은 GitHub Secrets에 직접 저장하지 않아도 되는 구조임.

### 운영에서 불필요한 S3 자격증명 환경변수

EC2에 IAM role이 연결돼 있으면 다음 값은 운영 환경에서 불필요함.

- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

로컬 개발 또는 외부 실행 환경에서는 필요 시 사용할 수 있으나, 운영 EC2에서는 미사용 권장임.

## AWS에서 직접 해야 하는 일

사용자가 AWS에서 직접 확인 또는 생성해야 하는 항목은 다음과 같음.

### 1. 사용할 리전 결정

필수 항목임.

예시:

- `ap-northeast-2`
- `us-east-1`

### 2. 기존 EC2에 연결된 IAM role 이름 확인

필수 항목임.

확인 위치:

- AWS 콘솔
- EC2
- 대상 인스턴스 선택
- `IAM role` 값 확인

이 값은 `CDK_EXISTING_EC2_ROLE_NAME`으로 사용함.

### 3. GitHub Actions용 AWS 자격증명 준비

현재 워크플로는 `aws-actions/configure-aws-credentials`에서 access key 기반 인증 사용 중임.

따라서 다음 중 하나 필요 상태임.

- GitHub Actions 전용 IAM user access key
- 또는 향후 OIDC 전환

현재 구조 기준 필요한 값은 다음과 같음.

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 4. CDK bootstrap 수행

대상 계정/리전에서 1회 필요 상태임.

예시:

```bash
cd infra/cdk
npx cdk bootstrap
```

### 5. S3 bucket 이름 결정

필수 항목임.

이 값은 전역 고유 이름이어야 함.

예시:

- `bon-article-images-prod`

### 6. 프론트 origin 결정

S3 CORS에 반영되는 값임.

예시:

- `https://your-frontend.example.com`
- `http://localhost:3000`

## GitHub에서 직접 해야 하는 일

### GitHub Secrets

현재 워크플로 기준 필수 GitHub Secrets는 다음과 같음.

- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `SESSION_SECRET`
- `SESSION_TABLE_NAME`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `LLM_MODEL`
- `RAG_SUMMARY_MODEL`
- `EMBEDDING_MODEL`
- `EMBEDDING_DIM`
- `RAG_TOP_K`
- `RAG_MIN_SCORE`
- `RAG_SUMMARY_MIN_CHARS`
- `RAG_RETRIEVAL_VERSION`
- `LLM_PROMPT_COST_PER_1K`
- `LLM_COMPLETION_COST_PER_1K`

### GitHub Variables

현재 워크플로 기준 필수 GitHub Variables는 다음과 같음.

- `AWS_REGION`
- `CDK_ENV_NAME`
- `CDK_BUCKET_NAME`
- `CDK_FRONTEND_ORIGINS`
- `CDK_EXISTING_EC2_ROLE_NAME`

## 실제 입력값 매핑

각 항목의 입력 위치는 다음과 같음.

### AWS에서 확인

- `CDK_EXISTING_EC2_ROLE_NAME`
- 리전 정보

### GitHub Secrets에 저장

- AWS access key
- EC2 접속 정보
- 백엔드 비밀값 및 운영 설정값

### GitHub Variables에 저장

- 리전
- bucket 이름
- frontend origins
- env 이름
- EC2 IAM role 이름

### CDK가 생성

- `S3_BUCKET`
- `S3_REGION`
- `S3_PUBLIC_BASE_URL`
- `S3_UPLOAD_PREFIX`
- S3 접근 정책 ARN

`S3_UPLOAD_PREFIX`는 base prefix 값이며, 현재 article 이미지 실제 경로는 `articles/images/...` 형식임.

## 배포 시 실제 동작

현재 배포 시 동작 흐름은 다음과 같음.

1. GitHub Actions가 빌드 수행
2. GitHub Actions가 CDK 실행
3. CDK가 S3/IAM 상태 반영
4. CDK output 파일 생성
5. helper script가 output을 backend env 형식으로 변환
6. 해당 env가 EC2 컨테이너 실행 시 주입

즉 S3 관련 값은 GitHub Secrets 직접 입력 대상이 아님.

## 사용자가 최종적으로 관리해야 하는 것

사용자 직접 관리 대상은 다음과 같음.

### AWS 측 관리

- 기존 EC2 존재 여부
- 기존 EC2 IAM role 존재 여부
- GitHub Actions용 AWS 자격증명
- CDK bootstrap 상태

### GitHub 측 관리

- Secrets
- Variables
- 배포 워크플로 실행 권한

### 애플리케이션 측 관리

- OpenAI / DB / 세션 관련 env 값
- Docker Hub 계정 정보

## 최소 체크리스트

배포 전 확인 체크리스트는 다음과 같음.

1. `AWS_REGION` 설정 여부
2. `CDK_BUCKET_NAME` 설정 여부
3. `CDK_FRONTEND_ORIGINS` 설정 여부
4. `CDK_EXISTING_EC2_ROLE_NAME` 설정 여부
5. EC2 IAM role이 실제로 존재하는지 여부
6. GitHub Actions용 AWS access key 유효 여부
7. EC2 SSH 접속 정보 유효 여부
8. 백엔드 비밀값 GitHub Secrets 등록 여부
