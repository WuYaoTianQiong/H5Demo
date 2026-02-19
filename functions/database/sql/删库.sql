-- ============================================================
-- 删库脚本 - 清理所有业务表（按依赖顺序倒序删除）
-- ============================================================

-- 6. 导入导出模块
DROP TABLE IF EXISTS export_log;
DROP TABLE IF EXISTS import_log;

-- 5. 分享与协作模块
DROP TABLE IF EXISTS trip_member;
DROP TABLE IF EXISTS trip_share;

-- 4. 行程核心模块（先删子表）
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS day;
DROP TABLE IF EXISTS trip;

-- 3. 地点距离表（依赖 location）
DROP TABLE IF EXISTS route;

-- 2. 地点管理模块
DROP TABLE IF EXISTS location;

-- 1. 用户认证模块
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS login_log;
DROP TABLE IF EXISTS password_reset_token;
DROP TABLE IF EXISTS email_verify_token;
DROP TABLE IF EXISTS users;

-- 0. 系统表
DROP TABLE IF EXISTS schema_migrations;
