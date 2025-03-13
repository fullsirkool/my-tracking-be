# Base image
FROM node:22-alpine

# Thiết lập thư mục làm việc
WORKDIR /usr/src/app

# Copy file package.json và package-lock.json để cài đặt dependencies
COPY package*.json ./

# Cài đặt dependencies (bao gồm cả devDependencies)
RUN npm ci && npm cache clean --force

# Sao chép mã nguồn vào image
COPY . .

# Build TypeScript thành JavaScript
RUN npm run build

# Chạy ứng dụng dưới quyền user non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Mở cổng (nếu cần thiết)
EXPOSE 3200

# Command mặc định cho production
CMD ["node", "dist/main.js"]