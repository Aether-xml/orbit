-- ============================================================
-- ORBIT — Veritabanı Başlangıç Migrasyonu
-- Supabase Dashboard > SQL Editor'da çalıştır
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- BÖLÜM 1: TABLOLAR
-- ══════════════════════════════════════════════════════════════

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE profiles (
  id                UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username          TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  bio               TEXT,
  avatar_url        TEXT,
  banner_url        TEXT,
  website           TEXT,
  location          TEXT,
  status_text       TEXT,
  is_verified       BOOLEAN DEFAULT FALSE,
  is_nova_plus      BOOLEAN DEFAULT FALSE,
  nova_plus_until   TIMESTAMPTZ,
  is_private        BOOLEAN DEFAULT FALSE,
  profile_accent    TEXT DEFAULT '#E8C547',
  username_color    TEXT,
  selected_badge    TEXT,
  earned_badges     TEXT[] DEFAULT '{}',
  follower_count    INT DEFAULT 0,
  following_count   INT DEFAULT 0,
  post_count        INT DEFAULT 0,
  reel_count        INT DEFAULT 0,
  search_vector     tsvector,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Posts ────────────────────────────────────────────────────
CREATE TABLE posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content          TEXT NOT NULL,
  media_urls       TEXT[] DEFAULT '{}',
  media_types      TEXT[] DEFAULT '{}',
  poll_data        JSONB,
  reply_to_id      UUID REFERENCES posts(id) ON DELETE SET NULL,
  quote_of_id      UUID REFERENCES posts(id) ON DELETE SET NULL,
  thread_id        UUID REFERENCES posts(id) ON DELETE SET NULL,
  thread_position  INT,
  like_count       INT DEFAULT 0,
  repost_count     INT DEFAULT 0,
  reply_count      INT DEFAULT 0,
  bookmark_count   INT DEFAULT 0,
  view_count       INT DEFAULT 0,
  is_edited        BOOLEAN DEFAULT FALSE,
  edit_history     JSONB DEFAULT '[]',
  deleted_at       TIMESTAMPTZ DEFAULT NULL,
  search_vector    tsvector,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reels ────────────────────────────────────────────────────
CREATE TABLE reels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  video_url        TEXT NOT NULL,
  thumbnail_url    TEXT,
  caption          TEXT,
  music_name       TEXT,
  music_artist     TEXT,
  duration_seconds INT NOT NULL,
  like_count       INT DEFAULT 0,
  comment_count    INT DEFAULT 0,
  share_count      INT DEFAULT 0,
  view_count       INT DEFAULT 0,
  deleted_at       TIMESTAMPTZ DEFAULT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Stories ──────────────────────────────────────────────────
CREATE TABLE stories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url        TEXT NOT NULL,
  media_type       TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption          TEXT,
  duration_seconds INT DEFAULT 5,
  view_count       INT DEFAULT 0,
  expires_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE story_views (
  story_id   UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);

-- ── View dedup tabloları ──────────────────────────────────────
CREATE TABLE post_views (
  post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, viewer_id)
);

CREATE TABLE reel_views (
  reel_id    UUID REFERENCES reels(id) ON DELETE CASCADE,
  viewer_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (reel_id, viewer_id)
);

-- ── Etkileşimler ─────────────────────────────────────────────
CREATE TABLE likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id   UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reel', 'comment')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_id, target_type)
);

CREATE TABLE reposts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id    UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

CREATE TABLE bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id   UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reel')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_id, target_type)
);

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id   UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reel')),
  content     TEXT NOT NULL,
  reply_to_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  like_count  INT DEFAULT 0,
  deleted_at  TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE follows (
  follower_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE follow_requests (
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (requester_id, target_id)
);

CREATE TABLE blocks (
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE mutes (
  muter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  muted_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (muter_id, muted_id)
);

CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id   UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reel', 'comment', 'profile', 'server')),
  reason      TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'misinformation', 'nsfw', 'other')),
  description TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sunucular ─────────────────────────────────────────────────
CREATE TABLE servers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  avatar_url   TEXT,
  banner_url   TEXT,
  invite_code  TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  is_public    BOOLEAN DEFAULT TRUE,
  member_count INT DEFAULT 1,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE server_categories (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  name      TEXT NOT NULL,
  position  INT DEFAULT 0
);

