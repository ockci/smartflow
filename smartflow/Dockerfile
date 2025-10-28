# 빌드 단계
FROM node:18-alpine AS builder

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci

# 소스 코드 복사
COPY . .

# 환경 변수 설정 (필요시 주석 해제)
# ENV VITE_API_URL=https://your-api-url.com
# ENV VITE_APP_TITLE=OrderAI

# 프로덕션 빌드
RUN npm run build

# 실행 단계 - nginx로 정적 파일 서빙
FROM nginx:alpine

# 빌드된 파일을 nginx 디렉토리로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 설정 파일 복사 (SPA 라우팅 지원)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 3000

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]