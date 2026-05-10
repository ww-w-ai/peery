# Peery — AI Agent/Skill Security Verification Registry

## Project Overview

- **Name**: Peery (피어리)
- **Domain**: peery.ai
- **Tagline**: "The tiger that peers into your agent code."
- **Character**: 호랑이. Derpy(케이팝 데몬 헌터스)의 형제 — 더피가 멍한 눈이면 피어리는 유심히 살피는 눈.
- **What it does**: AI 에이전트/스킬/플러그인의 소스코드를 정적 분석하여 보안 검증 → 안전한 버전 태깅 → 검증 배지 부여
- **Layer**: mattpocock/skills, browserbase/skills 같은 스킬 레지스트리와 동일 레이어. 차이점은 "기능"이 아니라 "보안"을 검증.
- **Build strategy**: 기존 오픈소스 스캐너(agent-audit, AgentShield 등)를 조합하여 돌리고 결과를 큐레이션. 스캐너 자체를 만들지 않음.

## Business Model

1. Phase 1: 무료 검증 → 커뮤니티 신뢰 축적 (Hermes/Nous Research 패턴)
2. Phase 2: 공급자 과금 — 에이전트/스킬 제작자가 등록비 지불 → 검증 + 배지
3. Phase 3: 엔터프라이즈 내부 에이전트 감사

## Security Check Scope

소스 레벨 정적 분석만. 런타임 방화벽/샌드박스 아님.

- 파괴적 명령어 (rm -rf, DROP TABLE, terraform destroy, git push --force)
- 외부 데이터 전송 (curl, fetch, webhook으로 외부 URL 호출)
- 시크릿 탈취 (환경변수/credential 읽어서 외부로 보내는 패턴)
- 숨겨진 prompt injection (zero-width 문자, base64 인코딩된 지시)
- 난독화 코드 (eval, exec, encoded strings)
- 비정상 파일 접근 (홈 디렉토리, ssh keys, .env 파일 읽기)

## Available Open-Source Scanners

- agent-audit: 49 rules, OWASP Agentic Top 10, F1 0.91
- AgentShield: Claude Code 특화, 3-agent adversarial pipeline
- AgentAuditKit: 77 rules, EU AI Act/SOC2/ISO27001 mapping

## Motivation (Why this exists)

- 오픈소스 에이전트 16개 스캔 → 76% tool call에 안전장치 없음
- 에이전트 프로덕션 파괴 10건 → 포렌식/포스트모템 0건
- 해커가 prompt injection으로 에이전트를 조종하면 로그에는 "에이전트 실수"로만 남음
- 78% 기업 에이전트 파일럿 중 → 14%만 프로덕션 확대 (보안 불안이 핵심 blocker)

## Related Products (ww-w.ai)

- AgentRunner: 모니터링 대시보드에 "Verified by Peery" 배지 표시
- bkit: 스킬/에이전트 설치 시 Peery 검증 여부 체크
- 마돌이: Peery 런칭 자체가 콘텐츠 소재

## Tech Stack

(TBD — discovery 이후 결정)

## References

- wiki: ~/Documents/Obsidian Vault/50_노트/사업-아이디어/에이전트-보안-레지스트리.md
- harness-refs: ~/Documents/DEV/harness-refs/ (경쟁사 분석)