CREATE TABLE server_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   UUID REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES server_categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  position    INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE server_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID REFERENCES server_channels(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content     TEXT,
  media_urls  TEXT[] DEFAULT '{}',
  reply_to_id UUID REFERENCES server_messages(id) ON DELETE SET NULL,
  is_edited   BOOLEAN DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE server_members (
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role      TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  nickname  TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (server_id, user_id)
);

-- ── Mesajlaşma (DM) ──────────────────────────────────────────
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE direct_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content         TEXT,
  media_urls      TEXT[] DEFAULT '{}',
  is_read         BOOLEAN DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bildirimler ───────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
    'like', 'repost', 'follow', 'follow_request', 'follow_accepted',
    'comment', 'mention', 'reply', 'server_invite', 'quote'
  )),
  target_id   UUID,
  target_type TEXT CHECK (target_type IN ('post', 'reel', 'comment', 'profile', 'server')),
  message     TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hashtag ───────────────────────────────────────────────────
CREATE TABLE hashtags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT UNIQUE NOT NULL,
  post_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_hashtags (
  post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

-- ── Nova+ Abonelik ────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
-- BÖLÜM 2: INDEX'LER
-- ══════════════════════════════════════════════════════════════

CREATE INDEX idx_posts_user_id      ON posts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_created_at   ON posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_thread_id    ON posts(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_posts_search       ON posts USING GIN(search_vector);
CREATE INDEX idx_profiles_search    ON profiles USING GIN(search_vector);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_post_hashtags_tag  ON post_hashtags(hashtag_id);
CREATE INDEX idx_likes_target       ON likes(target_id, target_type);
CREATE INDEX idx_follows_following  ON follows(following_id);
CREATE INDEX idx_server_messages    ON server_messages(channel_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_direct_messages    ON direct_messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reels_user_id      ON reels(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stories_user_id    ON stories(user_id, expires_at DESC);
CREATE INDEX idx_stories_expires    ON stories(expires_at);


-- ══════════════════════════════════════════════════════════════
-- BÖLÜM 3: TRIGGER FONKSİYONLARI
-- ══════════════════════════════════════════════════════════════

-- ── updated_at otomatik güncelleme ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_servers_updated_at
  BEFORE UPDATE ON servers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_server_messages_updated_at
  BEFORE UPDATE ON server_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Post karakter limiti (Nova+: 500 / ücretsiz: 280) ────────
CREATE OR REPLACE FUNCTION check_post_content_length()
RETURNS TRIGGER AS $$
DECLARE
  user_is_nova BOOLEAN;
  max_len      INT;
BEGIN
  SELECT is_nova_plus INTO user_is_nova FROM profiles WHERE id = NEW.user_id;
  max_len := CASE WHEN user_is_nova THEN 500 ELSE 280 END;
  IF length(NEW.content) > max_len THEN
    RAISE EXCEPTION 'Karakter limiti aşıldı. Maksimum: % karakter.', max_len;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_post_length
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION check_post_content_length();

-- ── Post düzenleme geçmişi ────────────────────────────────────
CREATE OR REPLACE FUNCTION track_post_edits()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    NEW.edit_history = OLD.edit_history || jsonb_build_object(
      'content', OLD.content,
      'edited_at', NOW()
    );
    NEW.is_edited = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_edit_history
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION track_post_edits();

-- ── Takipçi sayısı ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET follower_count  = follower_count  + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET follower_count  = follower_count  - 1 WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ── Post sayısı ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET post_count = post_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET post_count = post_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_count();

-- ── Beğeni sayısı ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF    NEW.target_type = 'post'    THEN UPDATE posts    SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'reel'    THEN UPDATE reels    SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.target_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF    OLD.target_type = 'post'    THEN UPDATE posts    SET like_count = like_count - 1 WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'reel'    THEN UPDATE reels    SET like_count = like_count - 1 WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'comment' THEN UPDATE comments SET like_count = like_count - 1 WHERE id = OLD.target_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- ── Repost sayısı ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE posts SET repost_count = repost_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_repost_count
  AFTER INSERT OR DELETE ON reposts
  FOR EACH ROW EXECUTE FUNCTION update_repost_count();

-- ── Yorum sayısı ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF    NEW.target_type = 'post' THEN UPDATE posts  SET reply_count   = reply_count   + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'reel' THEN UPDATE reels  SET comment_count = comment_count + 1 WHERE id = NEW.target_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF    OLD.target_type = 'post' THEN UPDATE posts  SET reply_count   = reply_count   - 1 WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'reel' THEN UPDATE reels  SET comment_count = comment_count - 1 WHERE id = OLD.target_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- ── Hashtag post sayısı ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_hashtag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE hashtags SET post_count = post_count + 1 WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE hashtags SET post_count = post_count - 1 WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hashtag_count
  AFTER INSERT OR DELETE ON post_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_count();

-- ── View count (deduplication ile) ───────────────────────────
CREATE OR REPLACE FUNCTION update_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET view_count = view_count + 1 WHERE id = NEW.post_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_view_count
  AFTER INSERT ON post_views
  FOR EACH ROW EXECUTE FUNCTION update_post_view_count();

CREATE OR REPLACE FUNCTION update_reel_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels SET view_count = view_count + 1 WHERE id = NEW.reel_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reel_view_count
  AFTER INSERT ON reel_views
  FOR EACH ROW EXECUTE FUNCTION update_reel_view_count();

-- ── Nova+ limit: Sunucu oluşturma (3/10) ─────────────────────
CREATE OR REPLACE FUNCTION check_server_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
  server_count INT;
  user_is_nova BOOLEAN;
  max_servers  INT;
BEGIN
  SELECT COUNT(*)    INTO server_count FROM servers  WHERE owner_id = NEW.owner_id;
  SELECT is_nova_plus INTO user_is_nova FROM profiles WHERE id      = NEW.owner_id;
  max_servers := CASE WHEN user_is_nova THEN 10 ELSE 3 END;
  IF server_count >= max_servers THEN
    RAISE EXCEPTION 'Sunucu oluşturma limitine ulaştınız (%). Nova+ ile 10 sunucu oluşturabilirsiniz.', max_servers;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_server_creation_limit
  BEFORE INSERT ON servers
  FOR EACH ROW EXECUTE FUNCTION check_server_creation_limit();

-- ── Nova+ limit: Bookmark (500/sınırsız) ─────────────────────
CREATE OR REPLACE FUNCTION check_bookmark_limit()
RETURNS TRIGGER AS $$
DECLARE
  bookmark_count INT;
  user_is_nova   BOOLEAN;
BEGIN
  SELECT COUNT(*)     INTO bookmark_count FROM bookmarks WHERE user_id = NEW.user_id;
  SELECT is_nova_plus INTO user_is_nova   FROM profiles  WHERE id      = NEW.user_id;
  IF NOT user_is_nova AND bookmark_count >= 500 THEN
    RAISE EXCEPTION 'Kayıt limitine ulaştınız (500). Nova+ ile sınırsız kaydedin.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookmark_limit
  BEFORE INSERT ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION check_bookmark_limit();

-- ── Nova+ süresi dolunca devre dışı bırak ────────────────────
CREATE OR REPLACE FUNCTION expire_nova_plus()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET is_nova_plus = FALSE
  WHERE is_nova_plus = TRUE
    AND nova_plus_until IS NOT NULL
    AND nova_plus_until < NOW();
END;
$$ LANGUAGE plpgsql;
-- pg_cron ile saatte bir çalıştır:
-- SELECT cron.schedule('expire-nova-plus', '0 * * * *', 'SELECT expire_nova_plus()');

-- ── Full-text search trigger'ları ────────────────────────────
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('turkish', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_search_vector
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

CREATE OR REPLACE FUNCTION update_profile_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('simple',
    COALESCE(NEW.username, '') || ' ' ||
    COALESCE(NEW.display_name, '') || ' ' ||
    COALESCE(NEW.bio, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profile_search_vector
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_search_vector();

-- ── Bildirim oluşturma (SECURITY DEFINER) ────────────────────
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id    UUID,
  p_actor_id   UUID,
  p_type       TEXT,
  p_target_id  UUID    DEFAULT NULL,
  p_target_type TEXT   DEFAULT NULL,
  p_message    TEXT    DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF p_user_id = p_actor_id THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = p_user_id AND blocked_id = p_actor_id)
       OR (blocker_id = p_actor_id AND blocked_id = p_user_id)
  ) THEN RETURN; END IF;

  INSERT INTO notifications (user_id, actor_id, type, target_id, target_type, message)
  VALUES (p_user_id, p_actor_id, p_type, p_target_id, p_target_type, p_message);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Beğeni bildirimi ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE target_owner UUID;
BEGIN
  IF NEW.target_type = 'post' THEN
    SELECT user_id INTO target_owner FROM posts WHERE id = NEW.target_id;
    PERFORM create_notification(target_owner, NEW.user_id, 'like', NEW.target_id, 'post');
  ELSIF NEW.target_type = 'reel' THEN
    SELECT user_id INTO target_owner FROM reels WHERE id = NEW.target_id;
    PERFORM create_notification(target_owner, NEW.user_id, 'like', NEW.target_id, 'reel');
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_like
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- ── Takip bildirimi ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(NEW.following_id, NEW.follower_id, 'follow', NEW.following_id, 'profile');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- ── Takip isteği bildirimi ────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_follow_request()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(NEW.target_id, NEW.requester_id, 'follow_request', NEW.target_id, 'profile');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_follow_request
  AFTER INSERT ON follow_requests
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow_request();

-- ── Yeni kullanıcı profil oluşturma ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '_')) || '_' || SUBSTRING(NEW.id::text, 1, 4),
    SPLIT_PART(NEW.email, '@', 1),
    'https://api.dicebear.com/7.x/initials/svg?seed=' || NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ══════════════════════════════════════════════════════════════
-- BÖLÜM 4: ALGORİTMİK FEED SCORING
-- ══════════════════════════════════════════════════════════════

-- HackerNews gravity algoritması temel alınmıştır
-- Skor = (like*2 + repost*3 + reply*1) / (saat + 2)^1.5
CREATE OR REPLACE FUNCTION compute_post_score(
  p_like_count   INT,
  p_repost_count INT,
  p_reply_count  INT,
  p_created_at   TIMESTAMPTZ
) RETURNS FLOAT AS $$
DECLARE
  engagement    FLOAT;
  hours_elapsed FLOAT;
BEGIN
  engagement    := (p_like_count * 2.0) + (p_repost_count * 3.0) + (p_reply_count * 1.0);
  hours_elapsed := EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600.0;
  RETURN engagement / POWER(hours_elapsed + 2, 1.5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ══════════════════════════════════════════════════════════════
-- BÖLÜM 5: RLS POLİTİKALARI
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views               ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_views                ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_channels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions             ENABLE ROW LEVEL SECURITY;

-- ── Profiles ─────────────────────────────────────────────────
CREATE POLICY "Profiller herkese açık"        ON profiles FOR SELECT USING (true);
CREATE POLICY "Kullanıcı profilini günceller" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── Posts ────────────────────────────────────────────────────
CREATE POLICY "Postlar herkese açık" ON posts FOR SELECT USING (true);
CREATE POLICY "Post oluşturma"       ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Post güncelleme"      ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Post silme"           ON posts FOR DELETE USING (auth.uid() = user_id);

-- ── Reels ────────────────────────────────────────────────────
CREATE POLICY "Reels herkese açık" ON reels FOR SELECT USING (true);
CREATE POLICY "Reel oluşturma"     ON reels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reel silme"         ON reels FOR DELETE USING (auth.uid() = user_id);

-- ── Stories ──────────────────────────────────────────────────
CREATE POLICY "Hikayeler herkese açık" ON stories FOR SELECT USING (true);
CREATE POLICY "Hikaye oluşturma"       ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Hikaye silme"           ON stories FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Story view ekle" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "Story view gör"  ON story_views FOR SELECT USING (
  auth.uid() = viewer_id OR
  auth.uid() IN (SELECT user_id FROM stories WHERE id = story_id)
);

-- ── Views ────────────────────────────────────────────────────
CREATE POLICY "Post view ekle" ON post_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "Post view say"  ON post_views FOR SELECT USING (auth.uid() = viewer_id);
CREATE POLICY "Reel view ekle" ON reel_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "Reel view say"  ON reel_views FOR SELECT USING (auth.uid() = viewer_id);

-- ── Etkileşimler ─────────────────────────────────────────────
CREATE POLICY "Beğeniler herkese açık" ON likes FOR SELECT USING (true);
CREATE POLICY "Beğeni ekle"            ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Beğeni sil"             ON likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Repostlar herkese açık" ON reposts FOR SELECT USING (true);
CREATE POLICY "Repost ekle"            ON reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Repost sil"             ON reposts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Bookmarklar sadece sahibine" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Bookmark ekle"               ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Bookmark sil"                ON bookmarks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Yorumlar herkese açık" ON comments FOR SELECT USING (true);
CREATE POLICY "Yorum ekle"            ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Yorum güncelle"        ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Yorum sil"             ON comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Takipler herkese açık" ON follows FOR SELECT USING (true);
CREATE POLICY "Takip et"              ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Takibi bırak"          ON follows FOR DELETE USING (auth.uid() = follower_id);

-- ── Takip isteği ──────────────────────────────────────────────
CREATE POLICY "Takip isteği gör"     ON follow_requests FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "Takip isteği gönder"  ON follow_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Takip isteği sil"     ON follow_requests FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- ── Block / Mute ──────────────────────────────────────────────
CREATE POLICY "Bloklarını gör"   ON blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Birini engelle"   ON blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Engeli kaldır"    ON blocks FOR DELETE USING (auth.uid() = blocker_id);

CREATE POLICY "Mutelerini gör"       ON mutes FOR SELECT USING (auth.uid() = muter_id);
CREATE POLICY "Birini sustur"        ON mutes FOR INSERT WITH CHECK (auth.uid() = muter_id);
CREATE POLICY "Susturmayı kaldır"    ON mutes FOR DELETE USING (auth.uid() = muter_id);

-- ── Şikayet ───────────────────────────────────────────────────
CREATE POLICY "Şikayetini gör"   ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Şikayet oluştur"  ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ── Sunucular ─────────────────────────────────────────────────
CREATE POLICY "Herkese açık sunucular" ON servers FOR SELECT USING (
  is_public = TRUE OR EXISTS (
    SELECT 1 FROM server_members WHERE server_id = id AND user_id = auth.uid()
  )
);
CREATE POLICY "Sunucu oluştur"  ON servers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Sunucu güncelle" ON servers FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Sunucu sil"      ON servers FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Kategori görüntüle" ON server_categories FOR SELECT USING (
  EXISTS (SELECT 1 FROM server_members WHERE server_id = server_categories.server_id AND user_id = auth.uid())
);

CREATE POLICY "Kanalları gör" ON server_channels FOR SELECT USING (
  EXISTS (SELECT 1 FROM server_members WHERE server_id = server_channels.server_id AND user_id = auth.uid())
);

CREATE POLICY "Mesajları gör" ON server_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM server_members sm
    JOIN server_channels sc ON sc.server_id = sm.server_id
    WHERE sc.id = server_messages.channel_id AND sm.user_id = auth.uid()
  )
);
CREATE POLICY "Mesaj gönder" ON server_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM server_members sm
    JOIN server_channels sc ON sc.server_id = sm.server_id
    WHERE sc.id = server_messages.channel_id AND sm.user_id = auth.uid()
  )
);
CREATE POLICY "Kendi mesajını güncelle" ON server_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Kendi mesajını sil"      ON server_messages FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Üye listesi gör" ON server_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM server_members sm2 WHERE sm2.server_id = server_members.server_id AND sm2.user_id = auth.uid())
);

-- ── DM ────────────────────────────────────────────────────────
CREATE POLICY "Konuşmalarını gör" ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid())
);

CREATE POLICY "Katılımcıları gör" ON conversation_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "DM gör" ON direct_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "DM gönder" ON direct_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM conversation_participants WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid()
  )
);

-- ── Bildirimler ───────────────────────────────────────────────
CREATE POLICY "Kendi bildirimlerini gör"    ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Bildirimi okundu işaretle"   ON notifications FOR UPDATE USING (auth.uid() = user_id);
-- INSERT: yalnızca create_notification() SECURITY DEFINER ile

-- ── Hashtag ───────────────────────────────────────────────────
CREATE POLICY "Hashtagler herkese açık"   ON hashtags     FOR SELECT USING (true);
CREATE POLICY "Post hashtag herkese açık" ON post_hashtags FOR SELECT USING (true);
CREATE POLICY "Post hashtag ekle"         ON post_hashtags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM posts WHERE id = post_hashtags.post_id AND user_id = auth.uid())
);

-- ── Abonelik ──────────────────────────────────────────────────
CREATE POLICY "Kendi aboneliğini gör" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE: yalnızca Stripe webhook Edge Function ile
