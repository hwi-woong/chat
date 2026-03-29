# AWS CDK 인프라 관리 계획

## 문서 목적

현재 프로젝트에서 AWS CDK로 관리할 인프라 범위 정의 문서임.

문서 목적은 다음과 같음.

- CDK의 역할 정의
- 현재 프로젝트에서 CDK로 관리할 대상 정의
- 현재 운영 방식과의 차이점 정리
- 이후 인프라 변경 관리 방식 정리

## CDK 개요

AWS CDK는 AWS 인프라를 코드로 정의하고 생성/변경하는 도구임.

이 프로젝트에서 CDK는 다음 역할로 사용함.

- AWS 리소스 생성 정의
- 인프라 설정 코드화
- 동일 환경 재생성 가능 상태 유지
- 콘솔 수동 설정 최소화

이번 프로젝트에서 CDK는 배포 파이프라인 전환 도구가 아님.

## 현재 프로젝트 운영 방식

현재 운영 방식은 다음과 같음.

- 프론트엔드: Vercel
- 백엔드: EC2
- 배포: GitHub Actions -> EC2
- 문서 이미지 업로드: S3 도입 예정

현재 상태의 특징은 다음과 같음.

- 애플리케이션 배포는 GitHub Actions 중심 구조
- EC2는 이미 생성된 상태
- AWS 리소스 일부는 콘솔 또는 수동 생성 가능성 존재

## CDK 적용 범위

현재 프로젝트에서 CDK 관리 대상으로 보는 범위는 다음과 같음.

- S3 bucket
- S3 CORS 설정
- S3 bucket policy
- IAM role / policy
- 필요 시 S3 접근용 최소 보안 설정

핵심 관리 대상은 S3와 그에 연결되는 IAM 권한임.

## CDK 비적용 범위

이번 단계에서 CDK 관리 범위에 포함하지 않는 대상은 다음과 같음.

- 기존 EC2 생성/재생성
- GitHub Actions 배포 구조 변경
- CodePipeline
- CodeBuild
- CodeDeploy
- ECS / Fargate
- ALB / NAT Gateway / ASG

즉 이번 단계에서 CDK는 S3 중심 인프라 관리 도구로만 사용함.

## EC2 관련 정리

EC2 역시 AWS CDK로 관리 가능한 리소스임.

다만 현재 프로젝트에서는 EC2가 이미 생성 완료 상태이므로 이번 단계에서 EC2 생성 또는 EC2 이관 작업은 진행하지 않음.

이번 단계에서의 EC2는 참조 리소스이며, CDK 관리 핵심 범위는 S3 및 IAM임.

기존 EC2에 연결된 IAM role이 이미 존재하는 경우에는 해당 role 이름을 기준으로 CDK에서 policy attachment 수행 가능 상태임.

## 현재 프로젝트와의 차이점

현재 프로젝트와 CDK 적용 이후의 차이점은 다음과 같음.

### 현재

- S3 및 IAM 설정이 수동 관리 대상일 가능성 존재
- AWS 콘솔 설정 의존 가능성 존재
- 인프라 변경 이력 추적 어려움 존재

### CDK 적용 이후

- S3와 IAM 설정이 코드로 정의됨
- 인프라 변경 사항을 저장소에서 추적 가능 상태로 관리함
- 동일 설정 재적용 가능 상태 확보

## 관리 대상 상세

### S3

S3 관리 항목은 다음과 같음.

- bucket 생성
- bucket 이름 규칙 정의
- CORS 설정
- public URL 또는 접근 정책 관련 설정
- 업로드 prefix 관련 정책

현재 프로젝트 기준 S3 용도는 다음과 같음.

- 문서 이미지 업로드 저장소
- presigned URL 기반 업로드 대상

### IAM

IAM 관리 항목은 다음과 같음.

- 백엔드 또는 EC2에서 사용할 S3 접근 권한
- bucket/prefix 기준 최소 권한 정책
- 필요 시 기존 EC2 IAM role에 policy attachment

현재 프로젝트 기준 필요한 권한 예시는 다음과 같음.

- `s3:PutObject`
- `s3:GetObject`

## 자격증명 처리 방식

현재 프로젝트에서 중요한 포인트는 AWS 자격증명을 환경변수 access key로만 처리할 필요가 없다는 점임.

EC2에 IAM role이 연결돼 있으면 백엔드 애플리케이션은 해당 role 권한을 통해 AWS에 인증 가능 상태가 됨.

즉 다음과 같은 운영 방식이 가능함.

- `S3_ACCESS_KEY_ID` 미사용
- `S3_SECRET_ACCESS_KEY` 미사용
- EC2에 연결된 IAM role을 통해 S3 접근 수행

이 방식의 의미는 다음과 같음.

- 장기 access key를 서버 env에 저장하지 않아도 됨
- 백엔드 코드에서 별도 자격증명 문자열 주입 없이 AWS SDK 사용 가능 상태가 됨
- 인프라 측 권한 부여로 애플리케이션 인증이 해결되는 구조임

현재 백엔드 S3 로직 기준 동작 방식은 다음과 같음.

- 환경변수에 `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`가 있으면 해당 값 사용
- 해당 값이 없으면 AWS SDK 기본 자격증명 체인 사용
- EC2 IAM role이 존재하면 기본 자격증명 체인을 통해 자동 인증 수행

