-- ============================================
-- YunNan Travelling - 数据库 Schema
-- 说明: 行程管理与分享平台数据库结构
-- 兼容性: SQLite 和 PostgreSQL
-- ============================================

-- 注意: PostgreSQL 需要预先创建扩展（仅需执行一次）:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 用户认证模块
-- ============================================

-- 用户表 (使用 users 避免 PostgreSQL 保留字冲突)
CREATE TABLE IF NOT EXISTS users (
  user_id         TEXT NOT NULL PRIMARY KEY,     -- 用户唯一ID
  email           TEXT NOT NULL UNIQUE,          -- 邮箱（登录账号）
  email_verified  INTEGER DEFAULT 0,             -- 邮箱是否验证: 0=未验证, 1=已验证
  username        TEXT UNIQUE,                   -- 用户名（显示用）
  password_hash   TEXT NOT NULL,                 -- 密码哈希（PBKDF2-SHA256，格式: $pbkdf2$<iterations>$<salt>$<hash>）
  role            TEXT DEFAULT 'user',           -- 角色: user=普通用户, admin=管理员
  avatar          TEXT,                          -- 头像URL
  status          TEXT DEFAULT 'active',         -- 状态: active=正常, blocked=禁用
  last_login_at   BIGINT,                        -- 最后登录时间戳 (毫秒)
  login_count     INTEGER DEFAULT 0,             -- 登录次数统计
  created_at      BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  updated_at      BIGINT NOT NULL                -- 更新时间戳 (毫秒)
);

CREATE INDEX IF NOT EXISTS idx_user_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_user_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_user_status ON users (status);

