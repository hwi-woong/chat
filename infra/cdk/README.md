# infra/cdk

현재 CDK 범위는 S3와 IAM 중심 리소스 생성용임.

포함 범위:

- 문서 이미지 업로드용 S3 bucket
- 기존 EC2 role 또는 백엔드 role에 연결 가능한 S3 접근 정책
- 필요 시 기존 EC2 IAM role에 policy 자동 attach

제외 범위:

- 기존 EC2 생성/재생성
- GitHub Actions 배포 구조 변경
- CodePipeline, CodeBuild, CodeDeploy

## 사용 예시

```bash
cd infra/cdk
npm install
npm run synth
```

## 설정 우선순위

설정 우선순위는 다음과 같음.

1. 환경변수
2. `cdk.json` context
3. 코드 기본값

## 지원 환경변수

지원 환경변수는 다음과 같음.

- `CDK_PROJECT_NAME`
- `CDK_ENV_NAME`
- `CDK_BUCKET_NAME`
- `CDK_UPLOAD_PREFIX`
- `CDK_FRONTEND_ORIGINS`
- `CDK_EXISTING_EC2_ROLE_NAME`

`CDK_FRONTEND_ORIGINS`는 쉼표 구분 문자열 형식 사용 가능함.

예시:

```bash
CDK_ENV_NAME=prod \
CDK_BUCKET_NAME=your-bucket-name \
CDK_UPLOAD_PREFIX=articles \
CDK_FRONTEND_ORIGINS=https://your-frontend.example.com,http://localhost:3000 \
CDK_EXISTING_EC2_ROLE_NAME=your-ec2-role-name \
npm run synth
```

## context 예시

```bash
npx cdk synth \
  -c envName=prod \
  -c bucketName=your-bucket-name \
  -c uploadPrefix=articles \
  -c frontendOrigins=https://your-frontend.example.com \
  -c existingEc2RoleName=your-ec2-role-name
```

## 백엔드 env 추출

CDK output을 백엔드 환경변수 형식으로 변환하는 스크립트 포함 상태임.

출력 대상 환경변수는 다음과 같음.

- `S3_BUCKET`
- `S3_REGION`
- `S3_PUBLIC_BASE_URL`
- `S3_UPLOAD_PREFIX`

`S3_UPLOAD_PREFIX`는 base prefix이며, 현재 백엔드 article 이미지 업로드 경로는 내부적으로 `images`를 추가하여 `articles/images/...` 형식 사용 상태임.

예시:

```bash
npx cdk deploy --outputs-file cdk-outputs.json
npm run export:backend-env -- --file cdk-outputs.json --stack BonInfraStack
```

## GitHub Actions 예시

다음과 같이 `GITHUB_ENV`에 바로 append 가능함.

```bash
cd infra/cdk
npx cdk deploy --outputs-file cdk-outputs.json
npm run export:backend-env -- --file cdk-outputs.json --stack BonInfraStack >> "$GITHUB_ENV"
```

## 보안 메모

이 스크립트가 출력하는 값은 다음만 포함함.

- `S3_BUCKET`
- `S3_REGION`
- `S3_PUBLIC_BASE_URL`
- `S3_UPLOAD_PREFIX`

즉 secret 값이 아니라 인프라 식별 및 경로 정보만 출력함.

운영 인증은 가능하면 EC2 IAM role 기반 사용 권장임.

이 경우 `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`를 백엔드 env에 넣지 않아도 됨.