따라서 운영 권장 방향은 다음과 같음.

- 운영 EC2에는 IAM role 연결
- S3 접근 권한은 IAM policy로 관리
- 가능하면 S3 access key 환경변수는 제거

이번 문서에서 IAM 관리가 중요한 이유도 이 구조 때문임.

## CDK output 기반 환경변수 주입 방식

현재 프로젝트에서는 CDK가 인프라 값을 생성하고, 배포 시점에 해당 값을 백엔드 환경변수로 주입하는 방식 사용 가능 상태임.

이 방식의 역할 분리는 다음과 같음.

- CDK: S3 관련 인프라 값 생성
- GitHub Actions: 생성된 값을 배포 환경변수로 주입
- 백엔드: 주입된 값을 런타임 설정으로 사용

현재 env 주입 대상은 다음과 같음.

- `S3_BUCKET`
- `S3_REGION`
- `S3_PUBLIC_BASE_URL`
- `S3_UPLOAD_PREFIX`

`S3_UPLOAD_PREFIX`는 base prefix 값이며, 현재 article 이미지 업로드 경로는 백엔드에서 `images`를 추가하여 `articles/images/...` 형식 생성 상태임.

이 값들은 secret 성격이 아니라 인프라 식별 및 경로 정보 성격임.

따라서 CDK output 파일에서 읽어 GitHub Actions의 `GITHUB_ENV`로 전달하는 방식 사용 가능 상태임.

예시 흐름은 다음과 같음.

1. `cdk deploy --outputs-file` 실행
2. output JSON 생성
3. 변환 스크립트로 backend env 형식 출력
4. GitHub Actions에서 `GITHUB_ENV`에 append
5. 이후 EC2 배포 단계에서 해당 값을 사용

이 구조의 장점은 다음과 같음.

- S3 관련 값의 원본이 CDK 코드 기준으로 고정됨
- 배포 스크립트에 bucket 이름 하드코딩 불필요
- GitHub Secrets에 비밀이 아닌 S3 식별값을 중복 저장할 필요 감소

## 보안 검토 요약

현재 구조 기준 주요 보안 판단은 다음과 같음.

### 안전한 부분

- CDK output으로 주입하는 값은 secret이 아님
- bucket 이름, region, public base url, upload prefix는 노출 자체가 치명적 비밀 정보는 아님
- 운영 인증은 EC2 IAM role 기반으로 처리 가능
- 장기 access key를 서버 env에 저장하지 않는 방향 사용 가능

### 주의가 필요한 부분

- 현재 S3 bucket 정책은 실제 업로드 경로인 `articles/images/*` 경로에 대해 public read 허용 구조임
- 따라서 업로드된 이미지는 public URL 접근 전제임
- 비공개 이미지 저장소가 필요해지면 bucket policy 및 URL 전략 재설계 필요

### 현재 결론

- CDK output 기반 env 주입 구조 자체의 보안 문제는 크지 않음
- 실제 보안 판단 포인트는 access key 사용 여부와 bucket 공개 정책임
- 현재 프로젝트 구조에서는 IAM role 기반 인증 + public image URL 전략 사용 전제임

## 인프라 관리 방식

인프라 관리 방식은 다음과 같음.

1. CDK 코드 작성
2. CDK로 S3/IAM 리소스 생성 또는 변경
3. 애플리케이션은 기존 방식대로 GitHub Actions와 EC2를 사용
4. 인프라 변경 필요 시 AWS 콘솔 우선 수정 대신 CDK 코드 수정

핵심 원칙은 "인프라 변경은 CDK 코드 기준 관리"임.

## EC2 처리 원칙

EC2 처리 원칙은 다음과 같음.

- 현재 EC2는 기존 리소스로 유지
- EC2는 CDK 관리 가능 대상이지만 이번 단계에서는 제외
- 이번 단계에서 CDK로 EC2 재구성 미수행
- EC2는 참조 대상이며 관리 대상은 아님

즉 이번 문서에서 CDK 관리 범위는 EC2가 아니라 S3 및 관련 IAM임.

## 기대 효과

CDK 적용 기대 효과는 다음과 같음.

- S3 설정 누락 방지
- CORS 및 정책 변경 이력 관리 가능
- 인프라 설정 재현 가능성 확보
- 수동 콘솔 작업 감소

## 작업 계획

### Phase 1. CDK 초기 구조 생성

작업 항목은 다음과 같음.

- `infra/cdk` 디렉터리 생성
- CDK app 초기화
- 단일 stack 구조 정의

### Phase 2. S3 리소스 정의

작업 항목은 다음과 같음.

- 문서 이미지용 S3 bucket 정의
- CORS 정의
- prefix 정책 정의

### Phase 3. IAM 리소스 정의

작업 항목은 다음과 같음.

- S3 접근 권한 policy 정의
- 필요 시 role 또는 policy attachment 정의

### Phase 4. 운영 반영

작업 항목은 다음과 같음.

- bucket 정보 env 반영
- 실제 업로드 검증
- 운영 문서 갱신

## 정리

이번 프로젝트에서 CDK로 관리할 인프라 핵심은 S3와 IAM임.

배포 구조 전환은 이번 범위가 아님.

기존 EC2와 GitHub Actions는 유지 대상임.