-- 邮箱验证令牌表（注册验证/换绑邮箱）
CREATE TABLE IF NOT EXISTS email_verify_token (
  token_id    TEXT NOT NULL PRIMARY KEY,     -- 令牌ID
  user_id     TEXT NOT NULL,                 -- 关联用户ID
  email       TEXT NOT NULL,                 -- 待验证邮箱
  token       TEXT NOT NULL UNIQUE,          -- 验证令牌字符串
  type        TEXT NOT NULL,                 -- 类型: register=注册, change_email=换绑
  expires_at  BIGINT NOT NULL,               -- 过期时间戳 (毫秒)
  used        INTEGER DEFAULT 0,             -- 是否已使用: 0=未使用, 1=已使用
  created_at  BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verify_token ON email_verify_token (token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verify_token (user_id);

-- 密码重置令牌表（忘记密码）
CREATE TABLE IF NOT EXISTS password_reset_token (
  token_id    TEXT NOT NULL PRIMARY KEY,     -- 令牌ID
  user_id     TEXT NOT NULL,                 -- 关联用户ID
  token       TEXT NOT NULL UNIQUE,          -- 重置令牌字符串
  expires_at  BIGINT NOT NULL,               -- 过期时间戳 (毫秒)
  used        INTEGER DEFAULT 0,             -- 是否已使用: 0=未使用, 1=已使用
  created_at  BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_token (token);
CREATE INDEX IF NOT EXISTS idx_reset_user ON password_reset_token (user_id);

-- 登录日志表（安全审计）
CREATE TABLE IF NOT EXISTS login_log (
  log_id      TEXT NOT NULL PRIMARY KEY,     -- 日志ID
  user_id     TEXT,                          -- 用户ID（登录成功时有值）
  email       TEXT,                          -- 尝试登录的邮箱
  ip_address  TEXT,                          -- IP地址
  user_agent  TEXT,                          -- 用户代理字符串
  status      TEXT NOT NULL,                 -- 状态: success=成功, failed=失败
  fail_reason TEXT,                          -- 失败原因
  created_at  BIGINT NOT NULL                -- 创建时间戳 (毫秒)
);

CREATE INDEX IF NOT EXISTS idx_login_log_user ON login_log (user_id);
CREATE INDEX IF NOT EXISTS idx_login_log_email ON login_log (email);
CREATE INDEX IF NOT EXISTS idx_login_log_time ON login_log (created_at);

-- 会话表（JWT/token存储）
CREATE TABLE IF NOT EXISTS session (
  session_id  TEXT NOT NULL PRIMARY KEY,     -- 会话ID
  user_id     TEXT NOT NULL,                 -- 关联用户ID
  token       TEXT NOT NULL UNIQUE,          -- 登录令牌
  device_info TEXT,                          -- 设备信息
  ip_address  TEXT,                          -- IP地址
  expires_at  BIGINT NOT NULL,               -- 过期时间戳 (毫秒)
  created_at  BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  updated_at  BIGINT NOT NULL,               -- 更新时间戳 (毫秒)
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_token ON session (token);
CREATE INDEX IF NOT EXISTS idx_session_user ON session (user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON session (expires_at);

-- ============================================
-- 2. 地点管理模块 (放在行程核心模块之前，因为 event 表依赖 location)
-- ============================================

-- 地点表（景点、酒店、餐厅等位置信息）
CREATE TABLE IF NOT EXISTS location (
  location_id TEXT NOT NULL PRIMARY KEY,        -- 地点ID（支持字符串POI ID，如高德地图的 "B036706Y83"）
  name        TEXT NOT NULL,                    -- 地点名称
  description TEXT,                             -- 地点描述
  address     TEXT,                             -- 详细地址
  city        TEXT,                             -- 城市
  district    TEXT,                             -- 区县
  province    TEXT,                             -- 省份
  country     TEXT DEFAULT '中国',               -- 国家
  lng         REAL,                             -- 经度
  lat         REAL,                             -- 纬度
  category    TEXT,                             -- 类别: scenic=景点, hotel=酒店, restaurant=餐厅, transport=交通, other=其他
  phone       TEXT,                             -- 联系电话
  website     TEXT,                             -- 网站链接
  open_time   TEXT,                             -- 营业时间
  price       TEXT,                             -- 价格信息
  rating      REAL,                             -- 评分 (0-5)
  source      TEXT,                             -- 数据来源: manual=手动, amap=高德, baidu=百度
  source_id   TEXT,                             -- 来源平台地点ID
  meta_json   TEXT,                             -- 扩展元信息（JSON）
  created_at  BIGINT NOT NULL,                  -- 创建时间戳 (毫秒)
  updated_at  BIGINT NOT NULL                   -- 更新时间戳 (毫秒)
);

CREATE INDEX IF NOT EXISTS idx_location_city ON location (city);
CREATE INDEX IF NOT EXISTS idx_location_category ON location (category);
CREATE INDEX IF NOT EXISTS idx_location_source ON location (source);

-- ============================================
-- 3. 行程核心模块
-- ============================================

-- 行程表（一个行程包含多天日程）
CREATE TABLE IF NOT EXISTS trip (
  trip_id           TEXT NOT NULL PRIMARY KEY,     -- 行程唯一ID
  user_id           TEXT NOT NULL,                 -- 创建者用户ID
  slug              TEXT UNIQUE,                   -- URL短名（用于分享链接）
  title             TEXT NOT NULL,                 -- 行程标题
  year              INTEGER,                       -- 行程年份
  description       TEXT,                          -- 行程描述
  start_date        TEXT,                          -- 开始日期 (YYYY-MM-DD)
  end_date          TEXT,                          -- 结束日期 (YYYY-MM-DD)
  days              INTEGER,                       -- 行程天数
  city_list         TEXT,                          -- 城市列表（JSON数组字符串）
  cover_image       TEXT,                          -- 封面图片URL
  status               TEXT DEFAULT 'draft',       -- 状态: draft=草稿, published=已发布, archived=已归档
  visibility           TEXT DEFAULT 'private',     -- 可见性: private=私有, public=公开
  footer_text          TEXT,                       -- 页脚文案
  traveler_count       INTEGER,                    -- 出行人数
  budget_per_person_min INTEGER,                   -- 人均预算下限
  budget_per_person_max INTEGER,                   -- 人均预算上限
  budget_unit          TEXT DEFAULT '元',          -- 预算单位: 元/万
  completed         INTEGER DEFAULT 0,             -- 是否完成: 0=进行中, 1=已完成
  version           INTEGER DEFAULT 1,             -- 数据版本号（乐观锁）
  is_deleted        INTEGER DEFAULT 0,             -- 是否删除: 0=未删除, 1=已删除
  deleted_at        BIGINT,                        -- 删除时间戳 (毫秒)
  deleted_by        TEXT,                          -- 删除者用户ID
  created_at        BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  updated_at        BIGINT NOT NULL,               -- 更新时间戳 (毫秒)
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trip_user ON trip (user_id);
CREATE INDEX IF NOT EXISTS idx_trip_year ON trip (year);
CREATE INDEX IF NOT EXISTS idx_trip_status ON trip (status);
CREATE INDEX IF NOT EXISTS idx_trip_visibility ON trip (visibility);
CREATE INDEX IF NOT EXISTS idx_trip_created_at ON trip (created_at);
CREATE INDEX IF NOT EXISTS idx_trip_is_deleted ON trip (is_deleted);
CREATE INDEX IF NOT EXISTS idx_trip_deleted_at ON trip (deleted_at);

-- 日程表（行程中的每一天）
CREATE TABLE IF NOT EXISTS day (
  day_id      TEXT NOT NULL PRIMARY KEY,     -- 日程ID
  trip_id     TEXT NOT NULL,                 -- 所属行程ID
  day_order   INTEGER NOT NULL,              -- 当天在行程中的顺序（第几天）
  date        TEXT NOT NULL,                 -- 日期 (YYYY-MM-DD)
  short_date  TEXT NOT NULL,                 -- 短日期显示（如"1月15日"）
  location    TEXT,                          -- 当天所在城市
  title       TEXT,                          -- 日程标题（如"大理古城一日游"）
  description TEXT,                          -- 日程描述
  cover_image TEXT,                          -- 日程封面图
  created_at  BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  updated_at  BIGINT NOT NULL,               -- 更新时间戳 (毫秒)
  FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_day_trip_order ON day (trip_id, day_order);
CREATE INDEX IF NOT EXISTS idx_day_date ON day (date);

-- 事件表（日程中的具体活动：景点、交通、餐饮、住宿等）
CREATE TABLE IF NOT EXISTS event (
  event_id      TEXT NOT NULL PRIMARY KEY,     -- 事件ID
  day_id        TEXT NOT NULL,                 -- 所属日程ID
  trip_id       TEXT NOT NULL,                 -- 所属行程ID（冗余，方便查询）
  event_order   INTEGER NOT NULL,              -- 当天内的顺序
  type          TEXT,                          -- 类型: spot=景点, transport=交通, food=餐饮, hotel=住宿, activity=活动, note=备注
  state         TEXT DEFAULT 'active',         -- 状态: active=进行中, completed=已完成, cancelled=已取消
  card_type     TEXT DEFAULT 'single',         -- 卡片类型: single=单卡片, multi=多卡片
  title         TEXT,                          -- 事件标题
  description   TEXT,                          -- 事件描述（副标题，支持富文本、emoji、换行、加粗）
  detail        TEXT,                          -- 详情内容（展开查看，支持富文本、emoji、换行、加粗）
  start_time    TEXT,                          -- 开始时间 (HH:MM)
  end_time      TEXT,                          -- 结束时间 (HH:MM)
  duration_min  INTEGER,                       -- 持续分钟数
  priority      INTEGER DEFAULT 0,             -- 优先级（数字越大越优先）
  location_id   TEXT,                          -- 关联地点ID（支持字符串POI ID）
  location_name TEXT,                          -- 地点名称（冗余缓存）
  cost          REAL,                          -- 费用金额
  cost_currency TEXT DEFAULT 'CNY',            -- 费用币种
  tags          TEXT,                          -- 标签（JSON数组字符串）
  images        TEXT,                          -- 图片列表（JSON数组）
  weather_json  TEXT,                          -- 天气快照（JSON：天气、温度、风向等，用于历史回顾）
  parent_event_id TEXT,                        -- 父事件ID，用于多选卡的子选项
  is_deleted    INTEGER DEFAULT 0,             -- 是否删除: 0=未删除, 1=已删除
  deleted_at    BIGINT,                        -- 删除时间戳 (毫秒)
  deleted_by    TEXT,                          -- 删除者用户ID
  created_at    BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  updated_at    BIGINT NOT NULL,               -- 更新时间戳 (毫秒)
  FOREIGN KEY (day_id) REFERENCES day(day_id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES location(location_id) ON DELETE SET NULL,
  FOREIGN KEY (parent_event_id) REFERENCES event(event_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_day_order ON event (day_id, event_order);
CREATE INDEX IF NOT EXISTS idx_event_trip ON event (trip_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON event (type);
CREATE INDEX IF NOT EXISTS idx_event_state ON event (state);
CREATE INDEX IF NOT EXISTS idx_event_parent ON event (parent_event_id);
CREATE INDEX IF NOT EXISTS idx_event_is_deleted ON event (is_deleted);
CREATE INDEX IF NOT EXISTS idx_event_deleted_at ON event (deleted_at);
-- 复合索引：优化按 trip_id + day_id 查询（覆盖最常用的查询场景）
CREATE INDEX IF NOT EXISTS idx_event_trip_day ON event (trip_id, day_id);
-- 复合索引：优化带删除状态的查询
CREATE INDEX IF NOT EXISTS idx_event_trip_day_deleted ON event (trip_id, day_id, is_deleted);

-- 地点距离表（缓存地点间的距离和路线）
CREATE TABLE IF NOT EXISTS route (
  route_id      INTEGER PRIMARY KEY,  -- 兼容SQLite和PostgreSQL，应用层或数据库序列处理自增
  from_location TEXT NOT NULL,                      -- 起点地点ID（支持字符串POI ID）
  to_location   TEXT NOT NULL,                      -- 终点地点ID（支持字符串POI ID）
  distance_m    INTEGER,                            -- 距离（米）
  duration_min  INTEGER,                            -- 预计耗时（分钟）
  mode          TEXT DEFAULT 'driving',             -- 出行方式: driving=驾车, walking=步行, transit=公交, cycling=骑行
  source        TEXT,                               -- 数据来源
  expires_at    BIGINT,                             -- 缓存过期时间 (毫秒)
  created_at    BIGINT NOT NULL,                    -- 创建时间戳 (毫秒)
  updated_at    BIGINT NOT NULL,                    -- 更新时间戳 (毫秒)
  FOREIGN KEY (from_location) REFERENCES location(location_id) ON DELETE CASCADE,
  FOREIGN KEY (to_location) REFERENCES location(location_id) ON DELETE CASCADE,
  UNIQUE (from_location, to_location, mode)
);

CREATE INDEX IF NOT EXISTS idx_route_from ON route (from_location);
CREATE INDEX IF NOT EXISTS idx_route_to ON route (to_location);
CREATE INDEX IF NOT EXISTS idx_route_expires ON route (expires_at);

-- ============================================
-- 6. 分享与协作模块
-- ============================================

-- 行程分享表（生成分享链接）
CREATE TABLE IF NOT EXISTS trip_share (
  share_id      TEXT NOT NULL PRIMARY KEY,     -- 分享ID
  trip_id       TEXT NOT NULL,                 -- 被分享的行程ID
  created_by    TEXT NOT NULL,                 -- 创建分享的用户ID
  share_token   TEXT NOT NULL UNIQUE,          -- 分享令牌（用于链接）
  share_type    TEXT DEFAULT 'link',           -- 分享类型: link=链接, email=邮件
  permission    TEXT DEFAULT 'view',           -- 权限: view=仅查看, edit=可编辑
  password_hash TEXT,                          -- 访问密码（可选）
  max_views     INTEGER,                       -- 最大访问次数（可选）
  view_count    INTEGER DEFAULT 0,             -- 已访问次数
  expires_at    BIGINT,                        -- 过期时间戳 (毫秒，可选)
  is_active     INTEGER DEFAULT 1,             -- 是否有效: 0=失效, 1=有效
  created_at    BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  updated_at    BIGINT NOT NULL,               -- 更新时间戳 (毫秒)
  FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trip_share_token ON trip_share (share_token);
CREATE INDEX IF NOT EXISTS idx_trip_share_trip ON trip_share (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_share_active ON trip_share (is_active);

-- 行程成员表（协作编辑）
CREATE TABLE IF NOT EXISTS trip_member (
  member_id   TEXT NOT NULL PRIMARY KEY,     -- 成员记录ID
  trip_id     TEXT NOT NULL,                 -- 行程ID
  user_id     TEXT NOT NULL,                 -- 用户ID
  role        TEXT DEFAULT 'viewer',         -- 角色: owner=所有者, editor=编辑者, viewer=查看者
  invited_by  TEXT,                          -- 邀请人ID
  joined_at   BIGINT NOT NULL,               -- 加入时间戳 (毫秒)
  FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(user_id),
  UNIQUE (trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_member_trip ON trip_member (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_member_user ON trip_member (user_id);

-- ============================================
-- 7. 数据导入导出模块
-- ============================================

-- 导入记录表
CREATE TABLE IF NOT EXISTS import_log (
  import_id     TEXT NOT NULL PRIMARY KEY,     -- 导入ID
  user_id       TEXT NOT NULL,                 -- 操作用户ID
  trip_id       TEXT,                          -- 导入后创建的行程ID
  source_type   TEXT NOT NULL,                 -- 来源类型: file=文件, url=链接, api=API
  source_name   TEXT,                          -- 来源名称（文件名等）
  file_format   TEXT,                          -- 文件格式: json, csv, ics
  status        TEXT NOT NULL,                 -- 状态: pending=待处理, processing=处理中, success=成功, failed=失败
  record_count  INTEGER,                       -- 记录数量
  success_count INTEGER DEFAULT 0,             -- 成功导入数量
  fail_count    INTEGER DEFAULT 0,             -- 失败数量
  error_message TEXT,                          -- 错误信息
  started_at    BIGINT,                        -- 开始时间戳 (毫秒)
  completed_at  BIGINT,                        -- 完成时间戳 (毫秒)
  created_at    BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_import_user ON import_log (user_id);
CREATE INDEX IF NOT EXISTS idx_import_status ON import_log (status);
CREATE INDEX IF NOT EXISTS idx_import_created_at ON import_log (created_at);

-- 导出记录表
CREATE TABLE IF NOT EXISTS export_log (
  export_id     TEXT NOT NULL PRIMARY KEY,     -- 导出ID
  user_id       TEXT NOT NULL,                 -- 操作用户ID
  trip_id       TEXT NOT NULL,                 -- 行程ID
  export_type   TEXT NOT NULL,                 -- 导出类型: json, csv, ics, pdf
  status        TEXT NOT NULL,                 -- 状态: pending, processing, success, failed
  file_url      TEXT,                          -- 导出文件URL
  file_size     INTEGER,                       -- 文件大小（字节）
  completed_at  BIGINT,                        -- 完成时间戳 (毫秒)
  created_at    BIGINT NOT NULL,               -- 创建时间戳 (毫秒)
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_export_user ON export_log (user_id);
CREATE INDEX IF NOT EXISTS idx_export_trip ON export_log (trip_id);
CREATE INDEX IF NOT EXISTS idx_export_created_at ON export_log (created_at);

-- ============================================
-- 8. 系统表
-- ============================================

-- 数据库迁移记录表
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER NOT NULL PRIMARY KEY,
  applied_at BIGINT  NOT NULL
);

