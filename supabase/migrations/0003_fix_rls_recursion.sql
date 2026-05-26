-- ============================================================
-- ORBIT — RLS Sonsuz Döngü Düzeltmesi
-- SQL Editor'da çalıştır
-- ============================================================

-- Önce yardımcı SECURITY DEFINER fonksiyonlar oluştur
-- (RLS bypass ederek döngüyü kırar)

CREATE OR REPLACE FUNCTION auth_is_server_member(sid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM server_members
    WHERE server_id = sid AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION auth_is_server_admin(sid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM server_members
    WHERE server_id = sid AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION auth_is_conversation_participant(cid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = cid AND user_id = auth.uid()
  )
$$;

-- ── server_members ────────────────────────────────────────────
DROP POLICY IF EXISTS "Üye listesi gör" ON server_members;
CREATE POLICY "Üye listesi gör" ON server_members FOR SELECT
  USING (auth_is_server_member(server_id));

-- ── servers ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Herkese açık sunucular" ON servers;
CREATE POLICY "Herkese açık sunucular" ON servers FOR SELECT
  USING (is_public = TRUE OR auth_is_server_member(id));

-- ── server_categories ────────────────────────────────────────
DROP POLICY IF EXISTS "Kategori görüntüle" ON server_categories;
DROP POLICY IF EXISTS "Kategori oluştur"   ON server_categories;
CREATE POLICY "Kategori görüntüle" ON server_categories FOR SELECT
  USING (auth_is_server_member(server_id));
CREATE POLICY "Kategori oluştur"   ON server_categories FOR INSERT
  WITH CHECK (auth_is_server_admin(server_id));

-- ── server_channels ───────────────────────────────────────────
DROP POLICY IF EXISTS "Kanalları gör"  ON server_channels;
DROP POLICY IF EXISTS "Kanal oluştur"  ON server_channels;
CREATE POLICY "Kanalları gör"  ON server_channels FOR SELECT
  USING (auth_is_server_member(server_id));
CREATE POLICY "Kanal oluştur"  ON server_channels FOR INSERT
  WITH CHECK (auth_is_server_admin(server_id));

-- ── server_messages ───────────────────────────────────────────
DROP POLICY IF EXISTS "Mesajları gör"           ON server_messages;
DROP POLICY IF EXISTS "Mesaj gönder"            ON server_messages;
DROP POLICY IF EXISTS "Kendi mesajını güncelle" ON server_messages;
DROP POLICY IF EXISTS "Kendi mesajını sil"      ON server_messages;
CREATE POLICY "Mesajları gör" ON server_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM server_channels sc
      WHERE sc.id = channel_id AND auth_is_server_member(sc.server_id)
    )
  );
CREATE POLICY "Mesaj gönder" ON server_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM server_channels sc
      WHERE sc.id = channel_id AND auth_is_server_member(sc.server_id)
    )
  );
CREATE POLICY "Kendi mesajını güncelle" ON server_messages FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Kendi mesajını sil"      ON server_messages FOR DELETE
  USING (auth.uid() = user_id);

-- ── conversation_participants ─────────────────────────────────
DROP POLICY IF EXISTS "Katılımcıları gör"  ON conversation_participants;
DROP POLICY IF EXISTS "Katılımcı ekle"     ON conversation_participants;
DROP POLICY IF EXISTS "Okundu güncelle"    ON conversation_participants;
CREATE POLICY "Katılımcıları gör" ON conversation_participants FOR SELECT
  USING (auth_is_conversation_participant(conversation_id));
CREATE POLICY "Katılımcı ekle"    ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Okundu güncelle"   ON conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- ── conversations ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Konuşmalarını gör" ON conversations;
DROP POLICY IF EXISTS "Konuşma oluştur"   ON conversations;
CREATE POLICY "Konuşmalarını gör" ON conversations FOR SELECT
  USING (auth_is_conversation_participant(id));
CREATE POLICY "Konuşma oluştur"   ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── direct_messages ───────────────────────────────────────────
DROP POLICY IF EXISTS "DM gör"     ON direct_messages;
DROP POLICY IF EXISTS "DM gönder"  ON direct_messages;
CREATE POLICY "DM gör" ON direct_messages FOR SELECT
  USING (auth_is_conversation_participant(conversation_id));
CREATE POLICY "DM gönder" ON direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND auth_is_conversation_participant(conversation_id)
  );
