const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const RELEASE = path.join(ROOT, "release");

// Clean release folder (keep .env)
const envPath = path.join(RELEASE, ".env");
const envBackup = fs.existsSync(envPath) ? fs.readFileSync(envPath) : null;

fs.rmSync(RELEASE, { recursive: true, force: true });
fs.mkdirSync(RELEASE, { recursive: true });

if (envBackup) fs.writeFileSync(envPath, envBackup);

// Copy standalone server
console.log("Copying standalone server...");
const standalone = path.join(ROOT, ".next", "standalone");
copyDir(standalone, RELEASE);

// Copy static files (Next.js looks for .next/static relative to server.js)
console.log("Copying static files...");
const staticDir = path.join(RELEASE, ".next", "static");
fs.mkdirSync(staticDir, { recursive: true });
copyDir(path.join(ROOT, ".next", "static"), staticDir);

// Copy prisma schema for db setup
console.log("Copying prisma schema...");
const prismaDir = path.join(RELEASE, "prisma");
fs.mkdirSync(prismaDir, { recursive: true });
fs.copyFileSync(
  path.join(ROOT, "prisma", "schema.prisma"),
  path.join(prismaDir, "schema.prisma")
);

// Create data directory
fs.mkdirSync(path.join(RELEASE, "data"), { recursive: true });

// Create launcher batch script
console.log("Creating launcher scripts...");
const batScript = `@echo off
chcp 65001 >nul
title 教研课时管理系统

:: Get the directory where this script is located
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未找到 Node.js，请先安装 Node.js
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

:: Initialize database if not exists
if not exist "data\\dev.db" (
    echo 首次运行，正在初始化数据库...
    cd prisma
    call npx prisma migrate deploy --schema=schema.prisma 2>nul
    cd ..
    if %errorlevel% neq 0 (
        echo 正在创建数据库...
        call npx prisma db push --schema=prisma\\schema.prisma 2>nul
    )
)

:: Find an available port
set PORT=3456

echo.
echo ╔══════════════════════════════════════╗
echo ║     教研课时管理系统  v1.0            ║
echo ╠══════════════════════════════════════╣
echo ║  服务启动中...                        ║
echo ║  浏览器将自动打开                     ║
echo ║  如未打开，请访问:                    ║
echo ║  http://127.0.0.1:%PORT%             ║
echo ║                                      ║
echo ║  按 Ctrl+C 可停止服务                 ║
echo ╚══════════════════════════════════════╝
echo.

:: Start server
start "" "http://127.0.0.1:%PORT%"
node server.js
pause
`;

fs.writeFileSync(path.join(RELEASE, "start.bat"), batScript, "utf-8");

// Create VBS launcher (no console window)
const vbsScript = `Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the folder where this script is located
appDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Run the batch file silently
WshShell.Run """" & appDir & "\\start.bat" & """", 0, False
`;

fs.writeFileSync(path.join(RELEASE, "start.vbs"), vbsScript, "utf-8");

// Create database setup script
const setupBat = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在初始化数据库...
call npx prisma db push --schema=prisma\\schema.prisma
echo.
echo 数据库初始化完成！
pause
`;

fs.writeFileSync(path.join(RELEASE, "初始化数据库.bat"), setupBat, "utf-8");

// Copy seed data script capability
fs.copyFileSync(
  path.join(ROOT, "prisma", "seed.ts"),
  path.join(RELEASE, "prisma", "seed.ts")
);

const seedBat = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在创建示例数据...
echo 测试账号: 13800138000 / 123456
call npx tsx prisma\\seed.ts
echo.
echo 示例数据创建完成！
pause
`;

fs.writeFileSync(path.join(RELEASE, "创建示例数据.bat"), seedBat, "utf-8");

console.log("");
console.log("✅ 打包完成！");
console.log(`   输出目录: ${RELEASE}`);
console.log("");
console.log("分发包结构:");
console.log("   start.bat          - 双击启动（显示控制台）");
console.log("   start.vbs          - 静默启动（无控制台）");
console.log("   初始化数据库.bat     - 首次使用前执行");
console.log("   创建示例数据.bat     - 可选，创建测试数据");
console.log("");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      // Skip symlinks/junctions (will be handled by the build)
      try {
        const stat = fs.lstatSync(srcPath);
        if (stat.isSymbolicLink() || stat.isDirectory()) {
          if (fs.existsSync(destPath)) continue;
          try {
            copyDir(srcPath, destPath);
          } catch {
            // Skip items that can't be copied (junctions etc)
          }
        }
      } catch {
        // Skip inaccessible items
      }
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch {
        // Skip files that can't be copied
      }
    }
  }
}
