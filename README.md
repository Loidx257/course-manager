# 教研课时管理系统

面向考研教研老师的本地课程管理工具，用于管理学生、排课、课程记录、课时进度、费用与结算。

## 功能

- 学生档案与总课时进度
- 日历排课与时间冲突检测
- 实际授课记录与费用计算
- 课时费结算与统计
- Excel 数据导出
- 本地 SQLite 数据存储

## 技术栈

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4
- Prisma 6 / SQLite

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
copy .env.example .env
npx prisma migrate deploy
npx prisma generate
npm run dev
```

打开 <http://localhost:3000>。Windows 用户也可以双击 `start-server.bat`。

请在 `.env` 中将 `JWT_SECRET` 替换为足够长的随机字符串。`.env` 和本地数据库不会提交到 Git。

## 常用命令

```bash
npm run dev       # 开发服务器
npm run build     # 生产构建
npm run start     # 运行生产构建
npm run lint      # ESLint 检查
```

## 数据库

数据库结构由 `prisma/migrations` 管理。默认 SQLite 数据库位于 `prisma/dev.db`，该文件包含本地业务数据，已被 Git 忽略。

```bash
npx prisma migrate deploy
npx prisma studio
```

## 许可

使用条款见 `license.txt`。未经许可，请勿公开分发或用于其他商业用途。
